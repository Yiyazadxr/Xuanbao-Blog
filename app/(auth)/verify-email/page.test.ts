import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getTarget: vi.fn() }));
vi.mock("@/lib/account-verification", () => ({ getVerificationTarget: mocks.getTarget }));
vi.mock("./actions", () => ({ verifyEmailAction: vi.fn() }));

import VerifyEmailPage from "./page";

async function render(status: string, reason: string, token?: string) {
  const page = await VerifyEmailPage({ searchParams: Promise.resolve({ status, reason, token }) });
  return renderToStaticMarkup(page);
}

describe("验证失败页", () => {
  it.each([
    ["expired", "验证链接已过期", "重新申请"],
    ["invite-invalid", "邀请码已失效", "重新申请"],
    ["account-exists", "该邮箱已有账号", "前往登录"],
    ["used", "链接已使用", "返回首页"],
  ])("%s 展示对应提示与操作", async (reason, title, action) => {
    const html = await render("error", reason);
    expect(html).toContain(title);
    expect(html).toContain(action);
    expect(mocks.getTarget).not.toHaveBeenCalled();
  });

  it("临时故障保留重试入口，不误报链接失效", async () => {
    const html = await render("error", "retry", "a+b");
    expect(html).toContain("验证暂时失败");
    expect(html).toContain("重试验证");
    expect(html).toContain("/verify-email?token=a%2Bb");
    expect(html).not.toContain("链接无效或已过期");
  });

  it("未知原因或缺少重试令牌使用安全兜底", async () => {
    expect(await render("error", "unknown")).toContain("链接无效或已过期");
    expect(await render("error", "retry")).toContain("链接无效或已过期");
  });
});
