import nodemailer from "nodemailer";
import { AppError } from "../utils/appError";

function getRequiredEnv(key: "EMAIL_USER" | "EMAIL_PASS"): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new AppError(`${key} is not defined in the environment.`, 500);
  }

  return value;
}

function getResetLink(resetToken: string): string {
  const parsedPort = Number.parseInt(process.env.PORT ?? "", 10);
  const port = Number.isNaN(parsedPort) ? 5000 : parsedPort;

  return `http://localhost:${port}/api/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
}

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: getRequiredEnv("EMAIL_USER"),
      pass: getRequiredEnv("EMAIL_PASS"),
    },
  });
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const emailUser = getRequiredEnv("EMAIL_USER");
  const resetLink = getResetLink(resetToken);

  await createTransporter().sendMail({
    from: emailUser,
    to,
    subject: "Reset your ComplaintHub password",
    text: [
      "We received a request to reset your ComplaintHub password.",
      `Reset your password using this link: ${resetLink}`,
      "This link expires in 15 minutes.",
      "If you did not request a password reset, you can ignore this email.",
    ].join("\n\n"),
    html: `
      <p>We received a request to reset your ComplaintHub password.</p>
      <p><a href="${resetLink}">Reset your password</a></p>
      <p>This link expires in 15 minutes.</p>
      <p>If you did not request a password reset, you can ignore this email.</p>
    `,
  });
}
