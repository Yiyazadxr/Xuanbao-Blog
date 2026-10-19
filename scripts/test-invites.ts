// 邮箱验证与邀请码领取自测；运行后清理本次创建的数据。
// 运行：npx tsx scripts/test-invites.ts
import "dotenv/config";
import {
  createVerificationToken,
  verifyAccountRequest,
} from "../lib/account-verification";
import { createInviteCode } from "../lib/invites";
import { prisma } from "../lib/prisma";

const APPLY_EMAIL = "verify-test@example.com";
const INVITE_EMAIL = "invite-test@example.com";
const EXPIRED_EMAIL = "expired-test@example.com";
const TEST_EMAILS = [APPLY_EMAIL, INVITE_EMAIL, EXPIRED_EMAIL];
const createdInviteIds: string[] = [];

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } });
  await prisma.accountRequest.deleteMany({ where: { email: { in: TEST_EMAILS } } });
  await prisma.notification.deleteMany({
    where: {
      title: { in: TEST_EMAILS.map((email) => `新账号申请：${email}`) },
    },
  });
  if (createdInviteIds.length > 0) {
    await prisma.inviteCode.deleteMany({ where: { id: { in: createdInviteIds } } });
  }
}

function assert(name: string, cond: boolean) {
  console.log(`${cond ? "✔" : "✘"} ${name}`);
  if (!cond) process.exitCode = 1;
}

async function createUnverifiedRequest({
  email,
  kind,
  message,
  inviteCodeId,
  expiresAt,
}: {
  email: string;
  kind: "STANDARD" | "INVITE";
  message?: string;
  inviteCodeId?: string;
  expiresAt: Date;
}) {
  const token = createVerificationToken();
  const request = await prisma.accountRequest.create({
    data: {
      email,
      message,
      kind,
      status: "UNVERIFIED",
      inviteCodeId,
      verificationTokenHash: token.hash,
      verificationExpiresAt: expiresAt,
    },
  });
  return { request, token: token.token };
}

async function main() {
  await cleanup();

  // 普通申请：验证后只进入审核，不提前建号。
  const apply = await createUnverifiedRequest({
    email: APPLY_EMAIL,
    kind: "STANDARD",
    message: "自测申请",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  const applyVerify = await verifyAccountRequest(apply.token, "password123");
  assert("普通申请验证成功", applyVerify.ok === true);
  const applyAfter = await prisma.accountRequest.findUnique({
    where: { id: apply.request.id },
  });
  assert(
    "验证后进入待审核",
    applyAfter?.status === "PENDING" && Boolean(applyAfter.emailVerifiedAt)
  );
  assert(
    "普通申请验证后不提前建号",
    (await prisma.user.findUnique({ where: { email: APPLY_EMAIL } })) === null
  );
  assert(
    "普通申请保留密码哈希",
    Boolean(applyAfter?.passwordHash) && applyAfter?.passwordHash !== "password123"
  );

  // 邀请码：验证时才消耗次数并预建待激活账号。
  const invite = await createInviteCode(7, 1);
  createdInviteIds.push(invite.id);
  const inviteApply = await createUnverifiedRequest({
    email: INVITE_EMAIL,
    kind: "INVITE",
    message: "测试用户",
    inviteCodeId: invite.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  const inviteVerify = await verifyAccountRequest(inviteApply.token, "password123");
  assert("邀请码申请验证成功", inviteVerify.ok === true);
  const user = await prisma.user.findUnique({ where: { email: INVITE_EMAIL } });
  assert(
    "邀请码路径建号待激活",
    user?.activatedAt === null && user?.inviteCodeId === invite.id
  );
  const inviteAfter = await prisma.inviteCode.findUnique({ where: { id: invite.id } });
  assert("邀请码已消耗 1 次", inviteAfter?.usedCount === 1);
  const inviteReqAfter = await prisma.accountRequest.findUnique({
    where: { id: inviteApply.request.id },
  });
  assert("邀请码申请已进入待审核", inviteReqAfter?.status === "PENDING");
  assert("邀请码申请不再保留密码哈希", inviteReqAfter?.passwordHash === null);

  // 同一令牌只能使用一次。
  const reuse = await verifyAccountRequest(inviteApply.token, "password123");
  assert("验证链接只能使用一次", reuse.ok === false);

  // 过期链接被拒，并清除令牌。
  const expired = await createUnverifiedRequest({
    email: EXPIRED_EMAIL,
    kind: "STANDARD",
    expiresAt: new Date(Date.now() - 60 * 1000),
  });
  const expiredResult = await verifyAccountRequest(expired.token, "password123");
  assert("过期链接被拒", expiredResult.ok === false);
  const expiredAfter = await prisma.accountRequest.findUnique({
    where: { id: expired.request.id },
  });
  assert("过期后清除验证令牌", expiredAfter?.verificationTokenHash === null);

  await cleanup();
  console.log("\n自测完成");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
