import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 私有页会对匿名用户重定向，禁止抓取，避免无效请求与软 404。
      disallow: ["/admin", "/api", "/login", "/register", "/settings", "/notifications", "/bookmarks"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
