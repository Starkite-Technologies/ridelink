import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { randomUUID } from "crypto";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient, jsonResponse } from "./common";
import { hasAccountType } from "./authRole";

const TABLE_NAME = process.env.TRIPS_TABLE!;
const DRIVER_VERIFICATIONS_TABLE = process.env.DRIVER_VERIFICATIONS_TABLE!;

type CreateTripBody = {
  origin: string;
  destination: string;
  date: string;
  seatsAvailable: number;
  pricePerSeat: number;
};

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  if (!hasAccountType(event, "DRIVER")) return jsonResponse(403, { message: "A Driver account is required to publish trips" });
  if (!event.body) return jsonResponse(400, { message: "Request body is required" });

  const body = JSON.parse(event.body) as Partial<CreateTripBody>;
  const { origin, destination, date, seatsAvailable, pricePerSeat } = body;

  if (!origin || !destination || !date || seatsAvailable == null || pricePerSeat == null) {
    return jsonResponse(400, { message: "origin, destination, date, seatsAvailable, pricePerSeat are required" });
  }

  const driverId = event.requestContext.authorizer.jwt.claims.sub as string;
  const verification = await ddbClient.send(new GetCommand({ TableName: DRIVER_VERIFICATIONS_TABLE, Key: { driverId } }));
  if (verification.Item?.status !== "APPROVED") return jsonResponse(403, { message: "Admin approval is required before creating trips" });
  const driverName = (event.requestContext.authorizer.jwt.claims["cognito:username"] as string) ?? "Driver";

  const trip = {
    tripId: randomUUID(),
    driverId,
    driverName,
    origin,
    destination,
    date,
    seatsAvailable,
    pricePerSeat,
    createdAt: new Date().toISOString(),
  };

  await ddbClient.send(new PutCommand({ TableName: TABLE_NAME, Item: trip }));

  return jsonResponse(201, trip);
};
