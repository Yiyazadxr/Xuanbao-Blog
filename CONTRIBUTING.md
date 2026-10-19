# 贡献指南 · Contributing

## 中文

本项目是 Next.js 16 + React 19 + Prisma 的全栈个人博客。开始之前请先读 [AGENTS.md](./AGENTS.md)，它记录了项目的硬约束与目录约定。

### 本地运行

需要 Node.js（CI 使用 22）、pnpm（锁文件为 `pnpm-lock.yaml`）与 PostgreSQL（本地实例或 [Neon](https://neon.tech) 等托管服务）。

```bash
pnpm install
cp .env.example .env        # 至少填 DATABASE_URL 与 AUTH_SECRET，各变量的说明写在文件注释里
pnpm prisma migrate dev     # 初始化数据库结构
pnpm db:seed                # 默认分类 + 示例文章 + 超级管理员
pnpm dev                    # → http://localhost:3000
```

### 改动约束（不得违反）

- **Server Action 三段式**：先 `requirePermission(具体权限)`，再用 `lib/validation.ts` 的 Zod schema 校验，最后处理业务；不信任客户端入参。
- **权限实时读库**：角色与权限通过 `getFreshUser` 从数据库读取，不信任 JWT 中的 `role`。
- **共享契约只定义一份**：客户端与服务端共用的类型与 schema 集中在 `lib/`，两端从同一来源 import。
- **客户端组件禁止 import `lib/prisma`**：该模块依赖生成客户端与 `@prisma/adapter-pg`，仅限服务端。
- **防 XSS**：Markdown 用 react-markdown 渲染，禁止 `rehype-raw` 与 `dangerouslySetInnerHTML`。
- **不提交密钥**：`.env` 已加入 .gitignore；`NEXT_PUBLIC_` 前缀的值会进入前端产物，不得存放密钥。
- **错误处理**：错误边界使用 `unstable_retry`；不向用户展示 `error.message` 或堆栈。
- **空状态**统一使用 `components/ui/EmptyState.tsx`。
- **离线图标**：新增图标要在 `scripts/extract-icons.ts` 的 `USED_ICONS` 中登记，再运行 `pnpm tsx scripts/extract-icons.ts` 重新生成 `lib/generated/ph-icons.json`，否则线上会渲染成空白。

### 提交前检查

```bash
pnpm check    # lint + typecheck + vitest，与 CI 跑的是同一套
```

改动 `prisma/schema.prisma` 后必须执行 `pnpm prisma generate`（客户端输出到 `lib/generated/prisma`）；迁移用 `pnpm prisma migrate dev --name X`。

提交信息采用 Conventional Commits，例如 `fix: 修复登录限流边界`。

### 报告问题

用 [Issue 表单](https://github.com/Yiyazadxr/Xuanbao-blog/issues/new/choose) 提交。Bug 请附页面路径、复现步骤、浏览器与系统、控制台输出。**不要粘贴密钥或个人信息**（密码、`.env` 内容、数据库连接串、Cookie、Token 等）。

### 提交 Pull Request

- 小而聚焦：一个 PR 只做一件事，说明「为什么」。
- 界面改动附前后截图；写明实际验证过的环境，没验证过的就写没验证过。
- 代码贡献按 [MIT](./LICENSE) 授权，文章与图片的授权见 [NOTICE](./NOTICE)。
- 行为规范见 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。

## English

A full-stack personal blog built with Next.js 16, React 19 and Prisma. Read [AGENTS.md](./AGENTS.md) first — it records the project's hard constraints and conventions.

### Running locally

You need Node.js (CI uses 22), pnpm (the lockfile is `pnpm-lock.yaml`) and PostgreSQL (local or hosted, e.g. [Neon](https://neon.tech)).

```bash
pnpm install
cp .env.example .env        # at least DATABASE_URL and AUTH_SECRET; each variable is documented in the file
pnpm prisma migrate dev     # create the database schema
pnpm db:seed                # default categories + sample posts + a super admin
pnpm dev                    # → http://localhost:3000
```

### Constraints (changes must not break them)

- **Server Actions keep three steps in order**: call `requirePermission(...)` first, then validate with the Zod schemas in `lib/validation.ts`, then do the work. Never trust client input.
- **Read permissions from the database**: roles and permissions come from `getFreshUser`; do not trust `role` in the JWT.
- **Shared contracts are defined once**: types and schemas shared by client and server live in `lib/`, and both sides import from the same place.
- **Client components must not import `lib/prisma`**: it depends on the generated client and `@prisma/adapter-pg`, so it is server-only.
- **XSS**: Markdown is rendered with react-markdown; `rehype-raw` and `dangerouslySetInnerHTML` are not allowed.
- **Never commit secrets**: `.env` is gitignored; anything prefixed `NEXT_PUBLIC_` ships to the browser, so never use it for secrets.
- **Error handling**: error boundaries use `unstable_retry`, and `error.message` or stack traces are never shown to users.
- **Empty states** always use `components/ui/EmptyState.tsx`.
- **Offline icons**: register new icons in `USED_ICONS` in `scripts/extract-icons.ts`, then run `pnpm tsx scripts/extract-icons.ts` to regenerate `lib/generated/ph-icons.json`, otherwise they render blank in production.

### Checks before committing

```bash
pnpm check    # lint + typecheck + vitest, the same set CI runs
```

After changing `prisma/schema.prisma` you must run `pnpm prisma generate` (the client is generated into `lib/generated/prisma`); migrations use `pnpm prisma migrate dev --name X`.

Commit messages follow Conventional Commits, e.g. `fix: 修复登录限流边界`.

### Reporting issues

Use the [issue forms](https://github.com/Yiyazadxr/Xuanbao-blog/issues/new/choose). For bugs include the page path, steps to reproduce, browser and OS, and console output. **Never paste secrets or personal information** (passwords, `.env` contents, database connection strings, cookies, tokens).

### Pull requests

- Keep them small and single-purpose; explain **why** in the description.
- UI changes: include before/after screenshots. State what you actually tested; say so if an environment was not tested.
- By submitting you agree to license code contributions under [MIT](./LICENSE); content licensing is described in [NOTICE](./NOTICE).
- See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community rules.
