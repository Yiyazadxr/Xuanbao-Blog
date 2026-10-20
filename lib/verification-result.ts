// 仅向验证页传递预定义原因，不暴露数据库异常或任意错误文本。
export const VERIFICATION_FAILURE = {
  INVALID_LINK: "invalid-link",
  EXPIRED: "expired",
  INVITE_INVALID: "invite-invalid",
  ACCOUNT_EXISTS: "account-exists",
  USED: "used",
  RETRY: "retry",
  PASSWORD: "password",
} as const;

export type VerificationFailureReason =
  (typeof VERIFICATION_FAILURE)[keyof typeof VERIFICATION_FAILURE];

export type VerificationResult =
  | { ok: true }
  | { ok: false; reason: VerificationFailureReason; error: string };
