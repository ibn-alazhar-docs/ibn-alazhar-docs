import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn("RESEND_API_KEY not set. Email sending will fail.");
}

export const resend = new Resend(resendApiKey);

export const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@ibnalazhar-docs.vercel.app";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

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
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
