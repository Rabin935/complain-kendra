interface PasswordResetEmailInput {
  email: string;
  name: string;
  resetToken: string;
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    console.log(
      `[mock-email] Password reset for ${input.email} (${input.name}). Reset token: ${input.resetToken}`,
    );
  }
}
