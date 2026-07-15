import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient, jsonResponse } from "./common";

const TABLE_NAME = process.env.VEHICLES_TABLE!;

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  const vehicleId = event.pathParameters?.vehicleId;
  if (!vehicleId) return jsonResponse(400, { message: "vehicleId is required" });

  const ownerId = event.requestContext.authorizer.jwt.claims.sub as string;

  const result = await ddbClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { vehicleId } }));
  const vehicle = result.Item;
  if (!vehicle) return jsonResponse(404, { message: "Vehicle not found" });
  if (vehicle.ownerId !== ownerId) return jsonResponse(403, { message: "You can only delete your own vehicles" });

  await ddbClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { vehicleId } }));

  return jsonResponse(200, { deleted: true });
};
