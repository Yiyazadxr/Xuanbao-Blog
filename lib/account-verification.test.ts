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
      error: "链接无效或已过期",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("过期令牌被清除", async () => {
    mocks.findRequest.mockResolvedValue(request({ verificationExpiresAt: past }));
    await expect(verifyAccountRequest("token", "password123")).resolves.toEqual({
      ok: false,
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
});
