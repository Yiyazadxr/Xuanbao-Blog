// 邮件仅用于注册流程（邮箱验证与审核通知）；未配置或发送失败时返回 false。
import nodemailer from "nodemailer";
import { SITE } from "@/lib/constants";

const SITE_URL = SITE.url.replace(/\/$/, "");

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!isMailConfigured() || !SMTP_USER || !SMTP_PASS) {
    // 邮件正文不写入日志，避免验证链接或账号信息进入日志。
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[邮件未发送] SMTP 未配置，收件人：${to}，主题：${subject}`);
    }
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST || "smtp.qq.com",
    port: Number(SMTP_PORT) || 465,
    secure: true, // QQ 邮箱 465 端口走 SSL
    auth: { user: SMTP_USER, pass: SMTP_PASS }, // pass 是 QQ 邮箱授权码
  });

  await transporter.sendMail({
    from: `"${SITE.name}" <${SMTP_USER}>`,
    to,
    subject,
    text,
  });
  return true;
}

// 申请提交后发送验证链接；验证通过才进入审核队列。
export function buildVerificationEmail({
  token,
  expiresHours,
}: {
  token: string;
  expiresHours: number;
}): { subject: string; text: string } {
  const verifyUrl = `${SITE_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    subject: `【${SITE.name}】请验证你的邮箱`,
    text: [
      `你正在申请 ${SITE.name} 的账号。请打开下面的链接验证邮箱并设置登录密码：`,
      "",
      verifyUrl,
      "",
      `链接 ${expiresHours} 小时内有效。验证后申请会进入管理员审核。`,
      "如果这不是你本人操作，请忽略这封邮件。",
    ].join("\n"),
  };
}

// 审核通过只通知账号已激活，不发送任何密码。
export function buildApprovalEmail({
  email,
  graceDays,
}: {
  email: string;
  graceDays: number;
}): { subject: string; text: string } {
  return {
    subject: `【${SITE.name}】你的账号申请已通过`,
    text: [
      "你的账号申请已通过，账号已激活。",
      "",
      `登录邮箱：${email}`,
      "请使用验证邮箱时设置的密码登录。",
      "",
      `请在 ${graceDays} 天内登录并尽快修改密码。逾期未登录，账号将被收回。`,
      "",
      `登录入口：${SITE_URL}/login`,
      "",
      `这封邮件来自 ${SITE.name} 的账号申请。如非本人操作，请忽略。`,
    ].join("\n"),
  };
}
