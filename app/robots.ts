import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 私有页对匿名用户会重定向，禁止抓取以避免无效抓取与软 404。
      disallow: ["/admin", "/api", "/login", "/register", "/settings", "/notifications", "/bookmarks"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
