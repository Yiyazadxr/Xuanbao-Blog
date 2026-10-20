import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findRequest: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
  findUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  findInvite: vi.fn(),
  useInvite: vi.fn(),
  transaction: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    accountRequest: {
      findUnique: mocks.findRequest,
      updateMany: mocks.updateMany,
      update: mocks.update,
    },
    user: {
      findUnique: mocks.findUser,
      create: mocks.createUser,
      update: mocks.updateUser,
    },
    inviteCode: {
      findUnique: mocks.findInvite,
      updateMany: mocks.useInvite,
    },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/notifications", () => ({ notifyAdmins: mocks.notify }));
vi.mock("bcryptjs", () => ({ default: { hash: async () => "hashed-password" } }));

import {
  createVerificationToken,
  getVerificationTarget,
  hashToken,
  verifyAccountRequest,
} from "./account-verification";

const future = new Date(Date.now() + 60 * 60 * 1000);
const past = new Date(Date.now() - 60 * 1000);

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    email: "test@example.com",
    message: "Test",
    kind: "STANDARD",
    status: "UNVERIFIED",
    inviteCodeId: null,
    verificationExpiresAt: future,
    ...overrides,
  };
}

describe("邮箱验证", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const tx = {
      accountRequest: { updateMany: mocks.updateMany, update: mocks.update },
      user: {
        findUnique: mocks.findUser,
        create: mocks.createUser,
        update: mocks.updateUser,
      },
      inviteCode: {
        findUnique: mocks.findInvite,
        updateMany: mocks.useInvite,
      },
    };
    mocks.transaction.mockImplementation(async (cb: (client: typeof tx) => unknown) =>
      cb(tx)
    );
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.update.mockResolvedValue({});
    mocks.createUser.mockResolvedValue({});
    mocks.updateUser.mockResolvedValue({});
    mocks.useInvite.mockResolvedValue({ count: 1 });
    mocks.notify.mockResolvedValue(undefined);
    mocks.findUser.mockResolvedValue(null);
  });

  it("令牌哈希稳定且每次生成不同", () => {
    const a = createVerificationToken();
    const b = createVerificationToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(hashToken(a.token));
    expect(a.hash).toHaveLength(64);
  });

  it("普通申请验证后进入审核并保存密码哈希", async () => {
    mocks.findRequest.mockResolvedValue(request());
    await expect(verifyAccountRequest("token", "password123")).resolves.toEqual({
      ok: true,
    });
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          passwordHash: "hashed-password",
        }),
      })
    );
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });

  it("邀请码申请验证时才建号并消耗次数", async () => {
    mocks.findRequest.mockResolvedValue(
      request({ kind: "INVITE", inviteCodeId: "i1", message: "测试用户" })
    );
    mocks.findInvite.mockResolvedValue({
      id: "i1",
      usedCount: 0,
      maxUses: 1,
      expiresAt: future,
    });
    await expect(verifyAccountRequest("token", "password123")).resolves.toEqual({
      ok: true,
    });
    expect(mocks.useInvite).toHaveBeenCalledTimes(1);
    expect(mocks.createUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "test@example.com",
        name: "测试用户",
        password: "hashed-password",
        activatedAt: null,
        inviteCodeId: "i1",
      }),
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: null } })
    );
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });

  it("无效令牌不进入事务", async () => {
    mocks.findRequest.mockResolvedValue(null);
    await expect(verifyAccountRequest("token", "password123")).resolves.toEqual({
      ok: false,
      reason: "invalid-link",
      error: "链接无效或已过期",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("过期令牌被清除", async () => {
    mocks.findRequest.mockResolvedValue(request({ verificationExpiresAt: past }));
    await expect(verifyAccountRequest("token", "password123")).resolves.toEqual({
      ok: false,
      reason: "expired",
      error: "链接已过期，请重新提交申请",
    });
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { verificationTokenHash: null, verificationExpiresAt: null },
      })
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("验证页只读取目标邮箱", async () => {
    mocks.findRequest.mockResolvedValue(request());
    await expect(getVerificationTarget("token")).resolves.toEqual({
      email: "test@example.com",
    });
  });

  it("令牌被抢占时拒绝重复验证且不建号", async () => {
    mocks.findRequest.mockResolvedValue(request());
    mocks.updateMany.mockResolvedValue({ count: 0 });
    await expect(verifyAccountRequest("token", "password123")).resolves.toEqual({
      ok: false,
      reason: "used",
      error: "链接已使用，请勿重复验证",
    });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("邮箱已有可用账号时把申请置为已拒绝", async () => {
    mocks.findRequest.mockResolvedValue(request());
    mocks.findUser.mockResolvedValue({ id: "u1", role: "MEMBER", disabled: false });
    await expect(verifyAccountRequest("token", "password123")).resolves.toEqual({
      ok: false,
      reason: "account-exists",
      error: "该邮箱已有可用账号，请直接登录",
    });
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJECTED", verificationTokenHash: null }),
      })
    );
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("邀请码已用尽时拒绝并回滚申请", async () => {
    mocks.findRequest.mockResolvedValue(
      request({ kind: "INVITE", inviteCodeId: "i1" })
    );
    mocks.findInvite.mockResolvedValue({
      id: "i1",
      usedCount: 1,
      maxUses: 1,
      expiresAt: future,
    });
    await expect(verifyAccountRequest("token", "password123")).resolves.toEqual({
      ok: false,
      reason: "invite-invalid",
      error: "邀请码无效或已失效，请重新申请",
    });
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJECTED" }),
      })
    );
    expect(mocks.useInvite).not.toHaveBeenCalled();
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("事务故障只返回可重试代码，不暴露异常", async () => {
    mocks.findRequest.mockResolvedValue(request());
    mocks.transaction.mockRejectedValue(new Error("database secret"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(verifyAccountRequest("token", "password123")).resolves.toEqual({
        ok: false,
        reason: "retry",
        error: "验证失败，请稍后重试",
      });
    } finally {
      log.mockRestore();
    }
  });
});
