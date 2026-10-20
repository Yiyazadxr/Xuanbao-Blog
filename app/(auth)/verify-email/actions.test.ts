import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock("@/lib/account-verification", () => ({ verifyAccountRequest: mocks.verify }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
}));

import { verifyEmailAction } from "./actions";

function form(token = "token") {
  const data = new FormData();
  data.set("token", token);
  data.set("password", "password123");
  data.set("confirmPassword", "password123");
  return data;
}

beforeEach(() => vi.resetAllMocks());

describe("验证结果跳转", () => {
  it.each([
    ["expired", "/verify-email?status=error&reason=expired"],
    ["invite-invalid", "/verify-email?status=error&reason=invite-invalid"],
    ["account-exists", "/verify-email?status=error&reason=account-exists"],
    ["used", "/verify-email?status=error&reason=used"],
  ])("%s 不将令牌或错误正文放入 URL", async (reason, url) => {
    mocks.verify.mockResolvedValue({ ok: false, reason, error: "不应出现在 URL 中" });
    await expect(verifyEmailAction(form())).rejects.toThrow(`REDIRECT:${url}`);
  });

  it("临时故障保留令牌供重新尝试", async () => {
    mocks.verify.mockResolvedValue({ ok: false, reason: "retry", error: "验证失败" });
    await expect(verifyEmailAction(form("a+b"))).rejects.toThrow(
      "REDIRECT:/verify-email?token=a%2Bb&status=error&reason=retry"
    );
  });

  it("成功验证跳转至成功页", async () => {
    mocks.verify.mockResolvedValue({ ok: true });
    await expect(verifyEmailAction(form())).rejects.toThrow("REDIRECT:/verify-email?status=success");
  });
});
