"use client";

import { useState } from "react";
import {
  approveRequest,
  createFreeInvite,
  deleteInvite,
  rejectRequest,
} from "@/app/(admin)/admin/invites/actions";
import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { successCls } from "@/components/ui/form-styles";

// 申请审批按钮（客户端交互）
export function RequestActions({
  requestId,
  email,
  approvable,
}: {
  requestId: string;
  email: string;
  approvable: boolean;
}) {
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col items-end gap-2">
      {!approvable && (
        <p className="max-w-64 text-right text-xs text-amber-600 dark:text-amber-400">
          旧流程申请，邮箱未验证；请拒绝后让申请人重新提交。
        </p>
      )}
      <div className="flex items-center gap-1">
        {approvable && (
          <AdminActionButton
            variant="accent"
            action={() => approveRequest(requestId)}
            onDone={(r) => setMessage(r.message ?? r.error ?? "")}
            confirmText={`确定向 ${email} 发送账号激活通知吗？`}
          >
            通过并激活账号
          </AdminActionButton>
        )}
        <AdminActionButton
          variant="danger"
          action={() => rejectRequest(requestId)}
          onDone={(r) => setMessage(r.message ?? r.error ?? "")}
          confirmText="确定拒绝这个申请吗？"
        >
          拒绝
        </AdminActionButton>
      </div>
      {message && <p className="max-w-60 text-right text-xs text-muted">{message}</p>}
    </div>
  );
}

// 生成通用邀请码（可设有效期与使用次数）
export function CreateInviteButton() {
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(7);
  const [uses, setUses] = useState(1);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted">
          有效
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-sm"
          />
          天
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          可用
          <input
            type="number"
            min={1}
            max={1000}
            value={uses}
            onChange={(e) => setUses(Number(e.target.value))}
            className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-sm"
          />
          次
        </label>
        <AdminActionButton
          variant="muted"
          action={() => createFreeInvite({ expiresInDays: days, maxUses: uses })}
          onDone={(r) => setMessage(r.message ?? r.error ?? "")}
          className="inline-flex h-10 cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
        >
          生成邀请码
        </AdminActionButton>
      </div>
      {message && <p className={successCls}>{message}</p>}
    </div>
  );
}

// 删除未使用邀请码按钮
export function DeleteInviteButton({ id }: { id: string }) {
  return (
    <AdminActionButton
      variant="danger"
      confirmText="确定删除这个邀请码吗？"
      action={() => deleteInvite(id)}
    >
      删除
    </AdminActionButton>
  );
}
