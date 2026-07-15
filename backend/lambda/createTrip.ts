import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { randomUUID } from "crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient, jsonResponse } from "./common";

const TABLE_NAME = process.env.TRIPS_TABLE!;

type CreateTripBody = {
  origin: string;
  destination: string;
  date: string;
  seatsAvailable: number;
  pricePerSeat: number;
};

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  if (!event.body) return jsonResponse(400, { message: "Request body is required" });

  const body = JSON.parse(event.body) as Partial<CreateTripBody>;
  const { origin, destination, date, seatsAvailable, pricePerSeat } = body;

  if (!origin || !destination || !date || seatsAvailable == null || pricePerSeat == null) {
    return jsonResponse(400, { message: "origin, destination, date, seatsAvailable, pricePerSeat are required" });
  }

  const driverId = event.requestContext.authorizer.jwt.claims.sub as string;
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
