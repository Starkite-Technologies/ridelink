import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { jsonResponse } from "./common";

const BUCKET_NAME = process.env.VEHICLE_PHOTOS_BUCKET!;
const BUCKET_DOMAIN = process.env.VEHICLE_PHOTOS_BUCKET_DOMAIN!;

const s3Client = new S3Client({});

type PhotoUploadUrlBody = {
  contentType?: string;
};

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  const body = event.body ? (JSON.parse(event.body) as Partial<PhotoUploadUrlBody>) : {};
  const contentType = body.contentType ?? "image/jpeg";
  const extension = contentType === "image/png" ? "png" : "jpg";

  const ownerId = event.requestContext.authorizer.jwt.claims.sub as string;
  const key = `vehicles/${ownerId}/${randomUUID()}.${extension}`;

  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn: 300 }
  );

  const photoUrl = `https://${BUCKET_DOMAIN}/${key}`;

  return jsonResponse(200, { uploadUrl, photoUrl });
};
