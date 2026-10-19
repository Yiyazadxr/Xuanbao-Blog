import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  user: vi.fn(),
  pending: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  invite: vi.fn(),
  notify: vi.fn(),
  transaction: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.user },
    accountRequest: {
      count: mocks.count,
      findFirst: mocks.pending,
      create: mocks.create,
      update: mocks.update,
    },
    inviteCode: { findUnique: mocks.invite },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/notifications", () => ({ notifyAdmins: mocks.notify }));
vi.mock("@/lib/mail", () => ({
  isMailConfigured: () => true,
  sendMail: mocks.sendMail,
  buildVerificationEmail: () => ({ subject: "验证邮箱", text: "验证链接" }),
  buildApprovalEmail: () => ({ subject: "已通过", text: "已激活" }),
}));
vi.mock("bcryptjs", () => ({ default: { hash: async () => "hash" } }));

import { submitAccountRequest, submitInviteRequest } from "./invites";

describe("申请入口防邮箱枚举", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.count.mockResolvedValue(0);
    mocks.user.mockResolvedValue(null);
    mocks.pending.mockResolvedValue(null);
    mocks.invite.mockResolvedValue({ id: "i1", usedCount: 0, maxUses: 1 });
    mocks.sendMail.mockResolvedValue(true);
  });

  it.each(["registered", "pending", "limited", "new"])(
    "普通申请 %s 返回相同状态",
    async (state) => {
      if (state === "registered") mocks.user.mockResolvedValue({ disabled: false });
      if (state === "pending") {
        mocks.pending.mockResolvedValue({ id: "r1", status: "PENDING", kind: "STANDARD" });
      }
      if (state === "limited") mocks.count.mockResolvedValue(3);
      expect(await submitAccountRequest("test@example.com")).toEqual({
        ok: true,
      });
      if (state !== "new") {
        expect(mocks.create).not.toHaveBeenCalled();
        expect(mocks.notify).not.toHaveBeenCalled();
      }
    }
  );

  it("普通申请先进入未验证状态并发送验证邮件", async () => {
    expect(await submitAccountRequest("test@example.com", "想加入")).toEqual({
      ok: true,
    });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "test@example.com",
        message: "想加入",
        kind: "STANDARD",
        status: "UNVERIFIED",
      }),
    });
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("无效邀请码在读取邮箱状态前拒绝", async () => {
    mocks.invite.mockResolvedValue(null);
    expect(
      await submitInviteRequest({
        code: "invalid",
        email: "test@example.com",
        name: "Test",
      })
    ).toEqual({ ok: false, error: "邀请码无效或已失效" });
    expect(mocks.user).not.toHaveBeenCalled();
  });

  it("已注册邮箱持有效邀请码返回统一成功且不消耗配额", async () => {
    mocks.user.mockResolvedValue({ disabled: false });
    expect(
      await submitInviteRequest({
        code: "valid",
        email: "test@example.com",
        name: "Test",
      })
    ).toEqual({ ok: true });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("邀请码申请在验证前不建号、不消耗次数", async () => {
    expect(
      await submitInviteRequest({
        code: "valid",
        email: "test@example.com",
        name: "Test",
      })
    ).toEqual({ ok: true });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "test@example.com",
        message: "Test",
        kind: "INVITE",
        status: "UNVERIFIED",
        inviteCodeId: "i1",
      }),
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
});
