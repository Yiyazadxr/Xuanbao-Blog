"use client";

import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { isSuperAdmin } from "@/lib/roles";

type AdminLink = {
  label: string;
  href: string;
  icon: string;
  exact?: boolean;
  permissions?: Permission[]; // 拥有其中任一权限即显示
  superOnly?: boolean; // 仅超级管理员显示
};

const ADMIN_LINKS: AdminLink[] = [
  { label: "仪表盘", href: "/admin", icon: "ph:gauge-bold", exact: true },
  {
    label: "文章管理",
    href: "/admin/posts",
    icon: "ph:article-bold",
    permissions: [PERMISSIONS.MANAGE_POSTS],
  },
  {
    label: "分类与标签",
    href: "/admin/taxonomy",
    icon: "ph:tag-bold",
    permissions: [PERMISSIONS.MANAGE_POSTS],
  },
  {
    label: "评论审核",
    href: "/admin/comments",
    icon: "ph:chats-bold",
    permissions: [PERMISSIONS.APPROVE_COMMENTS, PERMISSIONS.DELETE_COMMENTS],
  },
  {
    label: "申请与邀请码",
    href: "/admin/invites",
    icon: "ph:ticket-bold",
    permissions: [PERMISSIONS.REVIEW_REQUESTS, PERMISSIONS.MANAGE_INVITES],
  },
  {
    label: "用户管理",
    href: "/admin/users",
    icon: "ph:users-bold",
    permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MUTE_USERS],
  },
  {
    label: "权限管理",
    href: "/admin/permissions",
    icon: "ph:shield-check-bold",
    superOnly: true,
  },
];

// 后台侧栏导航（移动端为横向标签）；按角色权限过滤入口
export function AdminSidebar({
  role,
  permissions,
}: {
  role?: string;
  permissions: Permission[];
}) {
  const pathname = usePathname();
  const links = ADMIN_LINKS.filter((l) => {
    if (l.superOnly && !isSuperAdmin(role)) return false;
    if (l.permissions && !l.permissions.some((p) => permissions.includes(p))) return false;
    return true;
  });

  return (
    <nav aria-label="后台导航" className="flex gap-1 overflow-x-auto md:w-48 md:flex-col">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
              active
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <Icon icon={link.icon} width={18} height={18} aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
