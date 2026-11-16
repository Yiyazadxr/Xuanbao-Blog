"use client";

import { Icon } from "@/components/ui/Icon";
import { useCopyFeedback } from "@/lib/use-copy-feedback";

// Web Share API 不可用时回退到复制链接。
export function ShareButton({ title, slug }: { title: string; slug: string }) {
  const { status, show } = useCopyFeedback();

  async function handleShare() {
    const url = `${window.location.origin}/blog/${slug}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        show("shared");
      } catch {
        // 用户取消或分享失败时保持原状态。
      }
      return;
    }
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // 非安全上下文等环境回退到 execCommand。
      const input = document.createElement("textarea");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      ok = document.execCommand("copy");
      document.body.removeChild(input);
    }
    show(ok ? "copied" : "failed");
  }

  const copied = status === "copied";
  const shared = status === "shared";
  const failed = status === "failed";

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={shared ? "已分享" : copied ? "链接已复制" : failed ? "复制失败" : "分享文章"}
      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent border-border text-muted hover:border-accent hover:text-accent"
    >
      <Icon
        icon={shared || copied ? "ph:check-bold" : failed ? "ph:x-bold" : "ph:share-network-bold"}
        width={18}
        height={18}
        aria-hidden
      />
      {shared ? "已分享" : copied ? "已复制" : failed ? "复制失败" : "分享"}
    </button>
  );
}
