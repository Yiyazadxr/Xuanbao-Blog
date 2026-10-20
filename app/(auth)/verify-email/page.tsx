import type { Metadata } from "next";
import Link from "next/link";
import {
  errorCls,
  inputCls,
  labelCls,
  primaryBtnCls,
} from "@/components/ui/form-styles";
import { getVerificationTarget } from "@/lib/account-verification";
import { VERIFICATION_FAILURE, type VerificationFailureReason } from "@/lib/verification-result";
import { verifyEmailAction } from "./actions";

export const metadata: Metadata = {
  title: "验证邮箱",
  robots: { index: false, follow: false },
};

const failureViews: Record<Exclude<VerificationFailureReason, "password">, {
  title: string;
  description: string;
  link: string;
  action: string;
}> = {
  [VERIFICATION_FAILURE.INVALID_LINK]: {
    title: "链接无效或已过期",
    description: "链接可能已被使用。请重新提交申请；如果已经提交过，请使用最新一封验证邮件里的链接。",
    link: "/register",
    action: "重新申请",
  },
  [VERIFICATION_FAILURE.EXPIRED]: {
    title: "验证链接已过期",
    description: "请重新提交申请，使用新邮件中的验证链接。",
    link: "/register",
    action: "重新申请",
  },
  [VERIFICATION_FAILURE.INVITE_INVALID]: {
    title: "邀请码已失效",
    description: "邀请码无效或已用尽，请使用有效邀请码重新申请。",
    link: "/register",
    action: "重新申请",
  },
  [VERIFICATION_FAILURE.ACCOUNT_EXISTS]: {
    title: "该邮箱已有账号",
    description: "该邮箱已有可用账号，请直接登录。",
    link: "/login",
    action: "前往登录",
  },
  [VERIFICATION_FAILURE.USED]: {
    title: "链接已使用",
    description: "此链接不能重复验证。如已提交申请，请等待审核。",
    link: "/",
    action: "返回首页",
  },
  [VERIFICATION_FAILURE.RETRY]: {
    title: "验证暂时失败",
    description: "请稍后使用同一链接重试，无需重新申请。",
    link: "/register",
    action: "重新申请",
  },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string; reason?: string }>;
}) {
  const { token, status, reason } = await searchParams;

  if (status === "success") {
    return (
      <>
        <h1 className="font-display text-3xl font-bold tracking-tight">邮箱已验证</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          密码已设置，申请已进入审核。审核通过后，我们会再发一封通知邮件。
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex text-sm font-medium text-accent hover:underline"
        >
          返回首页
        </Link>
      </>
    );
  }

  const retryLink = reason === VERIFICATION_FAILURE.RETRY && token && token.length <= 200
    ? `/verify-email?token=${encodeURIComponent(token)}`
    : null;
  const failure = reason && Object.hasOwn(failureViews, reason) && (reason !== VERIFICATION_FAILURE.RETRY || retryLink)
    ? failureViews[reason as Exclude<VerificationFailureReason, "password">]
    : failureViews[VERIFICATION_FAILURE.INVALID_LINK];
  const errorView = (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">{failure.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {failure.description}
      </p>
      <Link
        href={retryLink ?? failure.link}
        className="mt-8 inline-flex text-sm font-medium text-accent hover:underline"
      >
        {retryLink ? "重试验证" : failure.action}
      </Link>
    </>
  );

  if (status === "error" || !token) return errorView;

  const target = await getVerificationTarget(token);
  if (!target) return errorView;

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">验证邮箱</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        为 <span className="font-medium text-foreground">{target.email}</span> 设置登录密码，
        并完成验证。
      </p>
      {status === "invalid" && (
        <p role="alert" className={`${errorCls} mt-4`}>
          密码须为 8 至 72 位，且两次输入一致。
        </p>
      )}
      <form action={verifyEmailAction} className="mt-6 space-y-5">
        <input type="hidden" name="token" value={token} />
        <div>
          <label htmlFor="verify-password" className={labelCls}>
            设置密码
          </label>
          <input
            id="verify-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            placeholder="至少 8 位"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="verify-confirm-password" className={labelCls}>
            确认密码
          </label>
          <input
            id="verify-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            placeholder="再次输入密码"
            className={inputCls}
          />
        </div>
        <button type="submit" className={primaryBtnCls}>
          验证并设置密码
        </button>
      </form>
      <p className="mt-4 text-xs text-muted">验证后申请进入审核；审核通过后用此密码登录，请妥善保管。</p>
    </>
  );
}
