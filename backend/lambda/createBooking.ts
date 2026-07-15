import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { randomUUID } from "crypto";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient, jsonResponse } from "./common";
import { hasAccountType } from "./authRole";

const TRIPS_TABLE = process.env.TRIPS_TABLE!;
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE!;

type CreateBookingBody = {
  tripId: string;
  seats: number;
};

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  if (!hasAccountType(event, "PASSENGER")) return jsonResponse(403, { message: "A Passenger account is required to book rides" });
  if (!event.body) return jsonResponse(400, { message: "Request body is required" });

  const { tripId, seats } = JSON.parse(event.body) as Partial<CreateBookingBody>;
  if (!tripId || !seats || seats < 1) {
    return jsonResponse(400, { message: "tripId and seats (>=1) are required" });
  }

  const riderId = event.requestContext.authorizer.jwt.claims.sub as string;

  const tripResult = await ddbClient.send(new GetCommand({ TableName: TRIPS_TABLE, Key: { tripId } }));
  const trip = tripResult.Item;
  if (!trip) return jsonResponse(404, { message: "Trip not found" });
  if (trip.seatsAvailable < seats) return jsonResponse(409, { message: "Not enough seats available" });

  await ddbClient.send(
    new UpdateCommand({
      TableName: TRIPS_TABLE,
      Key: { tripId },
      UpdateExpression: "SET seatsAvailable = seatsAvailable - :seats",
      ConditionExpression: "seatsAvailable >= :seats",
      ExpressionAttributeValues: { ":seats": seats },
    })
  );

  const booking = {
    bookingId: randomUUID(),
    tripId,
    riderId,
    seats,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };

  await ddbClient.send(new PutCommand({ TableName: BOOKINGS_TABLE, Item: booking }));

  return jsonResponse(201, booking);
};
