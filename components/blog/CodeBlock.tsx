"use client";

import { isValidElement, useRef, type ClassAttributes, type HTMLAttributes } from "react";
import type { ExtraProps } from "react-markdown";
import { Icon } from "@/components/ui/Icon";
import { useCopyFeedback } from "@/lib/use-copy-feedback";

// Clipboard API 不可用时回退到 execCommand。
export function CodeBlock({
  children,
  className,
  node: _node,
  ...props
}: ClassAttributes<HTMLPreElement> & HTMLAttributes<HTMLPreElement> & ExtraProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const { status, show } = useCopyFeedback();

  let language = "";
  if (isValidElement(children)) {
    const cls = (children.props as { className?: string })?.className ?? "";
    const m = /language-([\w-]+)/.exec(cls);
    if (m) language = m[1];
  }
  const preCls = ["hljs", className].filter(Boolean).join(" ") || undefined;
  const copied = status === "copied";
  const failed = status === "failed";

  async function handleCopy() {
    const text = preRef.current?.textContent ?? "";
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // 兼容旧浏览器和无剪贴板权限的环境。
      const range = document.createRange();
      const sel = window.getSelection();
      if (preRef.current && sel) {
        range.selectNodeContents(preRef.current);
        sel.removeAllRanges();
        sel.addRange(range);
        ok = document.execCommand("copy");
        sel.removeAllRanges();
      }
    }
    show(ok ? "copied" : "failed");
  }

  return (
    <div className="group relative" role="figure">
      {/* 触摸设备没有 hover，复制按钮保持可见。 */}
      <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-2 opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
        {language && (
          <span className="rounded bg-black/30 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">
            {language}
          </span>
        )}
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "已复制" : failed ? "复制失败" : "复制代码"}
          className="pointer-events-auto flex size-7 cursor-pointer items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
        >
          {copied ? (
            <Icon icon="ph:check-bold" width={15} height={15} aria-hidden />
          ) : failed ? (
            <Icon icon="ph:x-bold" width={15} height={15} aria-hidden />
          ) : (
            <Icon icon="ph:copy-bold" width={15} height={15} aria-hidden />
          )}
        </button>
      </div>
      <pre ref={preRef} className={preCls} {...props}>
        {children}
      </pre>
    </div>
  );
}
