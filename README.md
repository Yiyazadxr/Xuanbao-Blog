<div align="center">

# 暄宝xr 的博客

一个开箱即用的中文个人博客系统：Markdown 写作、邀请制注册、评论点赞收藏、站内通知、后台管理与数据看板，几条命令即可完整跑起来。

[![Stars](https://img.shields.io/github/stars/Yiyazadxr/Xuanbao-blog?style=flat-square)](https://github.com/Yiyazadxr/Xuanbao-blog/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)
[![Content: CC BY-NC-SA 4.0](https://img.shields.io/badge/Content-CC%20BY--NC--SA%204.0-lightgrey.svg?style=flat-square)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

[在线站点](https://xuanbao.vercel.app) · [提交 Issue](https://github.com/Yiyazadxr/Xuanbao-blog/issues) · [许可](#-许可)

</div>

---

## 功能特性

- **内容写作** 📝 — Markdown 编辑器、版本历史与回滚、置顶 / 精选 / 归档、批量操作
- **阅读体验** 📖 — 文章详情 ISR、目录导航与阅读进度、上下篇与系列导航、相关阅读、本地模糊搜索
- **互动体系** 💬 — 评论与审核、回复通知、点赞、收藏、分享
- **账号体系** 🔐 — Auth.js 邮箱密码登录、邀请码注册与申请审核、角色权限细分、禁言
- **站内通知** 🔔 — 新评论与申请通知管理员，评论通过通知作者，回复通过通知被回复者
- **后台看板** 📊 — 浏览量 / 评论 / 点赞 / 注册趋势、热门文章、分类分布，图表全部用 SVG 手绘，不依赖图表库
- **SEO 与订阅** 🌐 — sitemap、robots、OG 图，以及全站与按分类 / 标签 / 系列的 RSS
- **视觉与动效** 🎨 — 明暗主题、Lenis 平滑滚动、Canvas 水墨效果（远山 / 墨迹，无 3D 库）

## 快速开始

需要一个可用的 PostgreSQL（本地实例或 [Neon](https://neon.tech) 等托管服务）。

```bash
git clone https://github.com/Yiyazadxr/Xuanbao-blog.git
cd Xuanbao-blog

pnpm install                # 安装依赖（postinstall 会自动执行 prisma generate）
cp .env.example .env        # 复制模板，按注释填写，至少 DATABASE_URL 与 AUTH_SECRET
pnpm prisma migrate dev     # 初始化数据库结构
pnpm db:seed                # 填充种子数据：默认分类 + 示例文章 + 管理员账号
pnpm dev                    # 启动开发服务器 → http://localhost:3000
```

> [!TIP]
> 种子脚本使用 `.env` 中的 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 创建 `SUPER_ADMIN` 账号，登录后即可访问 `/admin`。

> [!IMPORTANT]
> 修改 `prisma/schema.prisma` 后必须执行 `pnpm prisma generate`。客户端输出到 `lib/generated/prisma`。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 开发服务器 |
| `pnpm build` / `pnpm start` | 生产构建 / 启动 |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm check` | lint + typecheck + test 全量校验 |
| `pnpm test` / `pnpm test:watch` | Vitest 单元测试（单次 / 监听） |
| `pnpm db:seed` | 重建种子数据 |
| `pnpm db:deploy` | 生产迁移（`prisma migrate deploy`） |
| `pnpm prisma studio` | 可视化查看 / 编辑数据库 |
| `pnpm tsx scripts/test-invites.ts` | 邀请码逻辑自测 |
| `pnpm tsx scripts/backfill-*.ts` | 历史数据回填（字数 / 搜索文本 / 摘要） |

## 技术栈

- **框架**：Next.js 16（App Router + Turbopack）+ React 19 + TypeScript
- **样式**：Tailwind CSS v4 + @tailwindcss/typography。主题色定义在 `app/globals.css`，经 `@theme inline` 映射为 Tailwind 颜色
- **动效**：framer-motion（LazyMotion + `m` 按需加载）+ Lenis 平滑滚动 + Canvas 水墨效果
- **数据**：Prisma 7 + PostgreSQL（兼容 Neon）+ `@prisma/adapter-pg`
- **认证**：Auth.js v5（邮箱密码 Credentials + JWT Session）
- **Markdown**：react-markdown + remark-gfm + rehype-highlight + rehype-slug；后台编辑器 @uiw/react-md-editor
- **搜索**：服务端分页检索标题、摘要与完整正文纯文本；首次输入后按需请求
- **图标**：@iconify/react + Phosphor（离线预注册，仅打包用到的图标）
- **其他**：zod 输入校验、hCaptcha 人机验证、Vercel Blob 图片存储、Vercel Analytics / Speed Insights

## 功能地图

<details>
<summary><b>公开页面</b></summary>

- `/` 首页：Hero、精选 / 最新文章、侧栏分类与标签
- `/blog` 文章列表：本地模糊搜索（索引按需拉取）、分页、归档入口
- `/blog/[slug]` 文章详情（ISR）：TOC、阅读进度、点赞 / 收藏 / 分享、上下篇与系列导航、评论区、相关阅读。浏览量和阅读记录由客户端上报
- `/blog/category/[slug]`、`/blog/tag/[slug]`、`/blog/series/[slug]`、`/blog/archive` 分类 / 标签 / 系列 / 归档
- `/bookmarks` 我的收藏、`/notifications` 站内通知中心、`/settings` 个人资料与显示偏好
- `/social`、`/tools`、`/about`、`/privacy`、`/terms` 内容与信息页
- `/feed.xml`（全站）及 `/feed.xml/category|tag|series/[slug]`、`/sitemap.xml`、`/robots.txt`、`/opengraph-image`

</details>

<details>
<summary><b>账号</b></summary>

- `/register`：支持提交申请和邀请码注册。申请审核通过后，登录凭据通过邮件发送
- `/login`：登录

</details>

<details>
<summary><b>后台 <code>/admin</code>（按角色权限细分）</b></summary>

- 仪表盘：近 N 天趋势、浏览量 / 评论 / 点赞 / 注册统计、热门文章、分类分布（SVG 图表）
- 文章 CRUD（Markdown 编辑器）、版本历史与回滚、置顶 / 精选 / 归档 / 批量操作
- 评论审核、账号申请与邀请码管理、分类 / 系列 / 标签管理
- 用户管理（含禁言）、角色权限管理

</details>

## 目录结构

```
.
├── app/
│   ├── (blog)/          公开页面：首页、文章、分类 / 标签 / 系列 / 归档
│   ├── (admin)/         后台：仪表盘、文章、评论、用户、权限
│   ├── (auth)/          登录、注册、申请
│   ├── api/             路由处理器（搜索索引、浏览量上报等）
│   └── **/actions.ts    Server Actions，按路由就近放置
├── components/
│   ├── ui/              通用组件
│   ├── admin/           后台组件，含 charts/（SVG 图表）
│   ├── layout/          Header / Footer / Sidebar / 通知铃
│   ├── blog/            文章卡片、列表、目录
│   ├── comments/        评论区
│   ├── notifications/   通知中心
│   └── settings/        个人设置
├── lib/                 数据层与纯工具：posts、comments、likes、bookmarks、
│                        reading、invites、notifications、stats、daily-stats、
│                        validation、rate-limit、permissions、mail、markdown …
├── prisma/              schema.prisma + migrations/ + seed.ts
├── scripts/             一次性脚本（回填、自测）
└── public/              静态资源；未配置 Blob 时图片写入 public/uploads
```

## 环境变量

<details>
<summary><b>展开完整变量表</b></summary>

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串（Neon 建议用 pooled 连接串） |
| `AUTH_SECRET` | Auth.js 密钥（`openssl rand -base64 32` 生成） |
| `AUTH_TRUST_HOST` | 生产环境默认关闭；自托管需要信任 Host 头时设为 `true` |
| `NEXT_PUBLIC_SITE_URL` | 正式域名，用于 sitemap / RSS / 元数据 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 种子脚本创建超级管理员 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | QQ 邮箱 SMTP，用于发放登录凭据的审核邮件（未配置则不发送） |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` / `HCAPTCHA_SECRET_KEY` | hCaptcha 人机验证（未配置则跳过验证） |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 图片存储；生产环境上传封面或头像时必须配置 |

</details>

> [!WARNING]
> 带 `NEXT_PUBLIC_` 前缀的值会打进前端产物，**切勿用于密钥**。

## 内容配置

| 想改什么 | 改哪里 |
| --- | --- |
| 站名 / 简介 / 建站日 | `lib/constants.ts` 中的 `SITE` |
| 正式域名 | 环境变量 `NEXT_PUBLIC_SITE_URL` |
| 主色调 | `app/globals.css` 顶部的 CSS 变量 |
| 社交链接 / 友链 / 工具 / 技能 / 时间线 | `lib/constants.ts` |

## 部署

**Vercel**

1. 创建 PostgreSQL（如 [Neon](https://neon.tech)），并将 `DATABASE_URL` 设为 pooled 连接串。
2. 导入本仓库。构建命令使用 `vercel-build`，即 `prisma migrate deploy && next build`。
3. 配置 `AUTH_SECRET`，并将 `NEXT_PUBLIC_SITE_URL` 设为正式域名。
4. 运行种子脚本前配置 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD`。
5. 生产环境需要上传封面或头像时，创建 Blob Store。Vercel 会注入 `BLOB_READ_WRITE_TOKEN`。
6. 需要发送审核邮件时配置 SMTP。需要启用人机验证时同时配置 hCaptcha 的 Site Key 和 Secret Key；未配置时会跳过验证。

**自托管**：构建后 `pnpm start` 即可，记得设置 `AUTH_TRUST_HOST=true`。

## 许可

本项目对代码与内容采用不同的授权方式，完整说明见 [LICENSE](./LICENSE) 与 [NOTICE](./NOTICE)。

- **源代码**：[MIT](./LICENSE) © 2026-present Yiyazadr。可使用、修改、商用和再分发；须保留版权与许可声明。
- **文章与图片等内容**：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)。须署名，仅限非商业使用，并以相同方式共享；**商业使用须事先取得授权**。
- **品牌名称与标识**（「暄宝xr」「Xuanbao」「Xuanbao.dev」及 Logo）：不在开源许可范围内，**不得用作品牌名称或暗示背书**。
- **第三方资源**：字体（Space Grotesk、Geist Mono，SIL OFL 1.1）、图标（Phosphor，MIT）与各依赖的许可信息见 [NOTICE](./NOTICE)。

## 致谢

- [Next.js](https://nextjs.org) 与 [Vercel](https://vercel.com)
- [Prisma](https://www.prisma.io) + [PostgreSQL](https://www.postgresql.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Phosphor Icons](https://phosphoricons.com)
- [Iconify](https://iconify.design)

## 联系

商用授权或其他授权事宜请联系：412110785@qq.com · [GitHub](https://github.com/Yiyazadxr)
