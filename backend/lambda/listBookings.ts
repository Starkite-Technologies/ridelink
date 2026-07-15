import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient, jsonResponse } from "./common";
import { hasAccountType } from "./authRole";

const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE!;

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  if (!hasAccountType(event, "PASSENGER")) return jsonResponse(403, { message: "A Passenger account is required to view bookings" });
  const riderId = event.requestContext.authorizer.jwt.claims.sub as string;

  const result = await ddbClient.send(
    new QueryCommand({
      TableName: BOOKINGS_TABLE,
      IndexName: "byRider",
      KeyConditionExpression: "riderId = :riderId",
      ExpressionAttributeValues: { ":riderId": riderId },
    })
  );

  return jsonResponse(200, result.Items ?? []);
};
