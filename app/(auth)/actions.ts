"use server";

// Server Action 由 Next.js 校验 Origin/Host，无需额外 CSRF token。
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { verifyHCaptcha } from "@/lib/hcaptcha";
import { submitAccountRequest, submitInviteRequest } from "@/lib/invites";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { applySchema, loginSchema, parseInput, registerSchema } from "@/lib/validation";

export type ActionState = { ok: boolean; error?: string; message?: string };

// 登录按邮箱和 IP 双重限流。
export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseInput(loginSchema, {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { email } = parsed.data;

  try {
    // 客户端整页跳转以重新挂载 SessionProvider。
    await signIn("credentials", { email, password: parsed.data.password, redirect: false });
    return { ok: true, message: "登录成功" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "登录失败，请检查邮箱和密码；尝试过多时请稍后再试" };
    }
    throw error;
  }
}

// 账号申请按 IP 和邮箱分别限流。
export async function applyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseInput(applySchema, {
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };

  // 未配置 hCaptcha 密钥时跳过验证。
  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }

  const ip = await getClientIp();
  const check = await rateLimit.checkAndHit("apply", ip, 5, 10 * 60 * 1000);
  if (check.blocked) {
    return { ok: false, error: `申请过于频繁，请 ${check.retryAfterSec} 秒后再试` };
  }

  const result = await submitAccountRequest(parsed.data.email, parsed.data.message);
  return result.ok
    ? {
        ok: true,
        message:
          "请求已受理。若邮箱尚未验证，会收到验证邮件；打开链接验证邮箱并设置密码，验证后进入审核。已注册用户可直接登录",
      }
    : { ok: false, error: result.error ?? "提交失败，请稍后重试" };
}

// 邀请码申请按 IP 限流；邮箱验证通过后才消耗邀请码并预建待审核账号。
export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseInput(registerSchema, {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };

  // 未配置 hCaptcha 密钥时跳过验证。
  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }

  const ip = await getClientIp();
  const check = await rateLimit.checkAndHit("register", ip, 10, 60 * 60 * 1000);
  if (check.blocked) {
    return { ok: false, error: `注册太频繁，请 ${check.retryAfterSec} 秒后再试` };
  }

  const result = await submitInviteRequest(parsed.data);
  return result.ok
    ? {
        ok: true,
        message:
          "请求已受理。若邮箱尚未验证，会收到验证邮件；打开链接验证邮箱并设置密码，验证后进入审核。已注册用户可直接登录",
      }
    : { ok: false, error: result.error ?? "提交失败，请稍后重试" };
}
