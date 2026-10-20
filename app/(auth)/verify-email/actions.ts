"use server";

import { redirect } from "next/navigation";
import { verifyAccountRequest } from "@/lib/account-verification";
import { parseInput, verifyPasswordSchema } from "@/lib/validation";
import { VERIFICATION_FAILURE } from "@/lib/verification-result";

// 只在用户提交表单时验证，避免邮件预取链接自动消耗令牌。
export async function verifyEmailAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/verify-email?status=error");

  const parsed = parseInput(verifyPasswordSchema, {
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.data) {
    redirect(`/verify-email?token=${encodeURIComponent(token)}&status=invalid`);
  }

  const result = await verifyAccountRequest(token, parsed.data.password);
  if (result.ok) redirect("/verify-email?status=success");
  if (result.reason === VERIFICATION_FAILURE.PASSWORD) {
    redirect(`/verify-email?token=${encodeURIComponent(token)}&status=invalid`);
  }
  if (result.reason === VERIFICATION_FAILURE.RETRY) {
    redirect(`/verify-email?token=${encodeURIComponent(token)}&status=error&reason=retry`);
  }
  redirect(`/verify-email?status=error&reason=${result.reason}`);
}
