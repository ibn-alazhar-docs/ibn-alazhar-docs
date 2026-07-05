import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  // eslint-disable-next-line no-console
  console.warn("RESEND_API_KEY not set. Email sending will fail.");
}

/** Resend client instance — configured via RESEND_API_KEY env var. */
export const resend = new Resend(resendApiKey);

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
    if (!resendApiKey) {
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
