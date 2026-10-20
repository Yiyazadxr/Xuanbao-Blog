// hCaptcha 服务端校验；未配置时跳过验证。

type HCaptchaResponse = {
  success: boolean;
  "error-codes"?: string[];
  [key: string]: unknown;
};

export async function verifyHCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) return true;
  // 缺少站点密钥时前端不渲染控件，令牌无法获取；按未配置处理并记录错误，避免所有申请被永久拒绝。
  if (!process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY) {
    console.error("hCaptcha 配置不完整：缺少 NEXT_PUBLIC_HCAPTCHA_SITE_KEY，已跳过人机验证");
    return true;
  }
  if (!token) return false;

  try {
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as HCaptchaResponse;
    return data.success === true;
  } catch (e) {
    console.error("hCaptcha 校验请求失败：", e);
    return false;
  }
}
