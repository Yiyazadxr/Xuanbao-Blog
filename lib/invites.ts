import {
  createVerificationToken,
  VERIFICATION_TTL_MS,
} from "@/lib/account-verification";
import {
  buildVerificationEmail,
  isMailConfigured,
  sendMail,
} from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/random";

const VERIFICATION_EXPIRES_HOURS = VERIFICATION_TTL_MS / (60 * 60 * 1000);

function verificationExpiry(): Date {
  return new Date(Date.now() + VERIFICATION_TTL_MS);
}

async function findPendingRequest(email: string) {
  return prisma.accountRequest.findFirst({
    where: {
      email,
      status: { in: ["UNVERIFIED", "PENDING", "PROCESSING"] },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function sendVerificationEmail(
  email: string,
  token: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { subject, text } = buildVerificationEmail({
      token,
      expiresHours: VERIFICATION_EXPIRES_HOURS,
    });
    const sent = await sendMail(email, subject, text);
    return sent
      ? { ok: true }
      : { ok: false, error: "验证邮件发送失败，请稍后重试" };
  } catch (error) {
    console.error("验证邮件发送失败：", error);
    return { ok: false, error: "验证邮件发送失败，请稍后重试" };
  }
}

export async function submitAccountRequest(email: string, message?: string) {
  const normalized = email.trim().toLowerCase();

  // 邮件是注册流程的前置条件；放在邮箱分支前，避免用配置差异探测账号。
  if (!isMailConfigured()) {
    return { ok: false, error: "邮件服务未配置，暂时无法提交申请" };
  }

  // IP 限流由调用方处理；此处只限制单个邮箱。
  const recentForEmail = await prisma.accountRequest.count({
    where: {
      email: normalized,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recentForEmail >= 3) {
    return { ok: true };
  }

  // 停用账号可重新申请；审核通过后只通知原邮箱。
  const existingUser = await prisma.user.findUnique({ where: { email: normalized } });
  if (existingUser && !existingUser.disabled) {
    return { ok: true };
  }

  const pending = await findPendingRequest(normalized);
  if (pending && pending.status !== "UNVERIFIED") {
    return { ok: true };
  }

  const { token, hash } = createVerificationToken();
  const expiresAt = verificationExpiry();
  const note = message?.trim() || null;

  if (pending) {
    if (pending.kind === "STANDARD") {
      await prisma.accountRequest.update({
        where: { id: pending.id },
        data: {
          message: note,
          verificationTokenHash: hash,
          verificationExpiresAt: expiresAt,
        },
      });
    } else {
      // 已有另一条待验证申请，只重发原链接，不覆盖原类型与说明。
      await prisma.accountRequest.update({
        where: { id: pending.id },
        data: {
          verificationTokenHash: hash,
          verificationExpiresAt: expiresAt,
        },
      });
    }
  } else {
    await prisma.accountRequest.create({
      data: {
        email: normalized,
        message: note,
        kind: "STANDARD",
        status: "UNVERIFIED",
        verificationTokenHash: hash,
        verificationExpiresAt: expiresAt,
      },
    });
  }

  return sendVerificationEmail(normalized, token);
}

export async function submitInviteRequest({
  code,
  email,
  name,
}: {
  code: string;
  email: string;
  name: string;
}) {
  const normalized = email.trim().toLowerCase();

  // 邀请码验证必须先于邮箱分支，避免用无效邀请码探测账号。
  const invite = await prisma.inviteCode.findUnique({
    where: { code: code.trim() },
  });
  if (
    !invite ||
    (invite.expiresAt && invite.expiresAt < new Date()) ||
    invite.usedCount >= invite.maxUses
  ) {
    return { ok: false, error: "邀请码无效或已失效" };
  }
  if (!isMailConfigured()) {
    return { ok: false, error: "邮件服务未配置，暂时无法提交申请" };
  }

  const recentForEmail = await prisma.accountRequest.count({
    where: {
      email: normalized,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recentForEmail >= 3) {
    return { ok: true };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalized } });
  if (existingUser && !existingUser.disabled) {
    return { ok: true };
  }

  const pending = await findPendingRequest(normalized);
  if (pending && pending.status !== "UNVERIFIED") {
    return { ok: true };
  }

  const { token, hash } = createVerificationToken();
  const expiresAt = verificationExpiry();
  const displayName = name.trim();

  if (pending) {
    if (pending.kind === "INVITE") {
      await prisma.accountRequest.update({
        where: { id: pending.id },
        data: {
          message: displayName,
          inviteCodeId: invite.id,
          verificationTokenHash: hash,
          verificationExpiresAt: expiresAt,
        },
      });
    } else {
      // 已有普通申请在等待验证；保留原申请，只重发原链接。
      await prisma.accountRequest.update({
        where: { id: pending.id },
        data: {
          verificationTokenHash: hash,
          verificationExpiresAt: expiresAt,
        },
      });
    }
  } else {
    await prisma.accountRequest.create({
      data: {
        email: normalized,
        message: displayName,
        kind: "INVITE",
        status: "UNVERIFIED",
        inviteCodeId: invite.id,
        verificationTokenHash: hash,
        verificationExpiresAt: expiresAt,
      },
    });
  }

  return sendVerificationEmail(normalized, token);
}

export async function createInviteCode(expiresInDays = 7, maxUses = 1) {
  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  return prisma.inviteCode.create({
    data: { code, maxUses: Math.max(1, maxUses), expiresAt },
  });
}
