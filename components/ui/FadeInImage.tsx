"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

// 图片淡入：加载完成前保持透明，完成后过渡显示，避免封面突然闪现。
// 淡入过渡由调用方在 className 里提供（如 transition-opacity duration-300）。
export function FadeInImage({ alt, onLoad, onError, className = "", ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [startedAt] = useState<number | null>(() =>
    typeof performance !== "undefined" ? performance.now() : null
  );

  // 缓存命中时 load 事件可能先于水合触发，挂载后检查一次 complete。
  // queueMicrotask 后置 setState，避免 effect 内同步更新。
  useEffect(() => {
    if (imgRef.current?.complete) {
      queueMicrotask(() => setLoaded(true));
    }
  }, []);

  return (
    <Image
      {...props}
      alt={alt}
      ref={imgRef}
      onLoad={(event) => {
        setLoaded(true);
        if (process.env.NODE_ENV === "development" && startedAt !== null) {
          console.debug("[image-timing]", props.src, `${(performance.now() - startedAt).toFixed(1)}ms`);
        }
        onLoad?.(event);
      }}
      // 加载失败同样结束过渡，露出浏览器的损坏占位而不是永久空白。
      onError={(event) => {
        setLoaded(true);
        onError?.(event);
      }}
      className={`${className} ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}
