## Summary

<!-- What changed, and why? Link the issue if there is one. -->

## Type

- [ ] Bug fix
- [ ] Feature
- [ ] UI / UX
- [ ] Auth / permissions
- [ ] Prisma schema / migration
- [ ] Performance
- [ ] Docs
- [ ] Refactor

## Test plan

<!-- Paste the result of `pnpm check`. State which environments you actually tested. -->

- [ ] `pnpm check` (lint + typecheck + vitest)
- [ ] `pnpm prisma generate` (if the schema changed)
- [ ] Migration reviewed; noted whether existing rows need a backfill
- [ ] Auth / permission cases covered by tests (if applicable)
- [ ] Verified in: <!-- browser · OS · account role -->

## Safety

- [ ] Server Actions start with `requirePermission(...)` and validate input with Zod
- [ ] Permissions are read from the database (`getFreshUser`); the JWT role is not trusted
- [ ] No secret committed; no `NEXT_PUBLIC_*` value holds one
- [ ] Markdown rendering still blocks `rehype-raw` and `dangerouslySetInnerHTML`
- [ ] Client components do not import `lib/prisma`

## Screenshots

<!-- Before / after for UI changes. Do not include real user data. -->
