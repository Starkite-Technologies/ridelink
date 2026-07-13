import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient, jsonResponse } from "./common";

const TABLE_NAME = process.env.TRIPS_TABLE!;

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const result = await ddbClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  return jsonResponse(200, result.Items ?? []);
};
