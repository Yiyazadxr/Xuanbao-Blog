// hCaptcha 服务端校验；未配置时跳过验证。

type HCaptchaResponse = {
  success: boolean;
  "error-codes"?: string[];
  [key: string]: unknown;
};

export async function verifyHCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) return true;
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
