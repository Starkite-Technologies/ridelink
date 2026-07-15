type CognitoErrorLike = {
  code?: unknown;
  name?: unknown;
  message?: unknown;
};

function details(error: unknown) {
  const value = (error && typeof error === "object" ? error : {}) as CognitoErrorLike;
  return {
    code: String(value.code ?? value.name ?? ""),
    message: typeof value.message === "string" ? value.message : "",
  };
}

export type AuthAction = "SIGN_IN" | "SIGN_UP" | "VERIFY" | "RESEND" | "RESET_REQUEST" | "RESET_CONFIRM";

export function friendlyAuthError(error: unknown, action: AuthAction) {
  const { code, message } = details(error);

  if (code === "NetworkError") return "RideLink could not reach the server. Check your internet connection and try again.";
  if (code === "TooManyRequestsException" || code === "LimitExceededException") return "Too many attempts were made. Wait a few minutes, then try again.";
  if (code === "NotAuthorizedException" && action === "SIGN_IN") return "The email or password is incorrect.";
  if (code === "UserNotFoundException" && action === "SIGN_IN") return "No RideLink account was found for this email.";
  if (code === "UserNotFoundException") return "No RideLink account was found for this email.";
  if (code === "UserNotConfirmedException") return "Verify your email before signing in.";
  if (code === "UsernameExistsException") return "An account already exists for this email. Sign in or reset your password instead.";
  if (code === "InvalidPasswordException") return "Use at least 8 characters with a lowercase letter and a number.";
  if (code === "CodeMismatchException") return "That verification code is incorrect. Check the latest email and try again.";
  if (code === "ExpiredCodeException") return "That verification code has expired. Request a new code and try again.";
  if (code === "CodeDeliveryFailureException") return "The verification email could not be delivered. Check the address and try again.";
  if (code === "AliasExistsException") return "This email is already connected to another account.";
  if (code === "InvalidParameterException" && message.toLowerCase().includes("phone")) return "Enter the phone number with a country code, for example +264811234567.";
  if (code === "InvalidParameterException") return "One of the account details is not accepted. Check the highlighted fields and try again.";

  if (message && !/exception|validation/i.test(message)) return message;
  if (action === "SIGN_UP") return "RideLink could not create the account. Check the details and try again.";
  if (action === "VERIFY" || action === "RESEND") return "RideLink could not verify the email right now. Try again shortly.";
  if (action === "RESET_REQUEST" || action === "RESET_CONFIRM") return "RideLink could not reset the password right now. Try again shortly.";
  return "RideLink could not sign you in. Try again.";
}
