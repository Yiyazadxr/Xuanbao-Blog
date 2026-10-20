import { NextResponse } from "next/server";
import { getFreshUser } from "@/lib/auth";
import { SITE } from "@/lib/constants";
import { incrementViewCount } from "@/lib/posts";
import { recordRead } from "@/lib/reading";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { parseInput, postViewSchema } from "@/lib/validation";
import { createHash } from "node:crypto";

// ISR 页面在客户端上报浏览；同一 SPA 会话去重，失败不影响页面。
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // 浏览量不需要跨站上报。拒绝浏览器跨站请求，但不把 Origin 当作反机器人凭据。
  // 基准同时接受请求域名与配置的公开域名：反代或预发布域名下 request.url 的 origin 可能不同。
  const origin = req.headers.get("origin");
  const allowedOrigins = new Set([new URL(req.url).origin, new URL(SITE.url).origin]);
  if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && !allowedOrigins.has(origin))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  // 流式限制实际字节数，不能仅信任 Content-Length。
  const reader = req.body?.getReader();
  if (!reader) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
      }
      chunks.push(value);
    }
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { body = null; }
  const parsed = parseInput(postViewSchema, body);
  if (!parsed.data) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { slug } = await params;
  if (!slug || slug.length > 200) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const user = await getFreshUser();
  const ip = await getClientIp();
  // 无可信地址时仅允许已登录用户记录阅读，不查询匿名文章或写浏览量。
  if (ip === "unknown" && !user) return NextResponse.json({ ok: true });
  const key = ip === "unknown" ? null : createHash("sha256").update(ip).digest("hex");
  const pre = key ? await rateLimit.isBlocked("view-ip", key, 30) : null;
  const check = key ? pre!.blocked ? pre : await rateLimit.checkAndHit("view-ip", key, 30, 60_000) : null;
  // 匿名超限请求仍在文章查询前返回。
  if (check?.blocked && !user) return rateLimited(check.retryAfterSec);

  const post = await prisma.post.findFirst({
    where: { id: parsed.data.postId, slug, published: true, archived: false },
    select: { id: true, wordCount: true },
  });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // 阅读记录按用户去重，不应受共享 IP 的浏览量限流和去重影响。
  await recordRead(post.id, user?.id, post.wordCount);
  if (check?.blocked) return rateLimited(check.retryAfterSec);
  if (!key) return NextResponse.json({ ok: true });
  const dedupKey = `${key}:${post.id}`;
  const seen = await rateLimit.isBlocked("view-post", dedupKey, 0);
  if (seen.blocked) return NextResponse.json({ ok: true });
  const claimed = await rateLimit.checkAndHit("view-post", dedupKey, 1, 30 * 60_000);
  if (claimed.blocked) return NextResponse.json({ ok: true });
  if (!(await incrementViewCount(post.id))) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: true });
}

function rateLimited(retryAfterSec: number) {
  return NextResponse.json({ error: "rate_limited" }, {
    status: 429, headers: { "Retry-After": String(retryAfterSec) },
  });
}
