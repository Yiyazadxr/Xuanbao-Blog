import type { Metadata } from "next";
import { RecentReading } from "@/components/blog/RecentReading";
import { websiteOpenGraph } from "@/lib/metadata";

const description = "查看这台设备上保存的文章阅读进度";

export const metadata: Metadata = {
  title: "最近阅读",
  description,
  openGraph: websiteOpenGraph("最近阅读", description, "/reading"),
};

export default function ReadingPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">最近阅读</h1>
      <p className="mt-2 text-muted">阅读进度仅保存在当前设备和浏览器中</p>
      <div className="mt-8">
        <RecentReading />
      </div>
    </>
  );
}
