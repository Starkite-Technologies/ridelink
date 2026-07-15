export type FieldAuthError = { kind: "field"; field: "email" | "password" | "phoneNumber"; message: string };
export type BannerAuthError = { kind: "banner"; message: string; action?: "resendConfirmation" };
export type AuthError = FieldAuthError | BannerAuthError;

export function mapSignInError(error: unknown): AuthError {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";

  if (name === "UserNotConfirmedException") {
    return {
      kind: "banner",
      message: "Your email isn't verified yet. Confirm it to continue.",
      action: "resendConfirmation",
    };
  }

  if (name === "NotAuthorizedException" || name === "UserNotFoundException") {
    // Cognito deliberately doesn't distinguish a wrong email from a wrong password
    // (this prevents attackers from using the error to discover valid accounts),
    // so we can't honestly point at one field — a single generic message is correct here.
    return { kind: "banner", message: "Incorrect email or password. Double-check and try again." };
  }

  return { kind: "banner", message: message || "Something went wrong. Please try again." };
}

export function mapSignUpError(error: unknown): AuthError {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";

  if (name === "UsernameExistsException") {
    return {
      kind: "field",
      field: "email",
      message: "An account with this email already exists. Try signing in instead.",
    };
  }

  if (name === "InvalidPasswordException") {
    return { kind: "field", field: "password", message: "Password doesn't meet the requirements below." };
  }

  if (name === "InvalidParameterException" && /phone/i.test(message)) {
    return { kind: "field", field: "phoneNumber", message: "Enter a valid phone number with country code." };
  }

  return { kind: "banner", message: message || "Something went wrong. Please try again." };
}
