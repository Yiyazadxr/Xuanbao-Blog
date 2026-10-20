import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyHCaptcha } from "./hcaptcha";

describe("hCaptcha 校验", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("HCAPTCHA_SECRET_KEY", "secret");
    vi.stubEnv("NEXT_PUBLIC_HCAPTCHA_SITE_KEY", "site-key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("未配置密钥时放行", async () => {
    vi.stubEnv("HCAPTCHA_SECRET_KEY", "");
    await expect(verifyHCaptcha("")).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("缺少站点密钥时按未配置放行，避免申请被永久拒绝", async () => {
    vi.stubEnv("NEXT_PUBLIC_HCAPTCHA_SITE_KEY", "");
    await expect(verifyHCaptcha("")).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("配置完整但缺少令牌时拒绝", async () => {
    await expect(verifyHCaptcha("")).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("校验通过时放行", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await expect(verifyHCaptcha("token")).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("校验失败或请求异常时拒绝", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await expect(verifyHCaptcha("token")).resolves.toBe(false);

    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    await expect(verifyHCaptcha("token")).resolves.toBe(false);
  });
});
