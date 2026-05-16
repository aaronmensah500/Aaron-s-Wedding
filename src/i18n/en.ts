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
  rsvp_pending: "Your RSVP is waiting for approval. The hosts will confirm you soon — then sign in here with the same email.",
  rsvp_rejected: "Your RSVP was not approved. Contact the hosts if you think this is a mistake.",
  rsvp_submitted_pending:
    "Thanks — the hosts will confirm your RSVP. Sign in on My guest once you're approved.",
  use_guest_login: "Sign in on My guest with your email and the 6-digit code from Supabase.",
  use_otp_login: "Sign in with your email and the 6-digit code we email you.",
  invalid_otp: "Enter the 6-digit code from your email.",
  otp_verify_failed: "That code is incorrect or expired. Request a new one.",
  otp_sent: "Check your email for a 6-digit sign-in code.",
  host_approve_ok: "Guest approved. They can sign in on My guest with their RSVP email.",
  host_reject_ok: "Guest declined.",
  invalid_reference: "Missing payment reference.",
  payment_not_verified: "We could not verify that payment with Paystack.",
  payment_email_mismatch: "That payment was made with a different email address.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
  otp_send_failed: "Could not send the sign-in email. Try again later.",
  not_authorized: "That email is not authorized to edit the site.",
  unauthorized: "You are not signed in as an editor.",
} as const;

export type ApiErrorCode = keyof typeof apiErrors;

export function apiErrorMessage(code: string): string {
  if (code in apiErrors) return apiErrors[code as ApiErrorCode];
  return code;
}
