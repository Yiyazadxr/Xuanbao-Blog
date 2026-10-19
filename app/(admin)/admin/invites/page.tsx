import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  CreateInviteButton,
  DeleteInviteButton,
  RequestActions,
} from "@/components/admin/InviteActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "申请与邀请码" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  PENDING: { text: "待处理", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  PROCESSING: { text: "发送中", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  APPROVED: { text: "已注册", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  REJECTED: { text: "已拒绝", cls: "bg-red-500/10 text-red-500" },
};

// 账号申请列表 + 邀请码管理（两处均分页）
export default async function AdminInvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ req?: string; inv?: string }>;
}) {
  const canReview = Boolean(await requirePermission(PERMISSIONS.REVIEW_REQUESTS));
  const canManage = Boolean(await requirePermission(PERMISSIONS.MANAGE_INVITES));
  if (!canReview && !canManage) redirect("/admin");
  const { req: reqParam, inv: invParam } = await searchParams;
  const reqPage = Math.max(1, Number(reqParam) || 1);
  const invPage = Math.max(1, Number(invParam) || 1);

  const [requests, reqTotal, invites, invTotal] = await Promise.all([
    canReview ? prisma.accountRequest.findMany({
      where: { status: { not: "UNVERIFIED" } },
      orderBy: { createdAt: "desc" },
      skip: (reqPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }) : [],
    canReview ? prisma.accountRequest.count({ where: { status: { not: "UNVERIFIED" } } }) : 0,
    canManage ? prisma.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
      skip: (invPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { usedBy: { select: { name: true, email: true } } },
    }) : [],
    canManage ? prisma.inviteCode.count() : 0,
  ]);
  const reqTotalPages = Math.max(1, Math.ceil(reqTotal / PAGE_SIZE));
  const invTotalPages = Math.max(1, Math.ceil(invTotal / PAGE_SIZE));

  // 服务端请求期间取当前时间，不参与客户端重渲染。
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">申请与邀请码</h1>
        {canManage && <CreateInviteButton />}
      </div>

      {/* 账号申请 */}
      {canReview && <>
      <h2 className="mt-10 text-lg font-bold">账号申请</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        {requests.length === 0 ? (
          <EmptyState title="暂无申请" />
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((req) => {
              const status = STATUS_LABEL[req.status] ?? STATUS_LABEL.PENDING;
              return (
                <li
                  key={req.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{req.email}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>
                        {status.text}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(req.createdAt)}
                      {req.message && ` · ${req.message}`}
                    </p>
                  </div>
                   {(req.status === "PENDING" || req.status === "PROCESSING") && (
                     <RequestActions
                       requestId={req.id}
                       email={req.email}
                       approvable={Boolean(req.emailVerifiedAt)}
                     />
                   )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Pagination
        page={reqPage}
        totalPages={reqTotalPages}
        basePath="/admin/invites"
        searchParams={{ inv: invPage > 1 ? String(invPage) : undefined }}
      />

      {/* 邀请码 */}
      </>}
      {canManage && <>
      <h2 className="mt-10 text-lg font-bold">邀请码</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        {invites.length === 0 ? (
          <EmptyState title="暂无邀请码" />
        ) : (
          <ul className="divide-y divide-border">
            {invites.map((invite) => {
              const expired = invite.expiresAt && invite.expiresAt.getTime() < now;
              const exhausted = invite.usedCount >= invite.maxUses;
              return (
                <li
                  key={invite.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-foreground/5 px-2.5 py-1 font-mono text-sm font-semibold">
                        {invite.code}
                      </code>
                      {exhausted ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          已用尽
                        </span>
                      ) : expired ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                          已过期
                        </span>
                      ) : (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                          可用 {invite.usedCount}/{invite.maxUses}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      创建于 {formatDate(invite.createdAt)}
                      {invite.expiresAt && ` · ${formatDate(invite.expiresAt)} 过期`}
                      {invite.usedBy.length > 0 &&
                        ` · 使用者：${invite.usedBy.map((u) => u.name).join("、")}`}
                    </p>
                  </div>
                  {invite.usedCount === 0 && <DeleteInviteButton id={invite.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Pagination
        page={invPage}
        totalPages={invTotalPages}
        basePath="/admin/invites"
        searchParams={{ req: reqPage > 1 ? String(reqPage) : undefined }}
      />
      </>}
    </>
  );
}
