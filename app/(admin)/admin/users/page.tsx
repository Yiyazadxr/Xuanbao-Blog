import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserRowActions } from "@/components/admin/UserRowActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { getFreshUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { parsePage } from "@/lib/pagination";
import { hasPermission } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { ROLE_BADGE_CLS, ROLE_LABELS, type Role } from "@/lib/roles";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "用户管理" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
// 搜索词长度上限，避免超长字符串进入查询。
const KEYWORD_MAX = 100;

// 用户管理列表：按注册时间排序，支持昵称/邮箱搜索与分页
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const me = await getFreshUser();
  if (!me) redirect("/");
  if (!(await hasPermission(me.role as Role, PERMISSIONS.MANAGE_USERS))) redirect("/admin");

  const keyword = q?.trim().slice(0, KEYWORD_MAX) || undefined;
  const where = keyword
    ? { OR: [{ name: { contains: keyword } }, { email: { contains: keyword } }] }
    : undefined;
  const total = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsePage(pageParam), totalPages);
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      disabled: true,
      activatedAt: true,
      createdAt: true,
      mutedDuring: true,
      mutedPermanent: true,
      mutedReason: true,
      _count: { select: { posts: true, comments: true } },
    },
  });

  // 服务端请求期间取当前时间，不参与客户端重渲染。
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">用户管理</h1>
      <p className="mt-2 text-sm text-muted">
        角色层级：超级管理员 &gt; 管理员 &gt; 成员。管理员可管理文章、评论与邀请码，成员可评论点赞。
      </p>
      <p className="mt-1 text-sm text-muted">共 {total} 位用户</p>

      <form action="/admin/users" method="get" className="mt-6 flex max-w-sm gap-2">
        <input
          type="search"
          name="q"
          defaultValue={keyword}
          placeholder="搜索昵称或邮箱"
          className="h-10 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none transition-colors duration-200 placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90"
        >
          搜索
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-surface text-left text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">用户</th>
              <th className="px-5 py-3 font-medium">角色</th>
              <th className="px-5 py-3 font-medium">状态</th>
              <th className="px-5 py-3 font-medium">文章</th>
              <th className="px-5 py-3 font-medium">评论</th>
              <th className="px-5 py-3 font-medium">注册时间</th>
              <th className="px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState title="没有匹配的用户" />
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const role = u.role as Role;
                const isMuted = u.mutedPermanent || (u.mutedDuring != null && u.mutedDuring.getTime() > now);
                return (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          ROLE_BADGE_CLS[role] ?? ROLE_BADGE_CLS.MEMBER
                        }`}
                      >
                        {ROLE_LABELS[role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {u.disabled ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                          已停用
                        </span>
                      ) : isMuted ? (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          禁言中
                        </span>
                      ) : !u.activatedAt ? (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          待审核
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          正常
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 tabular-nums">{u._count.posts}</td>
                    <td className="px-5 py-3 tabular-nums">{u._count.comments}</td>
                    <td className="px-5 py-3 text-muted">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      {role === "SUPER_ADMIN" ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        <UserRowActions
                          userId={u.id}
                          currentRole={u.role}
                          isMuted={isMuted}
                          muteInfo={{
                            permanent: u.mutedPermanent,
                            until: u.mutedDuring ? u.mutedDuring.toISOString() : null,
                            reason: u.mutedReason,
                          }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/users"
        searchParams={keyword ? { q: keyword } : undefined}
      />
    </>
  );
}
