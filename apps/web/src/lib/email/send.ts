import { render } from "@react-email/render";
import { sendEmail, type SendEmailOptions } from "./client";
import { VerificationEmail } from "./templates/verification";
import { ResetPasswordEmail } from "./templates/reset-password";
import { WelcomeEmail } from "./templates/welcome";

const BASE_URL = process.env.APP_URL || "https://ibnalazhar-docs.vercel.app";

export interface SendVerificationEmailParams {
  to: string;
  username: string;
  token: string;
}

export async function sendVerificationEmail(
  params: SendVerificationEmailParams,
): Promise<{ success: boolean; error?: string }> {
  const verificationUrl = `${BASE_URL}/api/auth/verify-email?token=${params.token}`;

  const html = await render(
    VerificationEmail({
      username: params.username,
      verificationUrl,
    }),
  );

  return sendEmail({
    to: params.to,
    subject: "تأكيد البريد الإلكتروني - Ibn Al-Azhar Docs",
    html,
  });
}

export interface SendResetPasswordEmailParams {
  to: string;
  username: string;
  token: string;
}

export async function sendResetPasswordEmail(
  params: SendResetPasswordEmailParams,
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${BASE_URL}/ar/reset-password?token=${params.token}`;

  const html = await render(
    ResetPasswordEmail({
      username: params.username,
      resetUrl,
    }),
  );

  return sendEmail({
    to: params.to,
    subject: "إعادة تعيين كلمة المرور - Ibn Al-Azhar Docs",
    html,
  });
}

export interface SendWelcomeEmailParams {
  to: string;
  username: string;
}

export async function sendWelcomeEmail(
  params: SendWelcomeEmailParams,
): Promise<{ success: boolean; error?: string }> {
  const html = await render(
    WelcomeEmail({
      username: params.username,
    }),
  );

  return sendEmail({
    to: params.to,
    subject: "مرحباً بك في Ibn Al-Azhar Docs! 🎉",
    html,
  });
}

export type { SendEmailOptions };
