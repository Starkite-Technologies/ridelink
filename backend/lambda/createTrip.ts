import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { randomUUID } from "crypto";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient, jsonResponse } from "./common";

const TABLE_NAME = process.env.TRIPS_TABLE!;
const VEHICLES_TABLE = process.env.VEHICLES_TABLE!;

type CreateTripBody = {
  origin: string;
  destination: string;
  date: string;
  seatsAvailable: number;
  pricePerSeat: number;
  vehicleId: string;
  notes?: string;
};

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  if (!event.body) return jsonResponse(400, { message: "Request body is required" });

  const body = JSON.parse(event.body) as Partial<CreateTripBody>;
  const { origin, destination, date, seatsAvailable, pricePerSeat, vehicleId, notes } = body;

  if (!origin || !destination || !date || seatsAvailable == null || pricePerSeat == null || !vehicleId) {
    return jsonResponse(400, {
      message: "origin, destination, date, seatsAvailable, pricePerSeat, vehicleId are required",
    });
  }

  const driverId = event.requestContext.authorizer.jwt.claims.sub as string;
  const driverName = (event.requestContext.authorizer.jwt.claims["cognito:username"] as string) ?? "Driver";

  const vehicleResult = await ddbClient.send(new GetCommand({ TableName: VEHICLES_TABLE, Key: { vehicleId } }));
  const vehicle = vehicleResult.Item;
  if (!vehicle) return jsonResponse(400, { message: "Vehicle not found" });
  if (vehicle.ownerId !== driverId) {
    return jsonResponse(403, { message: "You can only post trips using your own vehicles" });
  }

  const vehicleLabel = `${vehicle.make} ${vehicle.model} (${vehicle.color})`;

  const trip = {
    tripId: randomUUID(),
    driverId,
    driverName,
    origin,
    destination,
    date,
    seatsAvailable,
    pricePerSeat,
    vehicleId,
    vehicleLabel,
    notes: notes ?? "",
    createdAt: new Date().toISOString(),
  };

  await ddbClient.send(new PutCommand({ TableName: TABLE_NAME, Item: trip }));

  return jsonResponse(201, trip);
};
