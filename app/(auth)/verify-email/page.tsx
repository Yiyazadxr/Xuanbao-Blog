import type { Metadata } from "next";
import Link from "next/link";
import {
  errorCls,
  inputCls,
  labelCls,
  primaryBtnCls,
} from "@/components/ui/form-styles";
import { getVerificationTarget } from "@/lib/account-verification";
import { verifyEmailAction } from "./actions";

export const metadata: Metadata = {
  title: "验证邮箱",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const { token, status } = await searchParams;

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

  const errorView = (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">链接无效或已过期</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        链接可能已被使用。请重新提交申请；如果已经提交过，请使用最新一封验证邮件里的链接。
      </p>
      <Link
        href="/register"
        className="mt-8 inline-flex text-sm font-medium text-accent hover:underline"
      >
        重新申请
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
          密码至少 8 位，且两次输入一致。
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
