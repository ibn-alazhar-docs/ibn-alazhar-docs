import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

/** Lazy Resend client instance — initialised only when an API key is set. */
export function getResendClient(): Resend | null {
  if (!resendApiKey) {
    return null;
  }
  return new Resend(resendApiKey);
}

/** Sender address used for all outbound emails. */
export const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@ibnalazhar-docs.vercel.app";

/** Options for the sendEmail helper. */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Sends an email via Resend.
 * Returns a structured result instead of throwing, so callers can handle failures gracefully.
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();
    if (!resend) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }
    await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    return { success: true };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
