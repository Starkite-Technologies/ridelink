import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient, jsonResponse } from "./common";

const TABLE_NAME = process.env.TRIPS_TABLE!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const tripId = event.pathParameters?.tripId;
  if (!tripId) return jsonResponse(400, { message: "tripId is required" });

  const result = await ddbClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { tripId } }));
  if (!result.Item) return jsonResponse(404, { message: "Trip not found" });

  return jsonResponse(200, result.Item);
};
