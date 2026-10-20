import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  findRequest: vi.fn(),
  updateRequest: vi.fn(),
  updateManyRequest: vi.fn(),
  findUser: vi.fn(),
  findUserFirst: vi.fn(),
  updateUser: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  findInvite: vi.fn(),
  updateInvite: vi.fn(),
  transaction: vi.fn(),
  sendMail: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/lib/mail", () => ({
  isMailConfigured: () => true,
  sendMail: mocks.sendMail,
  buildApprovalEmail: () => ({ subject: "已通过", text: "账号已激活" }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    accountRequest: {
      findUnique: mocks.findRequest,
      update: mocks.updateRequest,
      updateMany: mocks.updateManyRequest,
    },
    user: {
      findUnique: mocks.findUser,
      findFirst: mocks.findUserFirst,
      update: mocks.updateUser,
      create: mocks.createUser,
      delete: mocks.deleteUser,
    },
    inviteCode: { findUnique: mocks.findInvite, updateMany: mocks.updateInvite },
    $transaction: mocks.transaction,
  },
}));

import { approveRequest, rejectRequest } from "./actions";

const request = {
  id: "r1",
  email: "test@example.com",
  kind: "STANDARD",
  status: "PENDING",
  emailVerifiedAt: new Date(),
  passwordHash: "hash",
  message: null,
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue({ id: "admin", role: "ADMIN" });
  mocks.findRequest.mockResolvedValue(request);
  mocks.updateManyRequest.mockResolvedValue({ count: 1 });
  mocks.findUser.mockResolvedValue(null);
  mocks.sendMail.mockResolvedValue(true);
  mocks.createUser.mockResolvedValue({ id: "u1" });
  mocks.updateUser.mockResolvedValue({ id: "u1" });
  mocks.updateInvite.mockResolvedValue({ count: 1 });
  mocks.findInvite.mockResolvedValue({ id: "i1", usedCount: 0, maxUses: 1, expiresAt: new Date(Date.now() + 86_400_000) });
  mocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      accountRequest: { updateMany: mocks.updateManyRequest, update: mocks.updateRequest },
      user: {
        findUnique: mocks.findUser,
        findFirst: mocks.findUserFirst,
        update: mocks.updateUser,
        create: mocks.createUser,
        delete: mocks.deleteUser,
      },
      inviteCode: { findUnique: mocks.findInvite, updateMany: mocks.updateInvite },
    })
  );
});

describe("账号申请审批", () => {
  it("抢占失败时不发信也不建号", async () => {
    mocks.updateManyRequest.mockResolvedValue({ count: 0 });
    const result = await approveRequest("r1");
    expect(result.ok).toBe(false);
    expect(mocks.sendMail).not.toHaveBeenCalled();
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("未验证邮箱的申请不能通过", async () => {
    mocks.findRequest.mockResolvedValue({ ...request, emailVerifiedAt: null });
    const result = await approveRequest("r1");
    expect(result.ok).toBe(false);
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("先落库再发信：账号已激活后才发送通知邮件", async () => {
    const order: string[] = [];
    mocks.createUser.mockImplementation(async () => {
      order.push("create");
      return { id: "u1" };
    });
    mocks.sendMail.mockImplementation(async () => {
      order.push("mail");
      return true;
    });
    const result = await approveRequest("r1");
    expect(result.ok).toBe(true);
    expect(order).toEqual(["create", "mail"]);
  });

  it("事务失败时释放处理中状态并给出错误", async () => {
    mocks.transaction.mockImplementation(async () => {
      throw new Error("REQUEST_TAKEN");
    });
    const result = await approveRequest("r1");
    expect(result.ok).toBe(false);
    expect(mocks.updateManyRequest).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "PENDING" } })
    );
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("通知邮件发送失败时不回滚已激活的账号", async () => {
    mocks.sendMail.mockResolvedValue(false);
    const result = await approveRequest("r1");
    expect(result.ok).toBe(true);
    expect(result.message).toContain("手动通知");
  });
});

describe("申请拒绝", () => {
  it("已处理的申请不能重复拒绝", async () => {
    mocks.findRequest.mockResolvedValue({ ...request, status: "APPROVED" });
    const result = await rejectRequest("r1");
    expect(result.ok).toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("拒绝邀请码申请时回退使用次数并删除预建账号", async () => {
    mocks.findRequest.mockResolvedValue({ ...request, kind: "INVITE", emailVerifiedAt: null });
    mocks.findUserFirst.mockResolvedValue({
      id: "u1",
      inviteCodeId: "i1",
      role: "MEMBER",
      activatedAt: null,
      _count: { posts: 0, comments: 0 },
    });
    const result = await rejectRequest("r1");
    expect(result.ok).toBe(true);
    expect(mocks.updateInvite).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usedCount: { decrement: 1 } } })
    );
    expect(mocks.deleteUser).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("预建账号有历史内容时改为停用，不做物理删除", async () => {
    mocks.findRequest.mockResolvedValue({ ...request, kind: "INVITE", emailVerifiedAt: null });
    mocks.findUserFirst.mockResolvedValue({
      id: "u1",
      inviteCodeId: "i1",
      role: "MEMBER",
      activatedAt: null,
      _count: { posts: 2, comments: 0 },
    });
    const result = await rejectRequest("r1");
    expect(result.ok).toBe(true);
    expect(mocks.updateUser).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { disabled: true },
    });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
