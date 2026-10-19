"use client";

import { useEffect } from "react";

// 根布局错误边界：error.tsx 捕获不到根 layout 的错误。
// global-error 必须自带 html/body，且不能导出 metadata。
export default function RootGlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("根布局错误：", error.digest);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fafaf9",
          color: "#1c1917",
        }}
      >
        <div style={{ textAlign: "center", padding: "0 1.5rem" }}>
          <p style={{ fontSize: "3rem", fontWeight: 700, color: "rgba(0,0,0,0.25)", margin: 0 }}>
            500
          </p>
          <h2 style={{ margin: "1rem 0 0.5rem", fontSize: "1.25rem", fontWeight: 700 }}>
            页面遇到了一点小问题
          </h2>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#78716c" }}>
            请重试，或返回首页。
          </p>
          {error.digest && (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#a1a1aa" }}>
              错误编号：{error.digest}
            </p>
          )}
          <button
            onClick={unstable_retry}
            style={{
              marginTop: "1.5rem",
              cursor: "pointer",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              background: "#0f766e",
              color: "#fff",
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
