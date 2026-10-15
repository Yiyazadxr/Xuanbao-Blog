"use server";

// 资料设置需登录；昵称和密码操作使用 hCaptcha 与限流。
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getFreshUser } from "@/lib/auth";
import { verifyHCaptcha } from "@/lib/hcaptcha";
import { deleteImage, saveImage } from "@/lib/image-storage";
import type { AllowedImageType } from "@/lib/image-type";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema, parseInput, updateNameSchema } from "@/lib/validation";

export type SettingsState = { ok: boolean; error?: string; message?: string };

// 头像不允许 GIF，上限 2MB。
const AVATAR_TYPES: readonly AllowedImageType[] = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export async function updateAvatar(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }

  const check = await rateLimit.checkAndHit("settings-avatar", user.id, 10, 60 * 60 * 1000);
  if (check.blocked) return { ok: false, error: "操作过于频繁，请稍后再试" };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "请选择头像图片" };
  }
  if (!AVATAR_TYPES.includes(file.type as AllowedImageType)) {
    return { ok: false, error: "仅支持 JPEG / PNG / WebP 图片" };
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return { ok: false, error: "头像图片不能超过 2MB" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let url: string;
  try {
    url = await saveImage(buf, "avatars", AVATAR_TYPES);
  } catch (e) {
    console.error("上传头像失败：", e);
    return { ok: false, error: "头像上传失败，请稍后重试" };
  }

  // 数据库更新成功后再删除旧头像。
  const old = user.image;
  await prisma.user.update({ where: { id: user.id }, data: { image: url } });
  if (old && old !== url) {
    await deleteImage(old);
  }

  revalidatePath("/settings");
  revalidatePath("/about");
  return { ok: true, message: "头像已更新" };
}

export async function deleteAvatar(
  // useActionState 契约要求保留 prevState 和 formData。
  _prev: SettingsState,
  _formData?: FormData
): Promise<SettingsState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  if (!user.image) return { ok: false, error: "当前没有头像可删除" };

  await prisma.user.update({ where: { id: user.id }, data: { image: null } });
  await deleteImage(user.image);

  revalidatePath("/settings");
  revalidatePath("/about");
  return { ok: true, message: "头像已删除" };
}

export async function updateProfile(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }
  const check = await rateLimit.checkAndHit("settings-name", user.id, 10, 60 * 60 * 1000);
  if (check.blocked) return { ok: false, error: "操作过于频繁，请稍后再试" };

  const parsed = parseInput(updateNameSchema, {
    name: String(formData.get("name") ?? ""),
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };

  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/settings");
  revalidatePath("/about");
  return { ok: true, message: "昵称已保存" };
}

export async function changePassword(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }
  // 前置检查不计数，超限时跳过 bcrypt。
  const pre = await rateLimit.isBlocked("settings-password", user.id, 10);
  if (pre.blocked) return { ok: false, error: `操作过于频繁，请 ${pre.retryAfterSec} 秒后再试` };

  const parsed = parseInput(changePasswordSchema, {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "两次输入的新密码不一致" };
  }

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });
  if (!full) return { ok: false, error: "用户不存在" };
  const valid = await bcrypt.compare(currentPassword, full.password);
  if (!valid) {
    // 仅失败时原子计数，并发请求不能绕过阈值。
    const failed = await rateLimit.checkAndHit("settings-password", user.id, 10, 60 * 60 * 1000);
    return {
      ok: false,
      error: failed.blocked
        ? `尝试次数过多，请 ${failed.retryAfterSec} 秒后再试`
        : "当前密码不正确",
    };
  }

  const changed = await prisma.user.updateMany({
    // 并发改密时旧凭据不能覆盖已更新的密码。
    where: { id: user.id, password: full.password, sessionVersion: user.sessionVersion },
    data: { password: await bcrypt.hash(newPassword, 10), sessionVersion: { increment: 1 } },
  });
  if (changed.count !== 1) return { ok: false, error: "账号状态已变化，请重新登录后再试" };
  await rateLimit.reset("settings-password", user.id);
  return { ok: true, message: "密码已修改，请重新登录" };
}
