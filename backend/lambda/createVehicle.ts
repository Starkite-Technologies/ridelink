import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { randomUUID } from "crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient, jsonResponse } from "./common";

const TABLE_NAME = process.env.VEHICLES_TABLE!;

type CreateVehicleBody = {
  make: string;
  model: string;
  color: string;
  year?: number;
  plate?: string;
  photoUrl?: string;
};

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  if (!event.body) return jsonResponse(400, { message: "Request body is required" });

  const body = JSON.parse(event.body) as Partial<CreateVehicleBody>;
  const { make, model, color, year, plate, photoUrl } = body;

  if (!make || !model || !color) {
    return jsonResponse(400, { message: "make, model, color are required" });
  }

  const ownerId = event.requestContext.authorizer.jwt.claims.sub as string;

  const vehicle = {
    vehicleId: randomUUID(),
    ownerId,
    make,
    model,
    color,
    year: year ?? null,
    plate: plate ?? null,
    photoUrl: photoUrl ?? null,
    verified: true,
    createdAt: new Date().toISOString(),
  };

  await ddbClient.send(new PutCommand({ TableName: TABLE_NAME, Item: vehicle }));

  return jsonResponse(201, vehicle);
};
