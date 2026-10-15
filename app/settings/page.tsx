import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { getFreshUser } from "@/lib/auth";
import { getBookmarkCount } from "@/lib/bookmarks";
import { getReadingStats } from "@/lib/reading";
import { type Role } from "@/lib/roles";
import { daysBetween, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "设置" };
export const dynamic = "force-dynamic";

// 设置页：个人资料 + 显示偏好（需登录）
export default async function SettingsPage() {
  const user = await getFreshUser();
  if (!user) redirect("/");

  const role = user.role as Role;
  const days = daysBetween(user.createdAt);
  const joinedDate = formatDate(user.createdAt);
  const [readingStats, bookmarkCount] = await Promise.all([
    getReadingStats(user.id),
    getBookmarkCount(user.id),
  ]);

  return (
    <SettingsPanel
      name={user.name}
      email={user.email}
      role={role}
      image={user.image}
      days={days}
      joinedDate={joinedDate}
      postsRead={readingStats.postsRead}
      wordsRead={readingStats.wordsRead}
      bookmarkCount={bookmarkCount}
    />
  );
}
