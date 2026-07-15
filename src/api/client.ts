import { AWS_CONFIG } from "../config";
import type { Trip } from "../types";
import { fetch } from "expo/fetch";
import type {
  LongRouteBooking,
  LongRouteNotification,
  LongRouteTrip,
  PassengerDetails,
  RoutePoint,
  SeatAvailability,
  TripSearch,
  Vehicle,
  DriverVerification,
  DriverVerificationInput,
} from "../long-routes/types";

export type Booking = {
  bookingId: string;
  tripId: string;
  riderId: string;
  seats: number;
  status: string;
  createdAt: string;
};

type NewTrip = {
  origin: string;
  destination: string;
  date: string;
  seatsAvailable: number;
  pricePerSeat: number;
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; idToken?: string | null; timeoutMs?: number } = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  let res: Response;
  try {
    res = await fetch(`${AWS_CONFIG.apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.idToken ? { Authorization: options.idToken } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new ApiError("The request timed out. Check your connection and try again.", 0, "TIMEOUT");
    throw new ApiError("You're offline or RideLink can't be reached. Check your connection and try again.", 0, "NETWORK_ERROR");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new ApiError(errorBody.message ?? `Request failed with status ${res.status}`, res.status, errorBody.code);
  }

  return (await res.json()) as T;
}

function queryString(values: Record<string, string | number | boolean | undefined>) {
  const params = Object.entries(values)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return params ? `?${params}` : "";
}

export async function uploadVerificationImage(uploadUrl: string, uri: string, contentType: string) {
  const fileResponse = await fetch(uri);
  const body = await fileResponse.blob();
  const uploadResponse = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body });
  if (!uploadResponse.ok) throw new ApiError("The photo could not be uploaded. Please try again.", uploadResponse.status, "UPLOAD_FAILED");
}

export const api = {
  listTrips: () => request<Trip[]>("/trips"),
  getTrip: (tripId: string) => request<Trip>(`/trips/${tripId}`),
  createTrip: (trip: NewTrip, idToken: string) =>
    request<Trip>("/trips", { method: "POST", body: trip, idToken }),
  createBooking: (tripId: string, seats: number, idToken: string) =>
    request<Booking>("/bookings", { method: "POST", body: { tripId, seats }, idToken }),
  listBookings: (idToken: string) => request<Booking[]>("/bookings", { idToken }),
  searchLongRoutes: (search: TripSearch & { vehicleType?: string; verifiedOnly?: boolean; directOnly?: boolean; amenities?: string }) =>
    request<{ items: LongRouteTrip[]; nextToken: string | null }>(`/long-routes/search${queryString(search)}`),
  getLongRoute: (tripId: string) => request<LongRouteTrip>(`/long-routes/${tripId}`),
  getTripSeats: (tripId: string) => request<SeatAvailability>(`/long-routes/${tripId}/seats`),
  holdSeats: (tripId: string, seatNumbers: string[], passengerCount: number, idToken: string) =>
    request<{ tripId: string; seatNumbers: string[]; holdExpiresAt: string; holdDurationSeconds: number }>(
      `/long-routes/${tripId}/seats/hold`,
      { method: "POST", body: { seatNumbers, passengerCount }, idToken }
    ),
  releaseSeats: (tripId: string, seatNumbers: string[], idToken: string) =>
    request<{ released: string[] }>(`/long-routes/${tripId}/seats/hold`, { method: "DELETE", body: { seatNumbers }, idToken }),
  createLongRouteBooking: (
    tripId: string,
    input: {
      seatNumbers: string[];
      passengers: PassengerDetails[];
      pickupPoint?: RoutePoint;
      dropOffPoint?: RoutePoint;
      paymentMethod: string;
      extraLuggageCount?: number;
      includeInsurance?: boolean;
      idempotencyKey: string;
    },
    idToken: string
  ) => request<LongRouteBooking>(`/long-routes/${tripId}/bookings`, { method: "POST", body: input, idToken, timeoutMs: 25_000 }),
  listLongRouteBookings: (idToken: string) => request<LongRouteBooking[]>("/long-route-bookings", { idToken }),
  getLongRouteBooking: (bookingId: string, idToken: string) => request<LongRouteBooking>(`/long-route-bookings/${bookingId}`, { idToken }),
  cancelLongRouteBooking: (bookingId: string, reason: string, idToken: string) =>
    request<{ bookingStatus: string; refundAmount: number; refundStatus: string }>(`/long-route-bookings/${bookingId}/cancel`, {
      method: "POST",
      body: { reason },
      idToken,
    }),
  submitPayment: (bookingId: string, input: { paymentMethod: string; paymentProvider?: string; idempotencyKey: string }, idToken: string) =>
    request(`/long-route-bookings/${bookingId}/payment`, { method: "POST", body: input, idToken }),
  confirmPayment: (bookingId: string, idToken: string) =>
    request<{ bookingId: string; paymentStatus: "PAID"; paidAt: string }>(`/long-route-bookings/${bookingId}/payment/confirm`, { method: "POST", idToken }),
  listVehicles: (idToken: string) => request<Vehicle[]>("/driver/vehicles", { idToken }),
  registerVehicle: (vehicle: Omit<Vehicle, "vehicleId" | "ownerId" | "verificationStatus" | "seatCapacity" | "vehicleType" | "photos">, idToken: string) =>
    request<Vehicle>("/driver/vehicles", { method: "POST", body: vehicle, idToken }),
  getDriverVerification: (idToken: string) => request<DriverVerification>("/driver/verification", { idToken }),
  saveDriverVerification: (input: DriverVerificationInput, idToken: string) =>
    request<DriverVerification>("/driver/verification", { method: "PUT", body: input, idToken }),
  submitDriverVerification: (input: DriverVerificationInput, idToken: string) =>
    request<DriverVerification>("/driver/verification/submit", { method: "POST", body: input, idToken, timeoutMs: 25_000 }),
  createDriverVerificationUpload: (purpose: "ID_FRONT" | "ID_BACK" | "SELFIE" | "VEHICLE", contentType: string, idToken: string) =>
    request<{ key: string; uploadUrl: string; expiresInSeconds: number }>("/driver/verification/uploads/presign", { method: "POST", body: { purpose, contentType }, idToken }),
  listDriverLongRoutes: (idToken: string) => request<LongRouteTrip[]>("/driver/long-routes", { idToken }),
  getDriverLongRoute: (tripId: string, idToken: string) => request<LongRouteTrip>(`/driver/long-routes/${tripId}`, { idToken }),
  getDriverTripSeats: (tripId: string, idToken: string) => request<SeatAvailability>(`/driver/long-routes/${tripId}/seats`, { idToken }),
  createDriverLongRoute: (input: Record<string, unknown>, idToken: string) =>
    request<LongRouteTrip>("/driver/long-routes", { method: "POST", body: input, idToken, timeoutMs: 25_000 }),
  updateDriverLongRoute: (tripId: string, input: Record<string, unknown>, idToken: string) =>
    request<LongRouteTrip>(`/driver/long-routes/${tripId}`, { method: "PATCH", body: input, idToken }),
  getManifest: (tripId: string, idToken: string) =>
    request<{ tripId: string; trip: LongRouteTrip; passengers: Array<PassengerDetails & { bookingId: string; bookingReference: string; paymentStatus: string; checkInStatus: string }> }>(
      `/driver/long-routes/${tripId}/manifest`,
      { idToken }
    ),
  checkInPassenger: (bookingId: string, seatNumber: string, luggageLoaded: boolean, idToken: string) =>
    request(`/long-route-bookings/${bookingId}/check-in`, { method: "POST", body: { seatNumber, luggageLoaded }, idToken }),
  createTravelRequest: (input: Record<string, unknown>, idToken: string) =>
    request("/travel-requests", { method: "POST", body: input, idToken }),
  listLongRouteNotifications: (idToken: string) => request<LongRouteNotification[]>("/notifications", { idToken }),
  createReview: (tripId: string, input: Record<string, unknown>, idToken: string) =>
    request(`/long-routes/${tripId}/reviews`, { method: "POST", body: input, idToken }),
};
