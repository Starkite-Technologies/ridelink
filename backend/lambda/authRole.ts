import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export type AccountType = "PASSENGER" | "DRIVER";

export function accountTypeFromEvent(event: APIGatewayProxyEventV2WithJWTAuthorizer): AccountType {
  const claims = event.requestContext.authorizer.jwt.claims;
  const groups = String(claims["cognito:groups"] ?? "");
  return claims.profile === "DRIVER" || claims["custom:account_type"] === "DRIVER" || groups.includes("verified_drivers") ? "DRIVER" : "PASSENGER";
}

export function hasAccountType(event: APIGatewayProxyEventV2WithJWTAuthorizer, required: AccountType) {
  return accountTypeFromEvent(event) === required;
}
