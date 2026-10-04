"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useTransition } from "react";
import { savePost, uploadImage } from "@/app/(admin)/admin/posts/actions";
import type { PostConflict } from "@/lib/post-page-types";
import { errorCls, inputCls, labelCls, primaryBtnCls } from "@/components/ui/form-styles";
import { EXCERPT_MAX } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

// Markdown 编辑器体积大且依赖浏览器 API，动态引入并关闭 SSR
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-border text-sm text-muted">
      编辑器加载中…
    </div>
  ),
});

type Category = { id: string; name: string };
type SeriesOption = { id: string; name: string };

type EditorPost = {
  id: string;
  updatedAt: Date;
  archived: boolean;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  categoryId: string | null;
  seriesId: string | null;
  published: boolean;
  pinned: boolean;
  featured: boolean;
  tags: { tag: { name: string } }[];
};

// 草稿自动保存：新建/编辑均生效，保存在 localStorage（浏览器崩溃/误关可恢复）。
// 新建用独立 key，编辑按文章 id 区分，避免互相覆盖。
function draftKey(postId?: string): string {
  return postId ? `post-draft-${postId}` : "post-draft-v1";
}

// 文章编辑器：新建（post 为空）与编辑共用
export function PostEditor({
  categories,
  series,
  post,
}: {
  categories: Category[];
  series: SeriesOption[];
  post?: EditorPost;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(post?.title ?? "");
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(post?.updatedAt.toISOString());
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [categoryId, setCategoryId] = useState(post?.categoryId ?? "");
  const [seriesId, setSeriesId] = useState(post?.seriesId ?? "");
  const [tags, setTags] = useState(post?.tags.map((t) => t.tag.name).join(", ") ?? "");
  const [pinned, setPinned] = useState(post?.pinned ?? false);
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [content, setContent] = useState(post?.content ?? "");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<PostConflict | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [uploading, setUploading] = useState(false);

  // 恢复上次的草稿（仅在客户端挂载时执行一次；从 localStorage 同步外部状态）。
  // 新建与编辑都恢复对应 key 的草稿；编辑时草稿优先级高于已落库内容（用户未保存的修改）。
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(post?.id));
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<EditorPost> & { tags?: string };
      const draftVersion = (JSON.parse(raw) as { expectedUpdatedAt?: string }).expectedUpdatedAt;
      if (post && !draftVersion) {
        setError("本地草稿缺少版本信息。已恢复内容，请先复制修改，再清除草稿并重新打开文章核对。");
        setExpectedUpdatedAt(undefined);
      }
      if (draftVersion) setExpectedUpdatedAt(draftVersion);
      if (d.title) setTitle(d.title);
      if (d.slug) {
        setSlug(d.slug);
        setSlugTouched(true);
      }
      if (d.excerpt) setExcerpt(d.excerpt);
      if (d.coverImage) setCoverImage(d.coverImage);
      if (d.categoryId) setCategoryId(d.categoryId);
      if (d.seriesId) setSeriesId(d.seriesId);
      if (typeof d.tags === "string") setTags(d.tags);
      if (typeof d.pinned === "boolean") setPinned(d.pinned);
      if (typeof d.featured === "boolean") setFeatured(d.featured);
      if (d.content) setContent(d.content);
    } catch {
      // 忽略损坏的草稿
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // 自动保存草稿（防抖，新建与编辑均生效）。
  // 跳过首次挂载：首屏加载的初始内容不应触发「已自动保存」，仅用户实际修改后才保存并提示。
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey(post?.id),
          JSON.stringify({ title, slug, excerpt, coverImage, categoryId, seriesId, tags, pinned, featured, content, expectedUpdatedAt })
        );
        setLastSavedAt(new Date());
      } catch {
        // 存储失败忽略
      }
    }, 800);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [title, slug, excerpt, coverImage, categoryId, seriesId, tags, pinned, featured, content, post?.id, expectedUpdatedAt]);

  function handleTitleChange(value: string) {
    setTitle(value);
    // slug 未被手动改过时跟随标题自动生成
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadImage(fd);
      if (res.ok && res.url) setCoverImage(res.url);
      else setError(res.error ?? "上传失败");
    } catch {
      setError("上传失败");
    } finally {
      setUploading(false);
    }
  }

  function submit(published: boolean) {
    setError("");
    setConflict(null);
    const payload = {
      id: post?.id,
      expectedUpdatedAt,
      title,
      slug,
      content,
      excerpt,
      coverImage,
      categoryId,
      seriesId,
      tags,
      published,
      featured,
      pinned,
      archived: post?.archived ?? false,
    };
    startTransition(async () => {
      try {
      const result = await savePost(payload);
      if (result.ok) {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        try { localStorage.removeItem(draftKey(post?.id)); } catch { /* 浏览器可能禁用存储。 */ }
        router.push("/admin/posts");
        router.refresh();
      } else {
        setError(result.error ?? "保存失败");
        setConflict(result.conflict ?? null);
      }
      } catch {
        setError("保存失败，请稍后重试；当前修改已保留。");
      }
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className={errorCls}>
          {error}
        </p>
      )}
      {conflict && (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4" aria-labelledby="post-conflict-title">
          <h2 id="post-conflict-title" className="font-semibold text-amber-700 dark:text-amber-300">文章已被其他窗口修改</h2>
          <p className="mt-1 text-sm text-muted">请比较当前版本和本地草稿，再决定如何继续。</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-border bg-surface p-3">
              <p className="text-xs font-semibold text-muted">当前版本</p>
              <p className="mt-2 font-medium">{conflict.title}</p>
              <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-sm text-muted">{conflict.content}</p>
            </div>
            <div className="min-w-0 rounded-lg border border-border bg-surface p-3">
              <p className="text-xs font-semibold text-muted">本地草稿</p>
              <p className="mt-2 font-medium">{title}</p>
              <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-sm text-muted">{content}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm font-medium" onClick={() => {
              setTitle(conflict.title);
              setSlug(conflict.slug);
              setSlugTouched(true);
              setExcerpt(conflict.excerpt ?? "");
              setContent(conflict.content);
              setExpectedUpdatedAt(conflict.updatedAt);
              setConflict(null);
              setError("已载入当前版本，请检查后保存。");
            }}>采用当前版本</button>
            <button type="button" className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground" onClick={() => {
              setExpectedUpdatedAt(conflict.updatedAt);
              setConflict(null);
              setError("已保留本地草稿。再次保存将覆盖当前版本。");
            }}>保留本地草稿</button>
          </div>
        </section>
      )}
      {error && post && (
        <button type="button" disabled={pending} onClick={() => {
          if (!window.confirm("请先复制需要保留的修改。继续将清除本地草稿并加载最新文章。")) return;
          if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
          try {
            localStorage.removeItem(draftKey(post.id));
            window.location.reload();
          } catch {
            setError("无法清除本地草稿，请检查浏览器存储设置。");
          }
        }}>清除草稿并加载最新文章</button>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="post-title" className={labelCls}>
            标题
          </label>
          <input
            id="post-title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder="文章标题"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="post-slug" className={labelCls}>
            链接标识（Slug）
          </label>
          <input
            id="post-slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="url-friendly-slug"
            className={`${inputCls} font-mono`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="post-excerpt" className={labelCls}>
          摘要（列表页展示）
        </label>
        <textarea
          id="post-excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          maxLength={EXCERPT_MAX}
          placeholder="不填则自动截取正文开头"
          className={`${inputCls} h-auto py-3`}
        />
      </div>

      <div>
        <span className={labelCls}>封面图</span>
        <div className="flex items-start gap-4">
          {coverImage && (
            <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-xl border border-border">
              <Image src={coverImage} alt="封面预览" fill className="object-cover" sizes="176px" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-muted transition-colors duration-200 hover:border-accent hover:text-accent">
              {uploading ? "上传中…" : coverImage ? "更换封面" : "上传封面"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleCoverFile}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {coverImage && (
              <button
                type="button"
                onClick={() => setCoverImage("")}
                className="cursor-pointer text-left text-sm text-red-500 hover:underline"
              >
                移除封面
              </button>
            )}
            <p className="text-xs text-muted">支持 JPG / PNG / WebP / GIF，最大 5MB</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="post-category" className={labelCls}>
            分类
          </label>
          <select
            id="post-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="">（无分类）</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="post-series" className={labelCls}>
            系列 / 专题
          </label>
          <select
            id="post-series"
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="">（无系列）</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="post-tags" className={labelCls}>
          标签
        </label>
        <input
          id="post-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Next.js, 前端"
          className={inputCls}
        />
      </div>

      <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
        <label className={labelCls}>正文（Markdown）</label>
        <MDEditor value={content} onChange={(v) => setContent(v ?? "")} height={420} />
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="size-4 cursor-pointer accent-[var(--accent)]"
          />
          置顶
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="size-4 cursor-pointer accent-[var(--accent)]"
          />
          设为精选
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(true)}
          className={`${primaryBtnCls} w-auto px-8`}
        >
          {pending ? "保存中…" : "发布"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(false)}
          className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-border px-8 text-sm font-semibold transition-colors duration-200 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          存为草稿
        </button>
        {lastSavedAt && (
          <span className="text-xs text-muted">
            已自动保存 {lastSavedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
