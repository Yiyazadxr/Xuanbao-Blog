"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { applyAction, registerAction, type ActionState } from "@/app/(auth)/actions";
import { ConsentCheckbox } from "@/components/ui/ConsentCheckbox";
import { HCaptcha } from "@/components/ui/HCaptcha";
import {
  errorCls,
  inputCls,
  labelCls,
  primaryBtnCls,
  successCls,
} from "@/components/ui/form-styles";

const initialState: ActionState = { ok: false };
const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "";

// 注册页（邀请制）：提交申请后验证邮箱并设置密码，验证通过才进入审核。
export default function RegisterPage() {
  const [tab, setTab] = useState<"apply" | "register">("apply");
  const [applyState, applyFormAction, applyPending] = useActionState(applyAction, initialState);
  const [regState, regFormAction, regPending] = useActionState(registerAction, initialState);
  const [consent, setConsent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  // 配置了 hCaptcha Site Key 时才要求人机验证
  const captchaRequired = Boolean(HCAPTCHA_SITE_KEY);
  const canSubmit = consent && (!captchaRequired || captchaToken);

  function switchTab(next: "apply" | "register") {
    setTab(next);
    setCaptchaToken(""); // 切换时重置验证码，需重新通过
  }

  const tabCls = (active: boolean) =>
    `flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-medium transition-colors duration-200 ${
      active ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
    }`;

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">加入这里</h1>
      <p className="mt-2 text-sm text-muted">
        本站采用邀请制。提交申请并验证邮箱，验证时设置密码；审核通过后即可登录。持邀请码可直接注册。已有账号？{" "}
        <Link href="/login" className="text-accent hover:underline">
          直接登录
        </Link>
      </p>

      {/* 两步切换 */}
      <div role="tablist" className="mt-8 flex gap-1 rounded-2xl border border-border p-1">
        <button
          role="tab"
          aria-selected={tab === "apply"}
          onClick={() => switchTab("apply")}
          className={tabCls(tab === "apply")}
        >
          ① 申请账号
        </button>
        <button
          role="tab"
          aria-selected={tab === "register"}
          onClick={() => switchTab("register")}
          className={tabCls(tab === "register")}
        >
          ② 我有邀请码
        </button>
      </div>

      {tab === "apply" ? (
        <form action={applyFormAction} className="mt-6 space-y-5">
          {applyState.error && (
            <p role="alert" className={errorCls}>
              {applyState.error}
            </p>
          )}
          {applyState.ok && applyState.message && (
            <p role="status" className={successCls}>
              {applyState.message}
            </p>
          )}
          <input type="hidden" name="captcha" value={captchaToken} />
          <div>
            <label htmlFor="apply-email" className={labelCls}>
              邮箱
            </label>
            <input
              id="apply-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-muted">提交后会收到验证邮件，验证时设置登录密码</p>
          </div>
          <div>
            <label htmlFor="apply-message" className={labelCls}>
              申请说明
            </label>
            <textarea
              id="apply-message"
              name="message"
              rows={3}
              maxLength={500}
              placeholder="选填：介绍一下自己，或说明想注册的原因"
              className={`${inputCls} h-auto py-3`}
            />
          </div>
          {captchaRequired && <HCaptcha siteKey={HCAPTCHA_SITE_KEY} onVerify={setCaptchaToken} />}
          <ConsentCheckbox checked={consent} onCheckedChange={setConsent} />
          <button type="submit" disabled={applyPending || !canSubmit} className={primaryBtnCls}>
            {applyPending ? "提交中…" : "提交申请"}
          </button>
        </form>
      ) : (
        <form action={regFormAction} className="mt-6 space-y-5">
          {regState.error && (
            <p role="alert" className={errorCls}>
              {regState.error}
            </p>
          )}
          {regState.ok && regState.message && (
            <p role="status" className={successCls}>
              {regState.message}
            </p>
          )}
          <input type="hidden" name="captcha" value={captchaToken} />
          <div>
            <label htmlFor="reg-code" className={labelCls}>
              邀请码
            </label>
            <input
              id="reg-code"
              name="code"
              type="text"
              required
              placeholder="XR-XX-XXXXXXXXXXXX"
              className={`${inputCls} font-mono uppercase`}
            />
          </div>
          <div>
            <label htmlFor="reg-name" className={labelCls}>
              昵称
            </label>
            <input
              id="reg-name"
              name="name"
              type="text"
              autoComplete="nickname"
              required
              maxLength={30}
              placeholder="怎么称呼你"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="reg-email" className={labelCls}>
              邮箱
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="用于接收验证邮件"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-muted">提交后会收到验证邮件，验证时设置登录密码</p>
          </div>
          {captchaRequired && <HCaptcha siteKey={HCAPTCHA_SITE_KEY} onVerify={setCaptchaToken} />}
          <ConsentCheckbox checked={consent} onCheckedChange={setConsent} />
          <button type="submit" disabled={regPending || !canSubmit} className={primaryBtnCls}>
            {regPending ? "注册中…" : "注册"}
          </button>
        </form>
      )}
    </>
  );
}
