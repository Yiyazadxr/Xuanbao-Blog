"use client";

import { useState } from "react";
import { deleteUser, updateUserRole } from "@/app/(admin)/admin/users/actions";
import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { MuteUserButton } from "@/components/admin/MuteUserButton";

// 用户列表行操作：设为管理员 / 设为成员 / 禁言/解禁 / 删除
// 角色与删除需要 manage_users，禁言需要 mute_users。
export function UserRowActions({
  userId,
  currentRole,
  isMuted,
  canManageUsers,
  muteInfo,
}: {
  userId: string;
  currentRole: string;
  isMuted: boolean;
  canManageUsers: boolean;
  muteInfo: { permanent: boolean; until: string | null; reason: string | null };
}) {
  const [message, setMessage] = useState("");

  function handle(result: { ok: boolean; error?: string; message?: string }) {
    setMessage(result.ok ? "" : (result.error ?? "操作失败"));
  }

  return (
    <div className="flex items-center gap-1">
      {canManageUsers && (currentRole === "MEMBER" ? (
        <AdminActionButton
          variant="muted"
          action={() => updateUserRole(userId, "ADMIN")}
          onDone={handle}
        >
          设为管理员
        </AdminActionButton>
      ) : (
        <AdminActionButton
          variant="muted"
          action={() => updateUserRole(userId, "MEMBER")}
          onDone={handle}
        >
          设为成员
        </AdminActionButton>
      ))}
      <MuteUserButton userId={userId} isMuted={isMuted} muteInfo={muteInfo} />
      {canManageUsers && (
        <AdminActionButton
          variant="danger"
          confirmText="确定删除该用户吗？其评论和点赞将一并删除，不可恢复。"
          action={() => deleteUser(userId)}
          onDone={handle}
        >
          删除
        </AdminActionButton>
      )}
      {message && <span className="text-xs text-red-500">{message}</span>}
    </div>
  );
}
