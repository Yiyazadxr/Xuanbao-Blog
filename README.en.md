<div align="center">

# Xuanbao's Blog

[简体中文](./README.md) · **English**

A Chinese-language personal blog system: Markdown authoring, invite-only registration, comments, likes and bookmarks, in-app notifications, and an admin dashboard with analytics — up and running in a few commands.

[![Stars](https://img.shields.io/github/stars/Yiyazadxr/Xuanbao-blog?style=flat-square)](https://github.com/Yiyazadxr/Xuanbao-blog/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)
[![Content: CC BY-NC-SA 4.0](https://img.shields.io/badge/Content-CC%20BY--NC--SA%204.0-lightgrey.svg?style=flat-square)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

[Live site](https://xuanbao.vercel.app) · [Issues](https://github.com/Yiyazadxr/Xuanbao-blog/issues) · [Contributing](./CONTRIBUTING.md) · [Code of Conduct](./CODE_OF_CONDUCT.md) · [Security](./SECURITY.md) · [License](#license)

</div>

---

## Features

- **Authoring** 📝 — Markdown editor, revision history and rollback, pinned / featured / archived flags, batch actions
- **Reading** 📖 — ISR post pages, table of contents and reading progress, previous / next and series navigation, related posts, keyword search over title, excerpt and post text (server-side, paged, fetched on demand) with search history
- **Engagement** 💬 — comments and moderation, reply notifications, likes, bookmarks, sharing
- **Accounts** 🔐 — Auth.js email and password login, invite-code registration and application review, fine-grained role permissions, muting
- **Notifications** 🔔 — admins are notified of new comments and applications; authors are notified when their comment is approved; repliers are notified when a reply is approved
- **Dashboard** 📊 — views / comments / likes / sign-ups trends, popular posts, category breakdown; every chart is hand-drawn SVG with no chart library
- **SEO and feeds** 🌐 — sitemap, robots, OG images, plus site-wide and per-category / tag / series RSS
- **Look and motion** 🎨 — light and dark themes, Lenis smooth scrolling, Canvas effects (hero starfield, ink-wash mountains, archive star map; drawn in 2D with no 3D library)

## Getting started

You need a working PostgreSQL instance (local or hosted, e.g. [Neon](https://neon.tech)).

```bash
git clone https://github.com/Yiyazadxr/Xuanbao-blog.git
cd Xuanbao-blog

pnpm install                # postinstall runs prisma generate automatically
cp .env.example .env        # copy the template, fill in at least DATABASE_URL and AUTH_SECRET
pnpm prisma migrate dev     # create the database schema
pnpm db:seed                # seed the database: default categories + sample posts + an admin account
pnpm dev                    # start the dev server → http://localhost:3000
```

> [!TIP]
> The seed script creates a `SUPER_ADMIN` account from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`; sign in with it to reach `/admin`.

> [!IMPORTANT]
> After changing `prisma/schema.prisma` you must run `pnpm prisma generate`. The client is generated into `lib/generated/prisma`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / start |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript type check |
| `pnpm check` | lint + typecheck + tests |
| `pnpm test` / `pnpm test:watch` | Vitest unit tests (once / watch) |
| `pnpm db:seed` | Re-seed the database |
| `pnpm db:deploy` | Production migrations (`prisma migrate deploy`) |
| `pnpm prisma studio` | Browse / edit the database |
| `pnpm tsx scripts/test-invites.ts` | Invite-code self-test |
| `pnpm tsx scripts/backfill-*.ts` | Backfill jobs (word counts / search text / excerpts) |

## Tech stack

- **Framework**: Next.js 16 (App Router + Turbopack) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + @tailwindcss/typography. Theme colors live in `app/globals.css` and are mapped to Tailwind colors via `@theme inline`
- **Motion**: framer-motion (LazyMotion + `m`, loaded on demand) + Lenis smooth scrolling + Canvas effects (starfield / ink / star map)
- **Data**: Prisma 7 + PostgreSQL (Neon-compatible) + `@prisma/adapter-pg`
- **Auth**: Auth.js v5 (Credentials email + password, JWT sessions)
- **Markdown**: react-markdown + remark-gfm + rehype-highlight + rehype-slug; admin editor @uiw/react-md-editor
- **Search**: server-side, paged keyword search over title, excerpt and full post text; requested on demand after the first keystroke, with search history kept locally; the public endpoint is rate-limited per IP
- **Icons**: @iconify/react + Phosphor (pre-registered offline; only the icons in use are bundled)
- **Other**: zod validation, hCaptcha, Vercel Blob image storage, Vercel Analytics / Speed Insights

## Feature map

<details>
<summary><b>Public pages</b></summary>

- `/` Home: hero, featured / latest posts, sidebar categories and tags
- `/blog` Post list: keyword search fetched on demand, search history, pagination, archive entry
- `/blog/[slug]` Post page (ISR): TOC, reading progress, like / bookmark / share, previous / next and series navigation, comments, related posts. Views and reading history are reported from the client
- `/blog/category/[slug]`, `/blog/tag/[slug]`, `/blog/series/[slug]`, `/blog/archive` Categories / tags / series / archive
- `/bookmarks` my bookmarks, `/notifications` notification center, `/settings` profile and display preferences
- `/reading` recent reading: progress is kept in this browser only
- `/social`, `/tools`, `/about`, `/privacy`, `/terms` content and information pages
- `/feed.xml` (site-wide) and `/feed.xml/category|tag|series/[slug]`, `/sitemap.xml`, `/robots.txt`, `/opengraph-image`

</details>

<details>
<summary><b>Accounts</b></summary>

- `/register`: submit an application or register with an invite code. Both paths send an email verification link first; set your password while verifying. Verified applications enter review, and after approval you can sign in with that password. Verification emails are limited to five per email address per 24 hours
- `/login`: sign in
- `/verify-email`: opened from the verification email; verifies the address and sets the login password, with distinct messages for expired links, invalid invites, existing accounts, and retryable failures

</details>

<details>
<summary><b>Admin <code>/admin</code> (per-permission)</b></summary>

- Dashboard: N-day trends, views / comments / likes / sign-ups stats, popular posts, category breakdown (SVG charts)
- Post CRUD (Markdown editor), revision history and rollback, pin / feature / archive / batch actions
- Comment moderation, account applications and invite codes, categories / series / tags
- User management (including muting) and role permissions

</details>

## Project layout

```
.
├── app/
│   ├── (blog)/          Public pages: home, posts, categories / tags / series / archive
│   ├── (admin)/         Admin: dashboard, posts, comments, users, permissions
│   ├── (auth)/          Sign in, registration, applications
│   ├── api/             Route handlers (search index, view reporting, ...)
│   └── **/actions.ts    Server Actions, colocated with routes
├── components/
│   ├── ui/              Shared components
│   ├── admin/           Admin components, including charts/ (SVG charts)
│   ├── layout/          Header / Footer / Sidebar / notification bell
│   ├── blog/            Post cards, lists, TOC
│   ├── home/            Home: hero, animated backgrounds, poem quote, social links
│   ├── about/           About page timeline
│   ├── comments/        Comment section
│   ├── notifications/   Notification center
│   └── settings/        User settings
├── lib/                 Data layer and pure utilities: posts, comments, likes, bookmarks,
│                        reading, invites, notifications, stats, daily-stats,
│                        validation, rate-limit, permissions, mail, markdown, ...
├── prisma/              schema.prisma + migrations/ + seed.ts
├── scripts/             One-off scripts (backfills, self-tests) and the build pre-step
├── types/               Global type augmentations
├── fonts/               Local fonts
└── public/              Static assets; without Blob configured, uploads go to public/uploads
```

## Environment variables

<details>
<summary><b>Show the full list</b></summary>

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (use the pooled string on Neon) |
| `AUTH_SECRET` | Auth.js secret (generate with `openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | Off in production by default; set to `true` for self-hosting when the Host header must be trusted |
| `TRUSTED_PROXY_HOPS` | Number of proxy addresses to skip on the right side of `X-Forwarded-For` (used to derive the client IP for rate limiting); set `0` when the platform rewrites it as a single client address |
| `NEXT_PUBLIC_SITE_URL` | Canonical domain, used by sitemap / RSS / metadata and verification email links |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | The seed script creates the super admin from these |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | QQ Mail SMTP, used for email verification and review notifications (applications cannot be submitted when unset) |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` / `HCAPTCHA_SECRET_KEY` | hCaptcha (verification is skipped when unset) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob image storage; required in production to upload covers or avatars |

</details>

> [!WARNING]
> Values prefixed with `NEXT_PUBLIC_` are shipped to the browser — **never use them for secrets**.

## Content configuration

| What to change | Where |
| --- | --- |
| Site name / tagline / launch date | `SITE` in `lib/constants.ts` |
| Canonical domain | `NEXT_PUBLIC_SITE_URL` environment variable |
| Accent color | CSS variables at the top of `app/globals.css` |
| Social links / friends / tools / skills / timeline | `lib/constants.ts` |

## Deployment

**Vercel**

1. Create a PostgreSQL database (e.g. [Neon](https://neon.tech)) and set `DATABASE_URL` to the pooled connection string.
2. Import this repository. The build command is `vercel-build`: it runs `scripts/predeploy.mjs` (applies database migrations in production only) and then `next build`. Preview builds do not migrate the database, but static generation may still read it; use a separate preview database.
3. Set `AUTH_SECRET` and point `NEXT_PUBLIC_SITE_URL` at your domain.
4. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before running the seed script.
5. Create a Blob store if you need cover or avatar uploads in production. Vercel injects `BLOB_READ_WRITE_TOKEN`.
6. Configure SMTP before accepting applications; it is used for email verification and review notifications. To enable human verification, set both the hCaptcha site key and secret key; without them verification is skipped.

**Self-hosting**: build and run `pnpm start`; remember to set `AUTH_TRUST_HOST=true`.

## Contributing

Feedback and pull requests are welcome.

- Local setup, constraints and pre-commit checks: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Community rules and how to report: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Bug reports: use the [issue forms](https://github.com/Yiyazadxr/Xuanbao-blog/issues/new/choose), and never include secrets or personal information (passwords, `.env` contents, connection strings, cookies)

## License

This project licenses code and content separately; see [LICENSE](./LICENSE) and [NOTICE](./NOTICE) for the full text.

- **Source code**: [MIT](./LICENSE) © 2026-present Yiyazadr. Use, modify, commercialize and redistribute; keep the copyright and license notice.
- **Articles and images**: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Attribution required, non-commercial only, share alike; **commercial use requires prior permission**.
- **Brand names and logos** ("暄宝xr", "Xuanbao", "Xuanbao.dev" and the logo): not covered by the open-source licenses; **do not use them as your own branding or in a way that implies endorsement**.
- **Third-party assets**: fonts (Space Grotesk, Geist Mono — SIL OFL 1.1), icons (Phosphor, MIT) and the other dependencies are described in [NOTICE](./NOTICE).

## Acknowledgements

- [Next.js](https://nextjs.org) and [Vercel](https://vercel.com)
- [Prisma](https://www.prisma.io) + [PostgreSQL](https://www.postgresql.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Phosphor Icons](https://phosphoricons.com)
- [Iconify](https://iconify.design)

## Contact

For commercial licensing or other licensing matters: 412110785@qq.com · [GitHub](https://github.com/Yiyazadxr)
