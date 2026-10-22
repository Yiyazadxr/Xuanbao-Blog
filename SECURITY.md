# 安全策略 · Security Policy

## 支持的版本

| 版本 | 状态 |
| --- | --- |
| `main` 分支当前版本 | ✅ 接收安全修复 |
| 低于最新提交的部署 | ❌ 不单独接收修复，请先升级 |

本项目持续部署，没有长期维护的旧版本分支，所有修复都进入 `main`。

## 报告安全漏洞

**请不要用公开 Issue 报告安全问题。** 公开 Issue 会让漏洞细节对所有人可见。

请通过以下方式私下联系维护者：

- 邮件：[412110785@qq.com](mailto:412110785@qq.com)
- GitHub 私密漏洞报告：仓库页面的 **Security** 选项卡 → **Report a vulnerability**

报告内容请包含：

1. 受影响的页面路径、接口或文件
2. 复现步骤与必要的账号角色（普通用户 / 作者 / 管理员）
3. 影响面：能读到什么、能改到什么、是否需要登录
4. 你已知的缓解方式（如有）

**期望响应时间**：3 个工作日内确认收到，7 个工作日内给出初步判断与修复计划。修复完成后会在 `main` 打上补丁并公开披露（除非你希望保密更久）。

**请勿在报告中附带真实用户的密码、Cookie、Token 或数据库连接串。** 需要证明影响面时，用你自己注册的测试账号即可。

## 本项目的安全边界

本项目是**单作者、邀请注册的全栈博客**：Next.js 16 + React 19 + Prisma + PostgreSQL，部署在 Vercel 类托管平台。以下是设计与运维上的边界。

### 账号与注册

- 密码使用 `bcryptjs` 哈希后入库，任何环节都不保存明文
- 注册需要邀请码（`InviteCode`）或提交账号申请（`AccountRequest`）由管理员审批
- 登录、注册等敏感操作接入 hCaptcha（配置了 `HCAPTCHA_SECRET_KEY` 时强制校验）与数据库限流（`RateLimit` 表）
- `sessionVersion` 在改密、禁用账号时递增，使旧会话立即失效

### 权限

- 每个 Server Action 第一步调用 `requirePermission(具体权限)`，权限从数据库实时读取（`getFreshUser`），**不信任 JWT 里的 `role`**
- 角色与权限的对应关系存在 `RolePermission` 表，改权限不需要重新登录
- 管理后台的页面在服务端先做权限判断，再渲染数据

### 内容渲染

- Markdown 使用 react-markdown 渲染，**禁用** `rehype-raw` 与 `dangerouslySetInnerHTML`，避免存储型 XSS
- 评论、个人简介等用户输入在服务端校验后再入库，输出时按文本渲染
- 图片上传只接受白名单内的图片 MIME 类型，并有体积上限；类型判断以文件头为准，不只看扩展名

### 密钥与配置

- `DATABASE_URL`、`AUTH_SECRET`、`HCAPTCHA_SECRET_KEY`、`SMTP_PASS`、`BLOB_READ_WRITE_TOKEN` 只存在于服务端环境变量
- `NEXT_PUBLIC_` 前缀的值会进入前端产物，**不得**用于存放任何密钥
- `.env` 已在 `.gitignore` 中；仓库只提供 `.env.example`（键名 + 注释，无真实值）
- 反向代理场景可通过 `TRUSTED_PROXY_HOPS` 声明可信跳数，避免伪造的 `X-Forwarded-For` 影响限流与审计

### 数据与运维

- 数据库只允许应用与维护者访问，不直接暴露到公网
- 生产库与本地开发库分离；不要把生产数据导出到本地或提交进仓库
- 日志中不打印密码、Token、完整连接串与用户隐私字段
- 备份与迁移由维护者执行，迁移脚本随代码评审

### 不属于本项目的安全边界

- 托管平台（Vercel、Neon 等）自身的安全与可用性
- 用户使用弱密码、在多个站点复用密码，或主动把账号交给他人
- 管理员账号被钓鱼、设备被控后的操作
- 第三方依赖 0day——发现后按上游公告升级，不单独维护补丁分支

## 使用者自查清单

> 面向自建部署者。

- [ ] `AUTH_SECRET` 为随机生成的长字符串，未与其他项目复用
- [ ] `ADMIN_PASSWORD` 只在首次初始化时使用，之后已修改为强密码
- [ ] 生产环境的 `NEXT_PUBLIC_*` 中没有任何密钥
- [ ] 数据库未开放公网访问，连接串使用 SSL
- [ ] 已配置 `TRUSTED_PROXY_HOPS`（若前面有反向代理或 CDN）
- [ ] 邀请码按需生成、用后作废，不长期公开
- [ ] 备份可用，且备份文件本身不公开

## 致谢

感谢你负责任地披露问题。发现并报告有效漏洞的贡献者，将在修复记录中致谢（除非你希望匿名）。

---

## English

### Supported versions

| Version | Status |
| --- | --- |
| Current version on `main` | ✅ receives security fixes |
| Deployments older than the latest commit | ❌ not patched separately; upgrade first |

The project deploys continuously and does not maintain old release branches; all fixes land on `main`.

### Reporting a vulnerability

**Do not open a public issue for a security problem.** A public issue exposes the details to everyone.

Report privately to the maintainer:

- Email: [412110785@qq.com](mailto:412110785@qq.com)
- GitHub private advisory: the repository's **Security** tab → **Report a vulnerability**

Please include:

1. The affected page path, endpoint or file
2. Steps to reproduce and the account role required (user / author / admin)
3. Impact: what can be read, what can be changed, and whether authentication is needed
4. Any mitigation you already know of

**Expected response time**: acknowledgement within 3 business days, initial assessment and a fix plan within 7. Once fixed, the patch lands on `main` and the issue is disclosed publicly unless you ask for a longer embargo.

**Never include real users' passwords, cookies, tokens or database connection strings in a report.** Use an account you registered yourself to demonstrate impact.

### Security boundary

This is a **single-author, invite-only full-stack blog**: Next.js 16, React 19, Prisma and PostgreSQL, deployed on a Vercel-style platform. The boundary is as follows.

**Accounts and registration.** Passwords are hashed with `bcryptjs` before storage and are never kept in plaintext. Registration requires an invite code (`InviteCode`) or an account request (`AccountRequest`) approved by an administrator. Sensitive actions such as sign-in and sign-up are protected by hCaptcha (enforced when `HCAPTCHA_SECRET_KEY` is set) and database-backed rate limiting (the `RateLimit` table). `sessionVersion` is incremented on password change or account disable, invalidating old sessions immediately.

**Permissions.** Every Server Action starts with `requirePermission(...)`, and permissions are read live from the database via `getFreshUser` — the `role` in the JWT is never trusted. Role-to-permission mappings live in the `RolePermission` table, so a permission change does not require re-login. Admin pages check permissions on the server before rendering data.

**Content rendering.** Markdown is rendered with react-markdown; `rehype-raw` and `dangerouslySetInnerHTML` are **not allowed**, which blocks stored XSS. Comments and profile fields are validated on the server before storage and rendered as text. Image uploads are restricted to an allowlist of image MIME types with a size cap; the type check uses the file header, not just the extension.

**Secrets and configuration.** `DATABASE_URL`, `AUTH_SECRET`, `HCAPTCHA_SECRET_KEY`, `SMTP_PASS` and `BLOB_READ_WRITE_TOKEN` exist only as server-side environment variables. Anything prefixed `NEXT_PUBLIC_` ships to the browser and must never hold a secret. `.env` is gitignored; the repository only ships `.env.example` (key names plus comments, no real values). Behind a reverse proxy, `TRUSTED_PROXY_HOPS` declares how many hops are trusted so a forged `X-Forwarded-For` cannot skew rate limiting or auditing.

**Data and operations.** The database is reachable only by the application and the maintainer, never exposed publicly. Production and local databases are separate; production data is never exported into the repository. Logs exclude passwords, tokens, full connection strings and private user fields. Backups and migrations are run by the maintainer, and migrations are reviewed with the code.

**Out of scope.** The security and availability of the hosting platform (Vercel, Neon, etc.); weak or reused user passwords, or a user handing their account to someone else; actions taken after an administrator account is phished or their device is compromised; 0-days in third-party dependencies — those are fixed by upgrading per the upstream advisory rather than by maintaining a patch branch.

### Self-check list

> For people running their own deployment.

- [ ] `AUTH_SECRET` is a long random string and is not reused from another project
- [ ] `ADMIN_PASSWORD` was only used for initial setup and has since been replaced with a strong password
- [ ] No production `NEXT_PUBLIC_*` value contains a secret
- [ ] The database is not publicly reachable and the connection uses SSL
- [ ] `TRUSTED_PROXY_HOPS` is set when a reverse proxy or CDN sits in front
- [ ] Invite codes are generated on demand, revoked after use, and never posted publicly
- [ ] Backups work, and the backup files themselves are not public

### Acknowledgements

Thank you for reporting responsibly. Contributors who report a valid vulnerability are credited in the fix notes unless they prefer to stay anonymous.
