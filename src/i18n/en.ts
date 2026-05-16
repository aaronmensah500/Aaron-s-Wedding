/** Default UI locale (`Layout` uses `lang="en"`). Add keys here when introducing new copy. */
export const locale = "en" as const;

export const apiErrors = {
  server_misconfigured: "Server is not configured for this action.",
  invalid_json: "Request body must be valid JSON.",
  invalid_email: "Please enter a valid email address.",
  invalid_name: "Please enter your full name.",
  invalid_attendance: "Please choose whether you can attend.",
  invalid_guests: "Guest count must be between 1 and 20.",
  save_failed: "Could not save your RSVP. Please try again.",
  auth_provision_failed: "RSVP saved but sign-in could not be set up. Contact the hosts.",
  not_on_guest_list:
    "We don't have an RSVP or gift from that email yet. Reply on the RSVP form or contribute first, then try again.",
  invalid_reference: "Missing payment reference.",
  payment_not_verified: "We could not verify that payment with Paystack.",
  payment_email_mismatch: "That payment was made with a different email address.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
  otp_send_failed: "Could not send the sign-in email. Try again later.",
} as const;

export type ApiErrorCode = keyof typeof apiErrors;

export function apiErrorMessage(code: string): string {
  if (code in apiErrors) return apiErrors[code as ApiErrorCode];
  return code;
}
