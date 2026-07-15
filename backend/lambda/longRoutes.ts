import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createHash, randomUUID } from "crypto";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { ddbClient, jsonResponse } from "./common";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  calculateBookingTotals,
  canCreateTripWithVehicle,
  canCancelBooking,
  createBookingReference,
  isTown,
  recurringDepartureTimes,
  SEAT_TEMPLATES,
  TRIP_STATUSES,
  validateRoute,
  validatePassenger,
  validStopOrder,
  type SeatTemplateId,
} from "./longRouteDomain";

const TABLES = {
  trips: process.env.TRIPS_TABLE!,
  bookings: process.env.BOOKINGS_TABLE!,
  vehicles: process.env.VEHICLES_TABLE!,
  driverVerifications: process.env.DRIVER_VERIFICATIONS_TABLE!,
  tripSeats: process.env.TRIP_SEATS_TABLE!,
  passengers: process.env.BOOKING_PASSENGERS_TABLE!,
  payments: process.env.PAYMENTS_TABLE!,
  travelRequests: process.env.TRAVEL_REQUESTS_TABLE!,
  reviews: process.env.REVIEWS_TABLE!,
  notifications: process.env.NOTIFICATIONS_TABLE!,
};
const VERIFICATION_UPLOADS_BUCKET = process.env.DRIVER_VERIFICATION_UPLOADS_BUCKET!;
const s3Client = new S3Client({});

type Json = Record<string, unknown>;

function parseBody(event: Parameters<APIGatewayProxyHandlerV2>[0]): Json {
  if (!event.body) return {};
  try {
    const value = JSON.parse(event.body);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function claims(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const requestContext = event.requestContext as typeof event.requestContext & {
    authorizer?: { jwt?: { claims?: Record<string, string> } };
  };
  const authorizer = requestContext.authorizer;
  return authorizer?.jwt?.claims;
}

function userId(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  return claims(event)?.sub;
}

function requireUser(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const id = userId(event);
  return id ? { id, claims: claims(event)! } : null;
}

function accountType(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const tokenClaims = claims(event);
  const groups = String(tokenClaims?.["cognito:groups"] ?? "");
  return tokenClaims?.profile === "DRIVER" || tokenClaims?.["custom:account_type"] === "DRIVER" || groups.includes("verified_drivers") ? "DRIVER" : "PASSENGER";
}

function requireAccountType(event: Parameters<APIGatewayProxyHandlerV2>[0], required: "PASSENGER" | "DRIVER") {
  if (!userId(event)) return jsonResponse(401, { message: "Authentication required" });
  return accountType(event) === required ? null : jsonResponse(403, { message: `A ${required === "DRIVER" ? "Driver" : "Passenger"} account is required for this action` });
}

function nowIso() {
  return new Date().toISOString();
}

function decodeNextToken(value: string | undefined): Json | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function encodeNextToken(value: Json | undefined) {
  return value ? Buffer.from(JSON.stringify(value), "utf8").toString("base64url") : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function verificationInput(body: Json) {
  const personal = body.personalDetails && typeof body.personalDetails === "object" ? body.personalDetails as Json : {};
  const vehicle = body.vehicleDetails && typeof body.vehicleDetails === "object" ? body.vehicleDetails as Json : {};
  const documents = body.documents && typeof body.documents === "object" ? body.documents as Json : {};
  return {
    personalDetails: {
      firstName: String(personal.firstName ?? "").trim(),
      lastName: String(personal.lastName ?? "").trim(),
      dateOfBirth: String(personal.dateOfBirth ?? "").trim(),
      idType: String(personal.idType ?? "NATIONAL_ID").trim(),
      idNumber: String(personal.idNumber ?? "").trim(),
      phoneNumber: String(personal.phoneNumber ?? "").trim(),
      address: String(personal.address ?? "").trim(),
    },
    documents: {
      idFrontKey: String(documents.idFrontKey ?? ""),
      idBackKey: String(documents.idBackKey ?? ""),
      selfieKey: String(documents.selfieKey ?? ""),
      vehiclePhotoKeys: asStringArray(documents.vehiclePhotoKeys).slice(0, 8),
    },
    selfieConsent: body.selfieConsent === true,
    vehicleDetails: {
      make: String(vehicle.make ?? "").trim(),
      model: String(vehicle.model ?? "").trim(),
      color: String(vehicle.color ?? "").trim(),
      registrationNumber: String(vehicle.registrationNumber ?? "").trim().toUpperCase(),
      layoutTemplateId: String(vehicle.layoutTemplateId ?? ""),
    },
  };
}

function verificationErrors(input: ReturnType<typeof verificationInput>) {
  const errors: string[] = [];
  const personal = input.personalDetails;
  if (!personal.firstName || !personal.lastName || !personal.dateOfBirth || !personal.idNumber || !personal.phoneNumber || !personal.address) errors.push("Complete all personal details");
  const birthDate = Date.parse(personal.dateOfBirth);
  const adultCutoff = new Date(); adultCutoff.setFullYear(adultCutoff.getFullYear() - 18);
  if (!Number.isFinite(birthDate) || birthDate > adultCutoff.getTime()) errors.push("Drivers must be at least 18 years old");
  if (personal.idNumber.length < 5) errors.push("Enter a valid identity document number");
  if (!["NATIONAL_ID", "PASSPORT", "DRIVER_LICENSE"].includes(personal.idType)) errors.push("Choose a valid identity document type");
  if (personal.phoneNumber.replace(/\D/g, "").length < 8) errors.push("Enter a valid mobile number");
  if (!input.documents.idFrontKey || !input.documents.idBackKey) errors.push("Upload the front and back of your ID");
  if (!input.documents.selfieKey || !input.selfieConsent) errors.push("Complete the selfie identity check");
  const template = SEAT_TEMPLATES[input.vehicleDetails.layoutTemplateId as SeatTemplateId];
  if (!template || !input.vehicleDetails.make || !input.vehicleDetails.model || !input.vehicleDetails.color || !input.vehicleDetails.registrationNumber) errors.push("Complete all vehicle details");
  if (input.documents.vehiclePhotoKeys.length < 3) errors.push("Upload at least three vehicle photos");
  return errors;
}

function resolveRoutePoint(pointsValue: unknown, requestedValue: unknown, fallback: Json): Json | null {
  const points = Array.isArray(pointsValue) ? (pointsValue as Json[]) : [];
  if (!points.length) return fallback;
  const requested = requestedValue && typeof requestedValue === "object" ? (requestedValue as Json) : {};
  const requestedId = String(requested.id ?? "");
  const requestedName = String(requested.name ?? "");
  if (!requestedId && !requestedName) return points[0];
  return points.find((point) => (requestedId && String(point.id ?? "") === requestedId) || (requestedName && String(point.name ?? "") === requestedName)) ?? null;
}

function isConditionalFailure(error: unknown) {
  return error instanceof Error && (error.name === "ConditionalCheckFailedException" || error.name === "TransactionCanceledException");
}

async function getTrip(tripId: string) {
  const result = await ddbClient.send(new GetCommand({ TableName: TABLES.trips, Key: { tripId } }));
  return result.Item;
}

async function getBooking(bookingId: string) {
  const result = await ddbClient.send(new GetCommand({ TableName: TABLES.bookings, Key: { bookingId } }));
  return result.Item;
}

async function listSeats(tripId: string) {
  const result = await ddbClient.send(
    new QueryCommand({
      TableName: TABLES.tripSeats,
      KeyConditionExpression: "tripId = :tripId",
      ExpressionAttributeValues: { ":tripId": tripId },
    })
  );
  const now = Math.floor(Date.now() / 1000);
  return (result.Items ?? []).map((seat) =>
    seat.status === "HELD" && Number(seat.holdExpiresAtEpoch ?? 0) <= now
      ? { ...seat, status: "AVAILABLE", heldByUserId: undefined, holdExpiresAt: undefined, holdExpiresAtEpoch: undefined }
      : seat
  );
}

async function createNotification(recipientId: string, type: string, title: string, message: string, data: Json = {}) {
  const notificationId = randomUUID();
  await ddbClient.send(
    new PutCommand({
      TableName: TABLES.notifications,
      Item: { notificationId, recipientId, type, title, message, data, isRead: false, createdAt: nowIso() },
    })
  );
}

async function searchTrips(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const query = event.queryStringParameters ?? {};
  const limit = Math.min(Math.max(1, Number(query.limit ?? 50)), 100);
  const exclusiveStartKey = decodeNextToken(query.nextToken);
  const shared = {
    TableName: TABLES.trips,
    FilterExpression: "#module = :module AND (#status = :published OR #status = :open)",
    ExpressionAttributeNames: { "#module": "module", "#status": "status" },
    Limit: limit,
    ExclusiveStartKey: exclusiveStartKey,
  };
  const result = query.departureTown && query.destinationTown
    ? await ddbClient.send(new QueryCommand({
        ...shared,
        IndexName: "byRoute",
        KeyConditionExpression: "routeKey = :routeKey",
        ExpressionAttributeValues: {
          ":routeKey": `${query.departureTown}#${query.destinationTown}`,
          ":module": "LONG_ROUTE",
          ":published": "PUBLISHED",
          ":open": "BOOKING_OPEN",
        },
      }))
    : await ddbClient.send(new ScanCommand({
        ...shared,
        ExpressionAttributeValues: { ":module": "LONG_ROUTE", ":published": "PUBLISHED", ":open": "BOOKING_OPEN" },
      }));

  const passengerCount = Math.max(1, Number(query.passengers ?? 1));
  const departureDate = query.date;
  let items = (result.Items ?? []).filter((trip) => {
    if (query.departureTown && trip.departureTown !== query.departureTown) return false;
    if (query.destinationTown && trip.destinationTown !== query.destinationTown) return false;
    if (departureDate && !String(trip.departureDateTime).startsWith(departureDate)) return false;
    if (Number(trip.availableSeatCount ?? 0) < passengerCount) return false;
    if (query.vehicleType && trip.vehicleType !== query.vehicleType) return false;
    if (query.verifiedOnly === "true" && !trip.operatorVerified) return false;
    if (query.directOnly === "true" && Array.isArray(trip.stops) && trip.stops.length > 0) return false;
    const requestedAmenities = query.amenities?.split(",").filter(Boolean) ?? [];
    if (requestedAmenities.some((amenity) => !asStringArray(trip.amenities).includes(amenity))) return false;
    return true;
  });

  const sort = query.sort ?? "EARLIEST";
  items = items.sort((a, b) => {
    if (sort === "LOWEST_PRICE") return Number(a.basePrice) - Number(b.basePrice);
    if (sort === "SHORTEST") return Number(a.routeDurationMinutes) - Number(b.routeDurationMinutes);
    if (sort === "HIGHEST_RATING") return Number(b.driverRating ?? 0) - Number(a.driverRating ?? 0);
    if (sort === "MOST_SEATS") return Number(b.availableSeatCount ?? 0) - Number(a.availableSeatCount ?? 0);
    return String(a.departureDateTime).localeCompare(String(b.departureDateTime));
  });
  return jsonResponse(200, { items, nextToken: encodeNextToken(result.LastEvaluatedKey as Json | undefined) });
}

async function tripDetail(tripId: string) {
  const trip = await getTrip(tripId);
  if (!trip || trip.module !== "LONG_ROUTE" || !["PUBLISHED", "BOOKING_OPEN"].includes(String(trip.status))) {
    return jsonResponse(404, { message: "Long-route trip not found" });
  }
  const { currentLocation: _currentLocation, locationSharingActive: _locationSharingActive, ...publicTrip } = trip;
  return jsonResponse(200, publicTrip);
}

async function seatAvailability(tripId: string) {
  const trip = await getTrip(tripId);
  if (!trip || !["PUBLISHED", "BOOKING_OPEN"].includes(String(trip.status))) return jsonResponse(404, { message: "Trip not found" });
  const seats = (await listSeats(tripId)).map(({ heldByUserId: _heldByUserId, bookingId: _bookingId, holdExpiresAtEpoch: _holdExpiresAtEpoch, ...seat }) => seat);
  return jsonResponse(200, {
    tripId,
    layoutTemplateId: trip.layoutTemplateId,
    vehicle: trip.vehicle,
    seats,
    serverTime: nowIso(),
    holdDurationSeconds: 300,
  });
}

async function driverTripDetail(event: Parameters<APIGatewayProxyHandlerV2>[0], tripId: string, includeSeats: boolean) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const trip = await getTrip(tripId);
  if (!trip) return jsonResponse(404, { message: "Trip not found" });
  if (trip.driverId !== user.id) return jsonResponse(403, { message: "You cannot view another driver's trip" });
  if (!includeSeats) return jsonResponse(200, trip);
  return jsonResponse(200, {
    tripId,
    layoutTemplateId: trip.layoutTemplateId,
    vehicle: trip.vehicle,
    seats: await listSeats(tripId),
    serverTime: nowIso(),
    holdDurationSeconds: 300,
  });
}

async function vehicles(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  if (event.requestContext.http.method === "GET") {
    const result = await ddbClient.send(
      new QueryCommand({
        TableName: TABLES.vehicles,
        IndexName: "byOwner",
        KeyConditionExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": user.id },
      })
    );
    return jsonResponse(200, result.Items ?? []);
  }

  const body = parseBody(event);
  const templateId = body.layoutTemplateId as SeatTemplateId;
  const template = SEAT_TEMPLATES[templateId];
  if (!template || !body.make || !body.model || !body.registrationNumber) {
    return jsonResponse(400, { message: "make, model, registrationNumber and a valid layoutTemplateId are required" });
  }
  const vehicle = {
    vehicleId: randomUUID(),
    ownerId: user.id,
    make: String(body.make).trim(),
    model: String(body.model).trim(),
    color: String(body.color ?? "Not specified").trim(),
    registrationNumber: String(body.registrationNumber).trim().toUpperCase(),
    vehicleType: template.vehicleType,
    layoutTemplateId: template.id,
    seatCapacity: template.capacity,
    verificationStatus: "PENDING",
    photos: asStringArray(body.photos),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await ddbClient.send(new PutCommand({ TableName: TABLES.vehicles, Item: vehicle }));
  return jsonResponse(201, vehicle);
}

async function driverVerification(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const existing = await ddbClient.send(new GetCommand({ TableName: TABLES.driverVerifications, Key: { driverId: user.id } }));
  if (event.requestContext.http.method === "GET") {
    return jsonResponse(200, existing.Item ?? { driverId: user.id, status: "NOT_STARTED", completionStep: 0 });
  }
  if (["PENDING", "APPROVED"].includes(String(existing.Item?.status ?? ""))) {
    return jsonResponse(409, { message: existing.Item?.status === "APPROVED" ? "Approved verification details cannot be edited" : "Your verification is already being reviewed" });
  }
  const input = verificationInput(parseBody(event));
  const item = {
    driverId: user.id,
    ...input,
    status: "IN_PROGRESS",
    completionStep: Math.min(4, Math.max(0, Number(parseBody(event).completionStep ?? 0))),
    createdAt: existing.Item?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  await ddbClient.send(new PutCommand({ TableName: TABLES.driverVerifications, Item: item }));
  return jsonResponse(200, item);
}

async function presignVerificationUpload(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const body = parseBody(event);
  const purpose = String(body.purpose ?? "");
  const contentType = String(body.contentType ?? "");
  if (!["ID_FRONT", "ID_BACK", "SELFIE", "VEHICLE"].includes(purpose) || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    return jsonResponse(400, { message: "Choose a supported verification image" });
  }
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `driver-verifications/${user.id}/${purpose.toLowerCase()}/${randomUUID()}.${extension}`;
  const command = new PutObjectCommand({ Bucket: VERIFICATION_UPLOADS_BUCKET, Key: key, ContentType: contentType, Metadata: { driverId: user.id, purpose } });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  return jsonResponse(200, { key, uploadUrl, expiresInSeconds: 300 });
}

async function submitDriverVerification(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const existing = await ddbClient.send(new GetCommand({ TableName: TABLES.driverVerifications, Key: { driverId: user.id } }));
  const input = verificationInput({ ...(existing.Item ?? {}), ...parseBody(event) });
  const errors = verificationErrors(input);
  const ownedUploadPrefix = `driver-verifications/${user.id}/`;
  const submittedKeys = [input.documents.idFrontKey, input.documents.idBackKey, input.documents.selfieKey, ...input.documents.vehiclePhotoKeys];
  if (submittedKeys.some((key) => !key.startsWith(ownedUploadPrefix))) errors.push("One or more verification uploads are invalid");
  if (errors.length) return jsonResponse(400, { message: errors[0], errors });
  const template = SEAT_TEMPLATES[input.vehicleDetails.layoutTemplateId as SeatTemplateId];
  const vehicleId = String(existing.Item?.vehicleId ?? randomUUID());
  const timestamp = nowIso();
  const vehicle = {
    vehicleId,
    ownerId: user.id,
    ...input.vehicleDetails,
    vehicleType: template.vehicleType,
    seatCapacity: template.capacity,
    verificationStatus: "PENDING",
    photos: input.documents.vehiclePhotoKeys,
    createdAt: existing.Item?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  const item = {
    driverId: user.id,
    ...input,
    vehicleId,
    status: "PENDING",
    completionStep: 4,
    reviewNote: null,
    submittedAt: timestamp,
    createdAt: existing.Item?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  await ddbClient.send(new TransactWriteCommand({ TransactItems: [
    { Put: { TableName: TABLES.vehicles, Item: vehicle } },
    { Put: { TableName: TABLES.driverVerifications, Item: item } },
  ] }));
  return jsonResponse(200, item);
}

async function createDriverTrip(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const body = parseBody(event);
  const errors = validateRoute(body.departureTown, body.destinationTown, body.departureDateTime);
  const verification = await ddbClient.send(new GetCommand({ TableName: TABLES.driverVerifications, Key: { driverId: user.id } }));
  if (verification.Item?.status !== "APPROVED") errors.push("Admin approval is required before creating trips");
  const vehicleId = String(body.vehicleId ?? "");
  const vehicleResult = await ddbClient.send(new GetCommand({ TableName: TABLES.vehicles, Key: { vehicleId } }));
  const vehicle = vehicleResult.Item;
  if (!vehicle || vehicle.ownerId !== user.id) errors.push("Select one of your registered vehicles");
  else if (!canCreateTripWithVehicle(vehicle.verificationStatus)) errors.push("Vehicle approval is required before creating trips");
  const basePrice = Number(body.basePrice);
  if (!Number.isFinite(basePrice) || basePrice <= 0) errors.push("Enter a valid price per seat");
  const stops = Array.isArray(body.stops) ? body.stops : [];
  const orderedStops = stops.map((stop, index) => ({ ...(stop as Json), town: String((stop as Json).town ?? ""), stopOrder: Number((stop as Json).stopOrder ?? index + 1) }));
  if (!validStopOrder(String(body.departureTown), String(body.destinationTown), orderedStops as Array<{ town: string; stopOrder: number }>)) {
    errors.push("Intermediate stops must be unique, supported, and in route order");
  }
  if (errors.length) return jsonResponse(400, { message: errors[0], errors });

  const tripId = randomUUID();
  const createdAt = nowIso();
  const template = SEAT_TEMPLATES[vehicle!.layoutTemplateId as SeatTemplateId];
  const driverName = [user.claims.given_name, user.claims.family_name].filter(Boolean).join(" ") || user.claims["cognito:username"] || "RideLink operator";
  const departureDateTime = String(body.departureDateTime);
  const recurrenceInput = body.recurrence && typeof body.recurrence === "object" ? (body.recurrence as Json) : null;
  const recurrenceEnabled = recurrenceInput?.enabled === true;
  const departureTimes = recurrenceEnabled
    ? recurringDepartureTimes(
        departureDateTime,
        Array.isArray(recurrenceInput?.daysOfWeek) ? (recurrenceInput.daysOfWeek as unknown[]).map(Number) : [],
        String(recurrenceInput?.endDate ?? ""),
        asStringArray(recurrenceInput?.excludedDates),
        12
      )
    : [departureDateTime];
  if (!departureTimes.length) return jsonResponse(400, { message: "Choose recurrence days and an end date after the first departure" });
  const recurringSeriesId = departureTimes.length > 1 ? randomUUID() : null;
  const occurrenceTripIds = departureTimes.map((_, index) => index === 0 ? tripId : randomUUID());
  const routeDurationMinutes = Math.max(30, Number(body.routeDurationMinutes ?? 360));
  const estimatedArrivalDateTime = body.estimatedArrivalDateTime
    ? String(body.estimatedArrivalDateTime)
    : new Date(Date.parse(departureDateTime) + routeDurationMinutes * 60_000).toISOString();
  const trip = {
    tripId,
    module: "LONG_ROUTE",
    driverId: user.id,
    operatorId: user.id,
    driverName,
    operatorName: String(body.operatorName ?? driverName),
    operatorVerified: verification.Item?.status === "APPROVED",
    vehicleId,
    vehicle: {
      make: vehicle!.make,
      model: vehicle!.model,
      color: vehicle!.color,
      registrationNumber: vehicle!.registrationNumber,
      vehicleType: vehicle!.vehicleType,
      verificationStatus: vehicle!.verificationStatus,
      photos: vehicle!.photos ?? [],
    },
    vehicleType: vehicle!.vehicleType,
    layoutTemplateId: template.id,
    departureTown: body.departureTown,
    destinationTown: body.destinationTown,
    origin: body.departureTown,
    destination: body.destinationTown,
    routeKey: `${body.departureTown}#${body.destinationTown}`,
    departureDateTime,
    estimatedArrivalDateTime,
    date: departureDateTime.slice(0, 10),
    bookingCloseDateTime: String(body.bookingCloseDateTime ?? new Date(Date.parse(departureDateTime) - 30 * 60_000).toISOString()),
    checkInDateTime: String(body.checkInDateTime ?? new Date(Date.parse(departureDateTime) - 30 * 60_000).toISOString()),
    routeDistanceKm: Number(body.routeDistanceKm ?? 0),
    routeDurationMinutes,
    basePrice,
    pricePerSeat: basePrice,
    currency: "NAD",
    luggageAllowance: String(body.luggageAllowance ?? "One standard bag up to 20 kg"),
    luggageFee: Math.max(0, Number(body.luggageFee ?? 0)),
    bookingFee: Math.max(0, Number(body.bookingFee ?? 15)),
    depositAmount: Math.max(0, Number(body.depositAmount ?? 0)),
    status: "DRAFT",
    cancellationPolicy: String(body.cancellationPolicy ?? "Free cancellation up to 24 hours before departure"),
    cancellationCutoffHours: Math.max(0, Number(body.cancellationCutoffHours ?? 24)),
    pickupPoints: Array.isArray(body.pickupPoints) ? body.pickupPoints : [],
    dropOffPoints: Array.isArray(body.dropOffPoints) ? body.dropOffPoints : [],
    stops: orderedStops,
    amenities: asStringArray(body.amenities),
    tripRules: asStringArray(body.tripRules),
    availableSeatCount: template.capacity,
    seatsAvailable: template.capacity,
    totalSeatCount: template.capacity,
    bookedSeatCount: 0,
    driverRating: 5,
    completedTripCount: 0,
    recurringSeriesId,
    recurrence: recurrenceEnabled ? { enabled: true, daysOfWeek: recurrenceInput?.daysOfWeek, endDate: recurrenceInput?.endDate, excludedDates: asStringArray(recurrenceInput?.excludedDates), occurrenceCount: departureTimes.length } : null,
    createdAt,
    updatedAt: createdAt,
  };

  let firstOccurrence = trip;
  for (let occurrenceIndex = 0; occurrenceIndex < departureTimes.length; occurrenceIndex += 1) {
    const occurrenceDeparture = departureTimes[occurrenceIndex];
    const occurrenceTripId = occurrenceTripIds[occurrenceIndex];
    const occurrenceTrip = {
      ...trip,
      tripId: occurrenceTripId,
      departureDateTime: occurrenceDeparture,
      estimatedArrivalDateTime: new Date(Date.parse(occurrenceDeparture) + routeDurationMinutes * 60_000).toISOString(),
      date: new Date(Date.parse(occurrenceDeparture) + 2 * 3_600_000).toISOString().slice(0, 10),
      bookingCloseDateTime: new Date(Date.parse(occurrenceDeparture) - 30 * 60_000).toISOString(),
      checkInDateTime: new Date(Date.parse(occurrenceDeparture) - 30 * 60_000).toISOString(),
      recurringOccurrenceIndex: occurrenceIndex,
    };
    if (occurrenceIndex === 0) firstOccurrence = occurrenceTrip;
    const seatWrites = template.seats.map((seat) => ({
      Put: {
        TableName: TABLES.tripSeats,
        Item: {
          tripId: occurrenceTripId,
          seatNumber: seat.seatNumber,
          row: seat.row,
          column: seat.column,
          seatType: seat.seatType,
          isBookable: seat.isBookable,
          status: seat.isBookable ? "AVAILABLE" : "DRIVER",
          price: basePrice,
          updatedAt: createdAt,
        },
        ConditionExpression: "attribute_not_exists(tripId) AND attribute_not_exists(seatNumber)",
      },
    }));
    await ddbClient.send(new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TABLES.trips, Item: occurrenceTrip, ConditionExpression: "attribute_not_exists(tripId)" } },
        ...seatWrites,
      ],
    }));
  }
  return jsonResponse(201, { ...firstOccurrence, recurringOccurrenceTripIds: occurrenceTripIds });
}

async function driverTrips(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const result = await ddbClient.send(
    new ScanCommand({
      TableName: TABLES.trips,
      FilterExpression: "driverId = :driverId AND #module = :module",
      ExpressionAttributeNames: { "#module": "module" },
      ExpressionAttributeValues: { ":driverId": user.id, ":module": "LONG_ROUTE" },
    })
  );
  return jsonResponse(200, (result.Items ?? []).sort((a, b) => String(b.departureDateTime).localeCompare(String(a.departureDateTime))));
}

async function updateDriverTrip(event: Parameters<APIGatewayProxyHandlerV2>[0], tripId: string) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const trip = await getTrip(tripId);
  if (!trip) return jsonResponse(404, { message: "Trip not found" });
  if (trip.driverId !== user.id) return jsonResponse(403, { message: "You cannot manage another driver's trip" });
  const body = parseBody(event);
  const action = String(body.action ?? "UPDATE");
  if (action === "UPDATE_LOCATION") {
    if (!["BOARDING", "DEPARTED", "IN_PROGRESS"].includes(String(trip.status))) {
      return jsonResponse(409, { message: "Location sharing is only available during boarding or an active trip" });
    }
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return jsonResponse(400, { message: "A valid location is required" });
    }
    const currentLocation = { latitude, longitude, accuracy: Math.max(0, Number(body.accuracy ?? 0)), updatedAt: nowIso() };
    await ddbClient.send(
      new UpdateCommand({
        TableName: TABLES.trips,
        Key: { tripId },
        UpdateExpression: "SET currentLocation = :location, locationSharingActive = :true, updatedAt = :updatedAt",
        ExpressionAttributeValues: { ":location": currentLocation, ":true": true, ":updatedAt": nowIso() },
      })
    );
    return jsonResponse(200, { tripId, locationSharingActive: true, currentLocation });
  }
  if (action === "STOP_LOCATION_SHARING") {
    await ddbClient.send(
      new UpdateCommand({
        TableName: TABLES.trips,
        Key: { tripId },
        UpdateExpression: "SET locationSharingActive = :false, updatedAt = :updatedAt REMOVE currentLocation",
        ExpressionAttributeValues: { ":false": false, ":updatedAt": nowIso() },
      })
    );
    return jsonResponse(200, { tripId, locationSharingActive: false });
  }
  if (action === "BLOCK_SEATS" || action === "UNBLOCK_SEATS") {
    if (!["DRAFT", "PUBLISHED", "BOOKING_OPEN"].includes(String(trip.status))) {
      return jsonResponse(409, { message: "Seats cannot be changed after booking closes" });
    }
    const seatNumbers = [...new Set(asStringArray(body.seatNumbers))];
    if (!seatNumbers.length || seatNumbers.length > 8) return jsonResponse(400, { message: "Choose between 1 and 8 seats" });
    const blocking = action === "BLOCK_SEATS";
    try {
      await ddbClient.send(
        new TransactWriteCommand({
          TransactItems: [
            ...seatNumbers.map((seatNumber) => ({
              Update: {
                TableName: TABLES.tripSeats,
                Key: { tripId, seatNumber },
                UpdateExpression: "SET #status = :nextStatus, updatedAt = :updatedAt",
                ConditionExpression: "#status = :currentStatus AND isBookable = :true",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: {
                  ":nextStatus": blocking ? "BLOCKED" : "AVAILABLE",
                  ":currentStatus": blocking ? "AVAILABLE" : "BLOCKED",
                  ":true": true,
                  ":updatedAt": nowIso(),
                },
              },
            })),
            {
              Update: {
                TableName: TABLES.trips,
                Key: { tripId },
                UpdateExpression: `SET availableSeatCount = availableSeatCount ${blocking ? "-" : "+"} :count, seatsAvailable = seatsAvailable ${blocking ? "-" : "+"} :count, updatedAt = :updatedAt`,
                ExpressionAttributeValues: { ":count": seatNumbers.length, ":updatedAt": nowIso() },
              },
            },
          ],
        })
      );
    } catch (error) {
      if (isConditionalFailure(error)) return jsonResponse(409, { message: "A seat changed status. Refresh before trying again." });
      throw error;
    }
    return jsonResponse(200, { tripId, seatNumbers, status: blocking ? "BLOCKED" : "AVAILABLE" });
  }
  if (action === "SEND_ANNOUNCEMENT") {
    const message = String(body.message ?? "").trim().slice(0, 500);
    if (!message) return jsonResponse(400, { message: "Announcement message is required" });
    const bookingResult = await ddbClient.send(
      new QueryCommand({ TableName: TABLES.bookings, IndexName: "byTrip", KeyConditionExpression: "tripId = :tripId", ExpressionAttributeValues: { ":tripId": tripId } })
    );
    await Promise.all(
      (bookingResult.Items ?? [])
        .filter((booking) => booking.bookingStatus !== "CANCELLED")
        .map((booking) => createNotification(String(booking.accountHolderId), "DRIVER_ANNOUNCEMENT", "Message from your driver", message, { tripId, bookingId: booking.bookingId }))
    );
    return jsonResponse(200, { sent: bookingResult.Items?.length ?? 0, message });
  }
  if (action === "PAUSE_SERIES" || action === "RESUME_SERIES") {
    if (!trip.recurringSeriesId) return jsonResponse(409, { message: "This trip is not part of a recurring series" });
    if (action === "RESUME_SERIES") {
      const vehicleResult = await ddbClient.send(new GetCommand({ TableName: TABLES.vehicles, Key: { vehicleId: trip.vehicleId } }));
      if (!vehicleResult.Item || vehicleResult.Item.verificationStatus !== "APPROVED") return jsonResponse(409, { message: "Vehicle approval is required before resuming this series" });
    }
    const series = await ddbClient.send(new ScanCommand({
      TableName: TABLES.trips,
      FilterExpression: "recurringSeriesId = :seriesId AND driverId = :driverId AND departureDateTime > :now",
      ExpressionAttributeValues: { ":seriesId": trip.recurringSeriesId, ":driverId": user.id, ":now": nowIso() },
    }));
    const eligible = (series.Items ?? []).filter((item) => Number(item.bookedSeatCount ?? 0) === 0 && (action === "PAUSE_SERIES" ? ["DRAFT", "PUBLISHED", "BOOKING_OPEN"].includes(String(item.status)) : item.status === "DRAFT" && item.seriesPaused === true));
    await Promise.all(eligible.map((item) => ddbClient.send(new UpdateCommand({
      TableName: TABLES.trips,
      Key: { tripId: item.tripId },
      UpdateExpression: "SET #status = :status, seriesPaused = :paused, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": action === "PAUSE_SERIES" ? "DRAFT" : "BOOKING_OPEN", ":paused": action === "PAUSE_SERIES", ":updatedAt": nowIso() },
    }))));
    return jsonResponse(200, { recurringSeriesId: trip.recurringSeriesId, updatedOccurrences: eligible.length, action });
  }
  if (action === "RESCHEDULE") {
    if (!["DRAFT", "PUBLISHED", "BOOKING_OPEN"].includes(String(trip.status))) {
      return jsonResponse(409, { message: "This trip can no longer be rescheduled" });
    }
    const departureDateTime = String(body.departureDateTime ?? "");
    const errors = validateRoute(trip.departureTown, trip.destinationTown, departureDateTime);
    if (errors.length) return jsonResponse(400, { message: errors[0], errors });
    const estimatedArrivalDateTime = new Date(Date.parse(departureDateTime) + Number(trip.routeDurationMinutes ?? 360) * 60_000).toISOString();
    const bookingCloseDateTime = new Date(Date.parse(departureDateTime) - 30 * 60_000).toISOString();
    await ddbClient.send(new UpdateCommand({
      TableName: TABLES.trips,
      Key: { tripId },
      UpdateExpression: "SET departureDateTime = :departure, estimatedArrivalDateTime = :arrival, bookingCloseDateTime = :bookingClose, #date = :date, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#date": "date" },
      ExpressionAttributeValues: { ":departure": departureDateTime, ":arrival": estimatedArrivalDateTime, ":bookingClose": bookingCloseDateTime, ":date": departureDateTime.slice(0, 10), ":updatedAt": nowIso() },
    }));
    const affectedBookings = await ddbClient.send(new QueryCommand({ TableName: TABLES.bookings, IndexName: "byTrip", KeyConditionExpression: "tripId = :tripId", ExpressionAttributeValues: { ":tripId": tripId } }));
    await Promise.all((affectedBookings.Items ?? []).filter((booking) => booking.bookingStatus !== "CANCELLED").map((booking) => createNotification(String(booking.accountHolderId), "TRIP_RESCHEDULED", "Trip rescheduled", `Your departure is now ${departureDateTime}.`, { tripId, bookingId: booking.bookingId })));
    return jsonResponse(200, { ...trip, departureDateTime, estimatedArrivalDateTime, bookingCloseDateTime, updatedAt: nowIso() });
  }
  const transitions: Record<string, string[]> = {
    PUBLISH: ["DRAFT"],
    CLOSE_BOOKING: ["PUBLISHED", "BOOKING_OPEN"],
    BOARDING: ["BOOKING_CLOSED"],
    START: ["BOARDING"],
    IN_PROGRESS: ["DEPARTED"],
    ARRIVE: ["IN_PROGRESS"],
    COMPLETE: ["ARRIVED"],
    CANCEL: TRIP_STATUSES.filter((status) => !["COMPLETED", "CANCELLED"].includes(status)),
  };
  const nextStatus: Record<string, string> = {
    PUBLISH: "BOOKING_OPEN",
    CLOSE_BOOKING: "BOOKING_CLOSED",
    BOARDING: "BOARDING",
    START: "DEPARTED",
    IN_PROGRESS: "IN_PROGRESS",
    ARRIVE: "ARRIVED",
    COMPLETE: "COMPLETED",
    CANCEL: "CANCELLED",
  };
  if (nextStatus[action]) {
    const stopLocation = ["ARRIVE", "COMPLETE", "CANCEL"].includes(action);
    if (action === "PUBLISH") {
      const vehicleResult = await ddbClient.send(new GetCommand({ TableName: TABLES.vehicles, Key: { vehicleId: trip.vehicleId } }));
      if (!vehicleResult.Item || vehicleResult.Item.verificationStatus !== "APPROVED") {
        return jsonResponse(409, { message: "Vehicle approval is required before this trip can be published" });
      }
    }
    if (!transitions[action]?.includes(String(trip.status))) {
      return jsonResponse(409, { message: `Cannot ${action.toLowerCase()} a trip in ${trip.status} status` });
    }
    await ddbClient.send(
      new UpdateCommand({
        TableName: TABLES.trips,
        Key: { tripId },
        UpdateExpression: `SET #status = :status, updatedAt = :updatedAt, publishedAt = if_not_exists(publishedAt, :publishedAt)${action === "PUBLISH" ? ", #vehicle.#verificationStatus = :approved" : ""}${stopLocation ? ", locationSharingActive = :false REMOVE currentLocation" : ""}`,
        ExpressionAttributeNames: {
          "#status": "status",
          ...(action === "PUBLISH" ? { "#vehicle": "vehicle", "#verificationStatus": "verificationStatus" } : {}),
        },
        ExpressionAttributeValues: {
          ":status": nextStatus[action],
          ":updatedAt": nowIso(),
          ":publishedAt": nowIso(),
          ...(action === "PUBLISH" ? { ":approved": "APPROVED" } : {}),
          ...(stopLocation ? { ":false": false } : {}),
        },
      })
    );
    const affectedBookings = await ddbClient.send(
      new QueryCommand({
        TableName: TABLES.bookings,
        IndexName: "byTrip",
        KeyConditionExpression: "tripId = :tripId",
        ExpressionAttributeValues: { ":tripId": tripId },
      })
    );
    for (const booking of affectedBookings.Items ?? []) {
      if (booking.bookingStatus === "CANCELLED") continue;
      if (action === "CANCEL" || action === "COMPLETE") {
        const bookingStatus = action === "CANCEL" ? "CANCELLED" : "COMPLETED";
        await ddbClient.send(
          new UpdateCommand({
            TableName: TABLES.bookings,
            Key: { bookingId: booking.bookingId },
            UpdateExpression: "SET bookingStatus = :bookingStatus, #legacyStatus = :legacyStatus, cancellationStatus = :cancellationStatus, refundStatus = :refundStatus, updatedAt = :updatedAt",
            ExpressionAttributeNames: { "#legacyStatus": "status" },
            ExpressionAttributeValues: {
              ":bookingStatus": bookingStatus,
              ":legacyStatus": bookingStatus.toLowerCase(),
              ":cancellationStatus": action === "CANCEL" ? "OPERATOR_CANCELLED" : booking.cancellationStatus ?? "NONE",
              ":refundStatus": action === "CANCEL" && booking.paymentStatus === "PAID" ? "PENDING" : booking.refundStatus ?? "NOT_REQUIRED",
              ":updatedAt": nowIso(),
            },
          })
        );
        if (action === "CANCEL" && booking.paymentId) {
          await ddbClient.send(new UpdateCommand({
            TableName: TABLES.payments,
            Key: { paymentId: booking.paymentId },
            UpdateExpression: "SET #status = :status, refundedAmount = :refund, updatedAt = :updatedAt",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: { ":status": booking.paymentStatus === "PAID" ? "REFUND_PENDING" : "CANCELLED", ":refund": booking.paymentStatus === "PAID" ? Number(booking.totalAmount ?? 0) : 0, ":updatedAt": nowIso() },
          }));
        }
      }
      const notificationType = action === "CANCEL" ? "TRIP_CANCELLED" : action === "COMPLETE" ? "REVIEW_REQUEST" : `TRIP_${nextStatus[action]}`;
      const notificationMessage = action === "CANCEL"
        ? "The operator cancelled this trip. RideLink support will follow up on any refund due."
        : action === "COMPLETE"
          ? "Your trip is complete. You can now rate your experience."
          : `Trip status changed to ${nextStatus[action].replace(/_/g, " ").toLowerCase()}.`;
      await createNotification(String(booking.accountHolderId), notificationType, action === "CANCEL" ? "Trip cancelled" : "Trip update", notificationMessage, { tripId, bookingId: booking.bookingId });
    }
    if (action === "PUBLISH") {
      const demand = await ddbClient.send(new QueryCommand({
        TableName: TABLES.travelRequests,
        IndexName: "byRoute",
        KeyConditionExpression: "routeKey = :routeKey AND preferredDate = :preferredDate",
        FilterExpression: "#status = :open",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":routeKey": trip.routeKey, ":preferredDate": trip.date, ":open": "OPEN" },
      }));
      await Promise.all((demand.Items ?? []).filter((request) => Number(request.passengerCount ?? 1) <= Number(trip.availableSeatCount ?? 0)).flatMap((request) => [
        createNotification(String(request.passengerId), "TRAVEL_REQUEST_MATCH", "A matching trip is available", `${trip.departureTown} to ${trip.destinationTown} is now open for booking.`, { tripId, requestId: request.requestId }),
        ddbClient.send(new UpdateCommand({ TableName: TABLES.travelRequests, Key: { requestId: request.requestId }, UpdateExpression: "SET #status = :matched, matchedTripId = :tripId, updatedAt = :updatedAt", ExpressionAttributeNames: { "#status": "status" }, ExpressionAttributeValues: { ":matched": "MATCHED", ":tripId": tripId, ":updatedAt": nowIso() } })),
      ]));
    }
    return jsonResponse(200, { ...trip, status: nextStatus[action], updatedAt: nowIso() });
  }
  if (!["DRAFT", "PUBLISHED", "BOOKING_OPEN"].includes(String(trip.status))) {
    return jsonResponse(409, { message: "This trip can no longer be edited" });
  }
  const pickupInstructions = String(body.pickupInstructions ?? trip.pickupInstructions ?? "");
  await ddbClient.send(
    new UpdateCommand({
      TableName: TABLES.trips,
      Key: { tripId },
      UpdateExpression: "SET pickupInstructions = :instructions, updatedAt = :updatedAt",
      ExpressionAttributeValues: { ":instructions": pickupInstructions, ":updatedAt": nowIso() },
    })
  );
  return jsonResponse(200, { ...trip, pickupInstructions, updatedAt: nowIso() });
}

async function holdSeats(event: Parameters<APIGatewayProxyHandlerV2>[0], tripId: string) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const body = parseBody(event);
  const seatNumbers = [...new Set(asStringArray(body.seatNumbers))];
  const passengerCount = Number(body.passengerCount ?? seatNumbers.length);
  if (!seatNumbers.length || seatNumbers.length > 8 || seatNumbers.length !== passengerCount) {
    return jsonResponse(400, { message: "Select one seat per passenger (maximum 8)" });
  }
  const trip = await getTrip(tripId);
  if (!trip) return jsonResponse(404, { message: "Trip not found" });
  if (!["PUBLISHED", "BOOKING_OPEN"].includes(String(trip.status)) || Date.parse(String(trip.bookingCloseDateTime)) <= Date.now()) {
    return jsonResponse(409, { message: "Bookings are closed for this trip" });
  }
  const expiresAtEpoch = Math.floor(Date.now() / 1000) + 300;
  const expiresAt = new Date(expiresAtEpoch * 1000).toISOString();
  try {
    await ddbClient.send(
      new TransactWriteCommand({
        TransactItems: seatNumbers.map((seatNumber) => ({
          Update: {
            TableName: TABLES.tripSeats,
            Key: { tripId, seatNumber },
            UpdateExpression: "SET #status = :held, heldByUserId = :userId, holdExpiresAt = :expiresAt, holdExpiresAtEpoch = :expiresEpoch, updatedAt = :updatedAt",
            ConditionExpression: "isBookable = :true AND (#status = :available OR (#status = :held AND (holdExpiresAtEpoch < :now OR heldByUserId = :userId)))",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
              ":held": "HELD",
              ":available": "AVAILABLE",
              ":userId": user.id,
              ":expiresAt": expiresAt,
              ":expiresEpoch": expiresAtEpoch,
              ":now": Math.floor(Date.now() / 1000),
              ":updatedAt": nowIso(),
              ":true": true,
            },
          },
        })),
      })
    );
  } catch (error) {
    if (isConditionalFailure(error)) return jsonResponse(409, { message: "One of those seats is no longer available. Refresh and choose another seat." });
    throw error;
  }
  return jsonResponse(200, { tripId, seatNumbers, holdExpiresAt: expiresAt, holdDurationSeconds: 300 });
}

async function releaseSeats(event: Parameters<APIGatewayProxyHandlerV2>[0], tripId: string) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const seatNumbers = [...new Set(asStringArray(parseBody(event).seatNumbers))];
  for (const seatNumber of seatNumbers) {
    try {
      await ddbClient.send(
        new UpdateCommand({
          TableName: TABLES.tripSeats,
          Key: { tripId, seatNumber },
          UpdateExpression: "SET #status = :available, updatedAt = :updatedAt REMOVE heldByUserId, holdExpiresAt, holdExpiresAtEpoch",
          ConditionExpression: "#status = :held AND heldByUserId = :userId",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":available": "AVAILABLE", ":held": "HELD", ":userId": user.id, ":updatedAt": nowIso() },
        })
      );
    } catch (error) {
      if (!isConditionalFailure(error)) throw error;
    }
  }
  return jsonResponse(200, { released: seatNumbers });
}

async function createBooking(event: Parameters<APIGatewayProxyHandlerV2>[0], tripId: string) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const body = parseBody(event);
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return jsonResponse(400, { message: "A valid booking idempotency key is required" });
  }
  const bookingDigest = createHash("sha256").update(`${user.id}:${tripId}:${idempotencyKey}`).digest("hex");
  const bookingId = `LRB-${bookingDigest.slice(0, 32)}`;
  const paymentId = `PAY-${bookingDigest.slice(0, 32)}`;
  const existingBooking = await getBooking(bookingId);
  if (existingBooking) {
    if (existingBooking.accountHolderId !== user.id || existingBooking.tripId !== tripId) return jsonResponse(409, { message: "Booking key conflict" });
    return jsonResponse(200, existingBooking);
  }
  const seatNumbers = [...new Set(asStringArray(body.seatNumbers))];
  const passengers = Array.isArray(body.passengers) ? (body.passengers as Json[]) : [];
  if (!seatNumbers.length || seatNumbers.length !== passengers.length || seatNumbers.length > 8) {
    return jsonResponse(400, { message: "Passenger details are required for every selected seat" });
  }
  if (passengers.some((passenger) => !validatePassenger(passenger))) {
    return jsonResponse(400, { message: "Each passenger needs a full name, valid Namibian phone number, emergency contact, and age category" });
  }
  const trip = await getTrip(tripId);
  if (!trip) return jsonResponse(404, { message: "Trip not found" });
  if (trip.driverId === user.id) return jsonResponse(409, { message: "Drivers cannot book their own trip" });
  if (!["PUBLISHED", "BOOKING_OPEN"].includes(String(trip.status)) || Date.parse(String(trip.bookingCloseDateTime)) <= Date.now()) {
    return jsonResponse(409, { message: "Bookings are closed for this trip" });
  }
  const seats = await listSeats(tripId);
  const requestedSeats = seats.filter((seat) => seatNumbers.includes(String(seat.seatNumber)));
  const nowEpoch = Math.floor(Date.now() / 1000);
  if (
    requestedSeats.length !== seatNumbers.length ||
    requestedSeats.some((seat) => seat.status !== "HELD" || seat.heldByUserId !== user.id || Number(seat.holdExpiresAtEpoch) <= nowEpoch)
  ) {
    return jsonResponse(409, { message: "Your seat hold expired or a seat is no longer available. Refresh the seat map." });
  }
  const bookingFee = Number(trip.bookingFee ?? 0);
  const extraLuggageCount = Math.min(passengers.length, Math.max(0, Math.floor(Number(body.extraLuggageCount ?? 0))));
  const luggageFee = Math.max(0, Number(trip.luggageFee ?? 0)) * extraLuggageCount;
  const insuranceFee = body.includeInsurance === true ? 25 * passengers.length : 0;
  const pickupPoint = resolveRoutePoint(trip.pickupPoints, body.pickupPoint, { id: "ORIGIN", name: trip.departureTown });
  const dropOffPoint = resolveRoutePoint(trip.dropOffPoints, body.dropOffPoint, { id: "DESTINATION", name: trip.destinationTown });
  if (!pickupPoint || !dropOffPoint) return jsonResponse(400, { message: "Choose pickup and drop-off points offered by this trip" });
  if (Number.isFinite(Number(pickupPoint.stopOrder)) && Number.isFinite(Number(dropOffPoint.stopOrder)) && Number(dropOffPoint.stopOrder) <= Number(pickupPoint.stopOrder)) {
    return jsonResponse(400, { message: "Drop-off must occur after the selected pickup point" });
  }
  const { subtotal, totalAmount } = calculateBookingTotals(
    requestedSeats.map((seat) => Number(seat.price)),
    bookingFee,
    luggageFee,
    insuranceFee
  );
  const paymentMethod = String(body.paymentMethod ?? "PAY_DRIVER");
  if (!["PAY_DRIVER", "PAY_OFFICE", "EFT", "MOBILE_WALLET", "CARD", "CASH"].includes(paymentMethod)) {
    return jsonResponse(400, { message: "Choose a supported payment method" });
  }
  const paymentStatus = ["CASH", "PAY_DRIVER"].includes(paymentMethod)
    ? "CASH_ON_BOARDING"
    : paymentMethod === "PAY_OFFICE"
      ? "AWAITING_VERIFICATION"
      : "PENDING";
  const createdAt = nowIso();
  const booking = {
    bookingId,
    bookingReference: createBookingReference(),
    tripId,
    riderId: user.id,
    accountHolderId: user.id,
    pickupStopId: String(pickupPoint.id ?? "ORIGIN"),
    dropOffStopId: String(dropOffPoint.id ?? "DESTINATION"),
    pickupPoint,
    dropOffPoint,
    passengerCount: passengers.length,
    seats: passengers.length,
    seatNumbers,
    subtotal,
    fees: { booking: bookingFee, luggage: luggageFee, insurance: insuranceFee },
    totalAmount,
    currency: "NAD",
    paymentId,
    paymentMethod,
    paymentStatus,
    bookingStatus: "CONFIRMED",
    status: "confirmed",
    cancellationStatus: "NONE",
    tripSnapshot: {
      departureTown: trip.departureTown,
      destinationTown: trip.destinationTown,
      departureDateTime: trip.departureDateTime,
      operatorName: trip.operatorName,
      vehicle: trip.vehicle,
    },
    createdAt,
    updatedAt: createdAt,
  };
  try {
    await ddbClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLES.bookings,
              Item: booking,
              ConditionExpression: "attribute_not_exists(bookingId)",
            },
          },
          {
            Put: {
              TableName: TABLES.payments,
              Item: {
                paymentId,
                bookingId,
                accountHolderId: user.id,
                amount: totalAmount,
                currency: "NAD",
                paymentMethod,
                paymentProvider: ["PAY_DRIVER", "PAY_OFFICE", "CASH"].includes(paymentMethod) ? "MANUAL" : "ADAPTER_PENDING",
                providerReference: null,
                status: paymentStatus,
                createdAt,
                updatedAt: createdAt,
              },
              ConditionExpression: "attribute_not_exists(paymentId)",
            },
          },
          ...requestedSeats.map((seat) => ({
            Update: {
              TableName: TABLES.tripSeats,
              Key: { tripId, seatNumber: seat.seatNumber },
              UpdateExpression: "SET #status = :booked, bookingId = :bookingId, updatedAt = :updatedAt REMOVE heldByUserId, holdExpiresAt, holdExpiresAtEpoch",
              ConditionExpression: "#status = :held AND heldByUserId = :userId AND holdExpiresAtEpoch > :now",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: {
                ":booked": "BOOKED",
                ":held": "HELD",
                ":bookingId": bookingId,
                ":userId": user.id,
                ":now": nowEpoch,
                ":updatedAt": createdAt,
              },
            },
          })),
          {
            Update: {
              TableName: TABLES.trips,
              Key: { tripId },
              UpdateExpression: "SET availableSeatCount = availableSeatCount - :count, seatsAvailable = seatsAvailable - :count, bookedSeatCount = bookedSeatCount + :count, updatedAt = :updatedAt",
              ConditionExpression: "availableSeatCount >= :count",
              ExpressionAttributeValues: { ":count": passengers.length, ":updatedAt": createdAt },
            },
          },
          ...passengers.map((passenger, index) => ({
            Put: {
              TableName: TABLES.passengers,
              Item: {
                bookingId,
                seatNumber: seatNumbers[index],
                fullName: String(passenger.fullName ?? "").trim(),
                phoneNumber: String(passenger.phoneNumber ?? "").trim(),
                identificationNumber: String(passenger.identificationNumber ?? "").trim(),
                ageCategory: String(passenger.ageCategory ?? "ADULT"),
                emergencyContact: String(passenger.emergencyContact ?? "").trim(),
                luggageDetails: String(passenger.luggageDetails ?? "None"),
                specialAssistance: String(passenger.specialAssistance ?? "None"),
                checkInStatus: "NOT_CHECKED_IN",
                createdAt,
              },
            },
          })),
        ],
      })
    );
  } catch (error) {
    if (isConditionalFailure(error)) {
      const completedRetry = await getBooking(bookingId);
      if (completedRetry?.accountHolderId === user.id && completedRetry.tripId === tripId) return jsonResponse(200, completedRetry);
      return jsonResponse(409, { message: "A selected seat was just taken. Your booking was not charged; please choose again." });
    }
    throw error;
  }
  await createNotification(user.id, "BOOKING_CONFIRMED", "Booking confirmed", `${trip.departureTown} to ${trip.destinationTown} • seats ${seatNumbers.join(", ")}`, { bookingId, tripId });
  return jsonResponse(201, booking);
}

async function myBookings(event: Parameters<APIGatewayProxyHandlerV2>[0], bookingId?: string) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  if (bookingId) {
    const booking = await getBooking(bookingId);
    if (!booking) return jsonResponse(404, { message: "Booking not found" });
    const trip = await getTrip(String(booking.tripId));
    if (booking.accountHolderId !== user.id && trip?.driverId !== user.id) return jsonResponse(403, { message: "You cannot view this booking" });
    const passengers = await ddbClient.send(
      new QueryCommand({ TableName: TABLES.passengers, KeyConditionExpression: "bookingId = :bookingId", ExpressionAttributeValues: { ":bookingId": bookingId } })
    );
    const visiblePassengers = (passengers.Items ?? []).map((passenger) =>
      trip?.driverId === user.id && passenger.identificationNumber
        ? { ...passenger, identificationNumber: `****${String(passenger.identificationNumber).slice(-4)}` }
        : passenger
    );
    return jsonResponse(200, { ...booking, trip, passengers: visiblePassengers });
  }
  const result = await ddbClient.send(
    new QueryCommand({
      TableName: TABLES.bookings,
      IndexName: "byRider",
      KeyConditionExpression: "riderId = :riderId",
      ExpressionAttributeValues: { ":riderId": user.id },
      ScanIndexForward: false,
    })
  );
  return jsonResponse(200, result.Items ?? []);
}

async function cancelBooking(event: Parameters<APIGatewayProxyHandlerV2>[0], bookingId: string) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const booking = await getBooking(bookingId);
  if (!booking) return jsonResponse(404, { message: "Booking not found" });
  if (booking.accountHolderId !== user.id) return jsonResponse(403, { message: "You cannot cancel another passenger's booking" });
  if (["CANCELLED", "COMPLETED", "REFUNDED"].includes(String(booking.bookingStatus))) return jsonResponse(409, { message: "This booking cannot be cancelled" });
  const trip = await getTrip(String(booking.tripId));
  if (!trip) return jsonResponse(404, { message: "Trip not found" });
  if (!canCancelBooking(String(trip.departureDateTime), Number(trip.cancellationCutoffHours ?? 24))) {
    return jsonResponse(409, { message: "The self-service cancellation cutoff has passed. Contact support." });
  }
  const fee = Math.min(Number(booking.totalAmount), Number(booking.totalAmount) * 0.1);
  const refundAmount = booking.paymentStatus === "PAID" ? Number(booking.totalAmount) - fee : 0;
  const updatedAt = nowIso();
  try {
    await ddbClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLES.bookings,
              Key: { bookingId },
              UpdateExpression: "SET bookingStatus = :cancelled, #legacyStatus = :legacyCancelled, cancellationStatus = :requested, cancellationReason = :reason, cancellationFee = :fee, refundAmount = :refund, refundStatus = :refundStatus, updatedAt = :updatedAt",
              ConditionExpression: "bookingStatus <> :cancelled",
              ExpressionAttributeNames: { "#legacyStatus": "status" },
              ExpressionAttributeValues: {
                ":cancelled": "CANCELLED",
                ":legacyCancelled": "cancelled",
                ":requested": "CONFIRMED",
                ":reason": String(parseBody(event).reason ?? "Passenger cancelled"),
                ":fee": fee,
                ":refund": refundAmount,
                ":refundStatus": refundAmount > 0 ? "PENDING" : "NOT_REQUIRED",
                ":updatedAt": updatedAt,
              },
            },
          },
          ...(booking.paymentId ? [{
            Update: {
              TableName: TABLES.payments,
              Key: { paymentId: booking.paymentId },
              UpdateExpression: "SET #status = :paymentStatus, refundedAmount = :refund, updatedAt = :updatedAt",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: { ":paymentStatus": refundAmount > 0 ? "REFUND_PENDING" : "CANCELLED", ":refund": refundAmount, ":updatedAt": updatedAt },
            },
          }] : []),
          ...asStringArray(booking.seatNumbers).map((seatNumber) => ({
            Update: {
              TableName: TABLES.tripSeats,
              Key: { tripId: booking.tripId, seatNumber },
              UpdateExpression: "SET #status = :available, updatedAt = :updatedAt REMOVE bookingId",
              ConditionExpression: "bookingId = :bookingId",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: { ":available": "AVAILABLE", ":bookingId": bookingId, ":updatedAt": updatedAt },
            },
          })),
          {
            Update: {
              TableName: TABLES.trips,
              Key: { tripId: booking.tripId },
              UpdateExpression: "SET availableSeatCount = availableSeatCount + :count, seatsAvailable = seatsAvailable + :count, bookedSeatCount = bookedSeatCount - :count, updatedAt = :updatedAt",
              ExpressionAttributeValues: { ":count": Number(booking.passengerCount), ":updatedAt": updatedAt },
            },
          },
        ],
      })
    );
  } catch (error) {
    if (isConditionalFailure(error)) return jsonResponse(409, { message: "Booking status changed. Refresh before trying again." });
    throw error;
  }
  await createNotification(user.id, "BOOKING_CANCELLED", "Booking cancelled", `Refund due: N$${refundAmount.toFixed(2)}`, { bookingId });
  return jsonResponse(200, { bookingId, bookingStatus: "CANCELLED", cancellationFee: fee, refundAmount, refundStatus: refundAmount > 0 ? "PENDING" : "NOT_REQUIRED" });
}

async function recordPayment(event: Parameters<APIGatewayProxyHandlerV2>[0], bookingId: string) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const booking = await getBooking(bookingId);
  if (!booking) return jsonResponse(404, { message: "Booking not found" });
  if (booking.accountHolderId !== user.id) return jsonResponse(403, { message: "You cannot pay for another account's booking" });
  const body = parseBody(event);
  const providerReference = String(body.providerReference ?? body.idempotencyKey ?? randomUUID());
  const paymentId = providerReference;
  const status = ["CASH", "PAY_DRIVER", "PAY_OFFICE"].includes(String(body.paymentMethod)) ? "AWAITING_VERIFICATION" : "PENDING";
  const payment = {
    paymentId,
    bookingId,
    accountHolderId: user.id,
    amount: booking.totalAmount,
    currency: "NAD",
    paymentMethod: String(body.paymentMethod ?? booking.paymentMethod),
    paymentProvider: String(body.paymentProvider ?? "MANUAL"),
    providerReference,
    status,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  try {
    await ddbClient.send(new PutCommand({ TableName: TABLES.payments, Item: payment, ConditionExpression: "attribute_not_exists(paymentId)" }));
  } catch (error) {
    if (isConditionalFailure(error)) return jsonResponse(409, { message: "This payment submission was already received" });
    throw error;
  }
  await ddbClient.send(
    new UpdateCommand({
      TableName: TABLES.bookings,
      Key: { bookingId },
      UpdateExpression: "SET paymentStatus = :status, paymentId = :paymentId, updatedAt = :updatedAt",
      ExpressionAttributeValues: { ":status": status, ":paymentId": paymentId, ":updatedAt": nowIso() },
    })
  );
  return jsonResponse(201, payment);
}

async function confirmPayment(event: Parameters<APIGatewayProxyHandlerV2>[0], bookingId: string) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const booking = await getBooking(bookingId);
  if (!booking) return jsonResponse(404, { message: "Booking not found" });
  const trip = await getTrip(String(booking.tripId));
  if (!trip || trip.driverId !== user.id) return jsonResponse(403, { message: "Only this trip's driver can confirm payment" });
  if (booking.paymentStatus === "PAID") return jsonResponse(409, { message: "Payment is already confirmed" });
  const paidAt = nowIso();
  await ddbClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Update: {
          TableName: TABLES.bookings,
          Key: { bookingId },
          UpdateExpression: "SET paymentStatus = :paid, paidAt = :paidAt, updatedAt = :paidAt",
          ExpressionAttributeValues: { ":paid": "PAID", ":paidAt": paidAt },
        },
      },
      ...(booking.paymentId ? [{
        Update: {
          TableName: TABLES.payments,
          Key: { paymentId: booking.paymentId },
          UpdateExpression: "SET #status = :paid, paidAt = :paidAt, updatedAt = :paidAt",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":paid": "PAID", ":paidAt": paidAt },
        },
      }] : []),
    ],
  }));
  await createNotification(String(booking.accountHolderId), "PAYMENT_RECEIVED", "Payment confirmed", `Payment for booking ${booking.bookingReference} was confirmed.`, { bookingId });
  return jsonResponse(200, { bookingId, paymentStatus: "PAID", paidAt });
}

async function notifications(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const result = await ddbClient.send(
    new QueryCommand({
      TableName: TABLES.notifications,
      IndexName: "byRecipient",
      KeyConditionExpression: "recipientId = :recipientId",
      ExpressionAttributeValues: { ":recipientId": user.id },
      ScanIndexForward: false,
      Limit: 50,
    })
  );
  return jsonResponse(200, result.Items ?? []);
}

function adminAllowed(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  return String(claims(event)?.["cognito:groups"] ?? "").includes("administrators");
}

async function withVerificationReviewUrls(item: Record<string, unknown>) {
  const documents = item.documents && typeof item.documents === "object" ? item.documents as Json : {};
  const keys = [String(documents.idFrontKey ?? ""), String(documents.idBackKey ?? ""), String(documents.selfieKey ?? ""), ...asStringArray(documents.vehiclePhotoKeys)].filter(Boolean);
  const urls = await Promise.all(keys.map((key) => getSignedUrl(s3Client, new GetObjectCommand({ Bucket: VERIFICATION_UPLOADS_BUCKET, Key: key }), { expiresIn: 600 })));
  return { ...item, reviewUrls: Object.fromEntries(keys.map((key, index) => [key, urls[index]])) };
}

async function adminVehicles(event: Parameters<APIGatewayProxyHandlerV2>[0], vehicleId: string) {
  if (!adminAllowed(event)) return jsonResponse(403, { message: "Administrator access required" });
  const status = String(parseBody(event).verificationStatus ?? "");
  if (!["APPROVED", "SUSPENDED", "PENDING"].includes(status)) return jsonResponse(400, { message: "Invalid verification status" });
  const result = await ddbClient.send(
    new UpdateCommand({
      TableName: TABLES.vehicles,
      Key: { vehicleId },
      UpdateExpression: "SET verificationStatus = :status, verifiedAt = :verifiedAt, updatedAt = :verifiedAt",
      ConditionExpression: "attribute_exists(vehicleId)",
      ExpressionAttributeValues: { ":status": status, ":verifiedAt": nowIso() },
      ReturnValues: "ALL_NEW",
    })
  );
  return jsonResponse(200, result.Attributes);
}

async function adminDriverVerifications(event: Parameters<APIGatewayProxyHandlerV2>[0], driverId?: string) {
  if (!adminAllowed(event)) return jsonResponse(403, { message: "Administrator access required" });
  if (event.requestContext.http.method === "GET") {
    const status = event.queryStringParameters?.status;
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      const result = await ddbClient.send(new QueryCommand({
        TableName: TABLES.driverVerifications,
        IndexName: "byStatus",
        KeyConditionExpression: "#status = :status",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": status },
        ScanIndexForward: false,
      }));
      return jsonResponse(200, await Promise.all((result.Items ?? []).map(withVerificationReviewUrls)));
    }
    const result = await ddbClient.send(new ScanCommand({ TableName: TABLES.driverVerifications, Limit: 25 }));
    return jsonResponse(200, await Promise.all((result.Items ?? []).map(withVerificationReviewUrls)));
  }
  if (!driverId) return jsonResponse(400, { message: "Driver is required" });
  const body = parseBody(event);
  const status = String(body.status ?? "");
  const reviewNote = String(body.reviewNote ?? "").trim().slice(0, 1000);
  if (!["APPROVED", "REJECTED"].includes(status)) return jsonResponse(400, { message: "Status must be APPROVED or REJECTED" });
  if (status === "REJECTED" && !reviewNote) return jsonResponse(400, { message: "Explain what the Driver needs to correct" });
  const existing = await ddbClient.send(new GetCommand({ TableName: TABLES.driverVerifications, Key: { driverId } }));
  if (!existing.Item || existing.Item.status !== "PENDING") return jsonResponse(409, { message: "Only pending verification requests can be reviewed" });
  const timestamp = nowIso();
  const writes: NonNullable<TransactWriteCommandInput["TransactItems"]> = [{
    Update: {
      TableName: TABLES.driverVerifications,
      Key: { driverId },
      UpdateExpression: "SET #status = :status, reviewNote = :reviewNote, reviewedAt = :reviewedAt, reviewedBy = :reviewedBy, updatedAt = :reviewedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": status, ":reviewNote": reviewNote || null, ":reviewedAt": timestamp, ":reviewedBy": userId(event) },
    },
  }];
  if (existing.Item.vehicleId) writes.push({
    Update: {
      TableName: TABLES.vehicles,
      Key: { vehicleId: existing.Item.vehicleId },
      UpdateExpression: "SET verificationStatus = :status, verifiedAt = :verifiedAt, updatedAt = :verifiedAt",
      ExpressionAttributeValues: { ":status": status === "APPROVED" ? "APPROVED" : "PENDING", ":verifiedAt": timestamp },
    },
  });
  await ddbClient.send(new TransactWriteCommand({ TransactItems: writes }));
  await createNotification(driverId, status === "APPROVED" ? "DRIVER_VERIFICATION_APPROVED" : "DRIVER_VERIFICATION_CHANGES_REQUIRED", status === "APPROVED" ? "You're approved to drive" : "Verification needs changes", status === "APPROVED" ? "Your RideLink Driver profile is approved. You can now create trips." : reviewNote, { status });
  return jsonResponse(200, { ...existing.Item, status, reviewNote: reviewNote || null, reviewedAt: timestamp });
}

async function adminAnalytics(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  if (!adminAllowed(event)) return jsonResponse(403, { message: "Administrator access required" });
  const [tripResult, bookingResult, vehicleResult, requestResult] = await Promise.all([
    ddbClient.send(new ScanCommand({ TableName: TABLES.trips, Select: "COUNT", FilterExpression: "#module = :module", ExpressionAttributeNames: { "#module": "module" }, ExpressionAttributeValues: { ":module": "LONG_ROUTE" } })),
    ddbClient.send(new ScanCommand({ TableName: TABLES.bookings })),
    ddbClient.send(new ScanCommand({ TableName: TABLES.vehicles, Select: "COUNT" })),
    ddbClient.send(new ScanCommand({ TableName: TABLES.travelRequests, Select: "COUNT" })),
  ]);
  const bookings = bookingResult.Items ?? [];
  return jsonResponse(200, {
    totalTrips: tripResult.Count ?? 0,
    totalBookings: bookings.length,
    totalVehicles: vehicleResult.Count ?? 0,
    openTravelRequests: requestResult.Count ?? 0,
    grossBookingValue: bookings.filter((booking) => booking.bookingStatus !== "CANCELLED").reduce((sum, booking) => sum + Number(booking.totalAmount ?? 0), 0),
    currency: "NAD",
  });
}

async function manifest(event: Parameters<APIGatewayProxyHandlerV2>[0], tripId: string) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const trip = await getTrip(tripId);
  if (!trip) return jsonResponse(404, { message: "Trip not found" });
  if (trip.driverId !== user.id) return jsonResponse(403, { message: "You cannot view another driver's manifest" });
  const bookings = await ddbClient.send(
    new QueryCommand({ TableName: TABLES.bookings, IndexName: "byTrip", KeyConditionExpression: "tripId = :tripId", ExpressionAttributeValues: { ":tripId": tripId } })
  );
  const passengers: Json[] = [];
  for (const booking of bookings.Items ?? []) {
    const result = await ddbClient.send(
      new QueryCommand({ TableName: TABLES.passengers, KeyConditionExpression: "bookingId = :bookingId", ExpressionAttributeValues: { ":bookingId": booking.bookingId } })
    );
    passengers.push(...(result.Items ?? []).map((passenger) => ({
      ...passenger,
      identificationNumber: passenger.identificationNumber ? `****${String(passenger.identificationNumber).slice(-4)}` : "",
      bookingReference: booking.bookingReference,
      paymentStatus: booking.paymentStatus,
      pickupPoint: booking.pickupPoint,
      dropOffPoint: booking.dropOffPoint,
    })));
  }
  return jsonResponse(200, { tripId, trip, passengers });
}

async function checkIn(event: Parameters<APIGatewayProxyHandlerV2>[0], bookingId: string) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const booking = await getBooking(bookingId);
  if (!booking) return jsonResponse(404, { message: "Booking not found" });
  const trip = await getTrip(String(booking.tripId));
  if (!trip || trip.driverId !== user.id) return jsonResponse(403, { message: "Only the trip driver can check passengers in" });
  const body = parseBody(event);
  const seatNumber = String(body.seatNumber ?? "");
  try {
    await ddbClient.send(
      new UpdateCommand({
        TableName: TABLES.passengers,
        Key: { bookingId, seatNumber },
        UpdateExpression: "SET checkInStatus = :checkedIn, checkedInAt = :checkedInAt, luggageLoaded = :luggageLoaded",
        ConditionExpression: "attribute_exists(bookingId) AND checkInStatus <> :checkedIn",
        ExpressionAttributeValues: { ":checkedIn": "CHECKED_IN", ":checkedInAt": nowIso(), ":luggageLoaded": Boolean(body.luggageLoaded) },
      })
    );
  } catch (error) {
    if (isConditionalFailure(error)) return jsonResponse(409, { message: "Passenger not found or ticket was already checked in" });
    throw error;
  }
  const passengerResult = await ddbClient.send(new QueryCommand({ TableName: TABLES.passengers, KeyConditionExpression: "bookingId = :bookingId", ExpressionAttributeValues: { ":bookingId": bookingId }, ConsistentRead: true }));
  if ((passengerResult.Items ?? []).length > 0 && (passengerResult.Items ?? []).every((passenger) => passenger.checkInStatus === "CHECKED_IN")) {
    await ddbClient.send(new UpdateCommand({ TableName: TABLES.bookings, Key: { bookingId }, UpdateExpression: "SET bookingStatus = :checkedIn, #legacyStatus = :legacyStatus, updatedAt = :updatedAt", ExpressionAttributeNames: { "#legacyStatus": "status" }, ExpressionAttributeValues: { ":checkedIn": "CHECKED_IN", ":legacyStatus": "checked_in", ":updatedAt": nowIso() } }));
  }
  await createNotification(String(booking.accountHolderId), "PASSENGER_CHECKED_IN", "Passenger checked in", `Seat ${seatNumber} has been checked in.`, { bookingId, tripId: booking.tripId });
  return jsonResponse(200, { bookingId, seatNumber, checkInStatus: "CHECKED_IN", checkedInAt: nowIso() });
}

async function createTravelRequest(event: Parameters<APIGatewayProxyHandlerV2>[0]) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const body = parseBody(event);
  if (!isTown(body.departureTown) || !isTown(body.destinationTown) || body.departureTown === body.destinationTown || !body.preferredDate) {
    return jsonResponse(400, { message: "Choose two different supported towns and a travel date" });
  }
  const request = {
    requestId: randomUUID(),
    passengerId: user.id,
    departureTown: body.departureTown,
    destinationTown: body.destinationTown,
    routeKey: `${body.departureTown}#${body.destinationTown}`,
    preferredDate: body.preferredDate,
    preferredTime: body.preferredTime ?? null,
    passengerCount: Math.max(1, Number(body.passengerCount ?? 1)),
    contactPreferences: asStringArray(body.contactPreferences),
    notes: String(body.notes ?? "").slice(0, 500),
    status: "OPEN",
    createdAt: nowIso(),
  };
  await ddbClient.send(new PutCommand({ TableName: TABLES.travelRequests, Item: request }));
  return jsonResponse(201, request);
}

async function createReview(event: Parameters<APIGatewayProxyHandlerV2>[0], tripId: string) {
  const user = requireUser(event);
  if (!user) return jsonResponse(401, { message: "Authentication required" });
  const body = parseBody(event);
  const bookingId = String(body.bookingId ?? "");
  const booking = await getBooking(bookingId);
  if (!booking || booking.tripId !== tripId || booking.accountHolderId !== user.id || booking.bookingStatus !== "COMPLETED") {
    return jsonResponse(403, { message: "Only passengers with a completed booking can review this trip" });
  }
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return jsonResponse(400, { message: "Rating must be between 1 and 5" });
  const review = {
    reviewId: randomUUID(),
    tripId,
    bookingId,
    reviewerId: user.id,
    reviewedUserId: (await getTrip(tripId))?.driverId,
    rating,
    categories: body.categories ?? {},
    comment: String(body.comment ?? "").slice(0, 1000),
    createdAt: nowIso(),
  };
  await ddbClient.send(new PutCommand({ TableName: TABLES.reviews, Item: review, ConditionExpression: "attribute_not_exists(reviewId)" }));
  return jsonResponse(201, review);
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;
  const tripId = event.pathParameters?.tripId;
  const bookingId = event.pathParameters?.bookingId;
  const vehicleId = event.pathParameters?.vehicleId;
  const driverId = event.pathParameters?.driverId;
  try {
    if (method === "GET" && path === "/long-routes/search") return await searchTrips(event);
    if (method === "GET" && tripId && path.startsWith("/long-routes/") && path.endsWith("/seats")) return await seatAvailability(tripId);
    if (method === "GET" && tripId && path.startsWith("/long-routes/")) return await tripDetail(tripId);
    const driverOnly = path.startsWith("/driver/") || path.endsWith("/payment/confirm") || path.endsWith("/check-in");
    const passengerOnly = path === "/long-route-bookings" || path.startsWith("/long-route-bookings/") || path === "/travel-requests" || path.endsWith("/seats/hold") || path.endsWith("/bookings") || path.endsWith("/payment") || path.endsWith("/reviews");
    if (driverOnly) {
      const denied = requireAccountType(event, "DRIVER");
      if (denied) return denied;
    }
    if (passengerOnly) {
      const denied = requireAccountType(event, "PASSENGER");
      if (denied) return denied;
    }
    if (path === "/driver/vehicles" && ["GET", "POST"].includes(method)) return await vehicles(event);
    if (path === "/driver/verification" && ["GET", "PUT"].includes(method)) return await driverVerification(event);
    if (method === "POST" && path === "/driver/verification/submit") return await submitDriverVerification(event);
    if (method === "POST" && path === "/driver/verification/uploads/presign") return await presignVerificationUpload(event);
    if (method === "POST" && path === "/driver/long-routes") return await createDriverTrip(event);
    if (method === "GET" && path === "/driver/long-routes") return await driverTrips(event);
    if (method === "GET" && tripId && path.endsWith("/manifest") && path.startsWith("/driver/long-routes/")) return await manifest(event, tripId);
    if (method === "GET" && tripId && path.endsWith("/seats") && path.startsWith("/driver/long-routes/")) return await driverTripDetail(event, tripId, true);
    if (method === "GET" && tripId && path.startsWith("/driver/long-routes/")) return await driverTripDetail(event, tripId, false);
    if (method === "PATCH" && tripId && path.startsWith("/driver/long-routes/")) return await updateDriverTrip(event, tripId);
    if (method === "POST" && tripId && path.endsWith("/seats/hold")) return await holdSeats(event, tripId);
    if (method === "DELETE" && tripId && path.endsWith("/seats/hold")) return await releaseSeats(event, tripId);
    if (method === "POST" && tripId && path.endsWith("/bookings")) return await createBooking(event, tripId);
    if (method === "GET" && path === "/long-route-bookings") return await myBookings(event);
    if (method === "GET" && bookingId && path.startsWith("/long-route-bookings/")) return await myBookings(event, bookingId);
    if (method === "POST" && bookingId && path.endsWith("/cancel")) return await cancelBooking(event, bookingId);
    if (method === "POST" && bookingId && path.endsWith("/payment")) return await recordPayment(event, bookingId);
    if (method === "POST" && bookingId && path.endsWith("/payment/confirm")) return await confirmPayment(event, bookingId);
    if (method === "POST" && bookingId && path.endsWith("/check-in")) return await checkIn(event, bookingId);
    if (method === "POST" && path === "/travel-requests") return await createTravelRequest(event);
    if (method === "POST" && tripId && path.endsWith("/reviews")) return await createReview(event, tripId);
    if (method === "GET" && path === "/notifications") return await notifications(event);
    if (method === "PATCH" && vehicleId && path.startsWith("/admin/vehicles/")) return await adminVehicles(event, vehicleId);
    if (method === "GET" && path === "/admin/driver-verifications") return await adminDriverVerifications(event);
    if (method === "PATCH" && driverId && path.startsWith("/admin/driver-verifications/")) return await adminDriverVerifications(event, driverId);
    if (method === "GET" && path === "/admin/long-routes/analytics") return await adminAnalytics(event);
    return jsonResponse(404, { message: "Route not found" });
  } catch (error) {
    console.error("Long route request failed", { method, path, error });
    return jsonResponse(500, { message: "We couldn't complete that request. Please try again." });
  }
};
