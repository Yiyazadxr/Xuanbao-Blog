import { describe, expect, it } from "vitest";

import { buildApprovalEmail, buildVerificationEmail } from "./mail";

// 邮件只用于通知与验证链接：正文里不出现任何密码值或哈希。
describe("邮件内容", () => {
  it("验证邮件包含验证链接且不含密码值", () => {
    const { text, subject } = buildVerificationEmail({ token: "tok en", expiresHours: 24 });
    expect(subject).toContain("验证");
    expect(text).toContain("/verify-email?token=tok%20en");
    expect(text).not.toMatch(/\$2[aby]\$/);
    expect(text).not.toMatch(/密码[：:][ \t]*\S/);
  });

  it("激活通知只说明账号已激活，不含密码值", () => {
    const { text } = buildApprovalEmail({ email: "test@example.com", graceDays: 7 });
    expect(text).toContain("test@example.com");
    expect(text).toContain("已激活");
    expect(text).not.toMatch(/\$2[aby]\$/);
    expect(text).not.toMatch(/密码[：:][ \t]*\S/);
  });
});
