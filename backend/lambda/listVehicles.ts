import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient, jsonResponse } from "./common";

const TABLE_NAME = process.env.VEHICLES_TABLE!;

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  const ownerId = event.requestContext.authorizer.jwt.claims.sub as string;

  const result = await ddbClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "byOwner",
      KeyConditionExpression: "ownerId = :ownerId",
      ExpressionAttributeValues: { ":ownerId": ownerId },
      ScanIndexForward: false,
    })
  );

  return jsonResponse(200, result.Items ?? []);
};
