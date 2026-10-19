// Server Action 和 Route Handler 不信任客户端入参。
import { z } from "zod";

export const postViewSchema = z.object({
  postId: z.string().min(1).max(100),
  // 兼容旧客户端；统计字数始终使用数据库值。
  wordCount: z.number().int().min(0).max(10_000_000).nullable().optional(),
}).strict();
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FOOTER_PY_MAX,
  FOOTER_PY_MIN,
  HEADER_H_MAX,
  HEADER_H_MIN,
  PROSE_LEADING_MAX,
  PROSE_LEADING_MIN,
  SPACING_SCALE_MAX,
  SPACING_SCALE_MIN,
  WAVE_INTENSITY_MAX,
  WAVE_INTENSITY_MIN,
} from "@/lib/display";
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/lib/notification-types";

// 为未显式声明的 Zod 错误提供中文文案。
z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "invalid_type":
        return "参数类型不合法";
      case "too_small":
        return "参数值过小";
      case "too_big":
        return "参数值过大";
      case "invalid_value":
        return "参数值不合法";
      case "invalid_format":
        return "参数格式不正确";
      case "unrecognized_keys":
        return "存在多余参数";
      default:
        return "参数不合法";
    }
  },
});

// parseId 的首条错误会展示给用户，规则必须提供中文文案。
export const idSchema = z.object({
  id: z.string({ error: "ID 不合法" }).trim().min(1, "缺少 ID").max(100, "ID 过长"),
});

export const emailSchema = z
  .string({ error: "邮箱格式不正确" })
  .trim()
  .toLowerCase()
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "邮箱格式不正确");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "密码不合法" }).min(1, "请输入密码").max(200, "密码过长"),
});

// 注册与资料设置共用昵称约束。
export const displayNameSchema = z
  .string({ error: "昵称不合法" })
  .trim()
  .min(1, "请输入昵称")
  .max(30, "昵称最长 30 字");

export const registerSchema = z.object({
  code: z.string({ error: "邀请码不合法" }).trim().min(1, "请输入邀请码").max(100, "邀请码过长"),
  name: displayNameSchema,
  email: emailSchema,
});

export const applySchema = z.object({
  email: emailSchema,
  message: z
    .string({ error: "申请说明不合法" })
    .trim()
    .max(500, "申请说明最长 500 字")
    .optional(),
});

// 验证邮箱时设置密码；申请阶段不接收密码。
export const verifyPasswordSchema = z
  .object({
    password: z.string({ error: "密码不合法" }).min(8, "密码至少 8 位").max(72, "密码最长 72 位"),
    confirmPassword: z.string({ error: "密码不合法" }).min(1, "请再次输入密码"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "两次密码不一致",
    path: ["confirmPassword"],
  });

export const updateNameSchema = z.object({ name: displayNameSchema });

export const changePasswordSchema = z.object({
  currentPassword: z.string({ error: "密码不合法" }).min(1, "请输入当前密码").max(72, "密码过长"),
  newPassword: z.string({ error: "密码不合法" }).min(8, "新密码至少 8 位").max(72, "新密码最长 72 位"),
  confirmPassword: z.string({ error: "密码不合法" }).min(1, "请再次输入新密码"),
});

// 摘要长度由前后端共用。
export const EXCERPT_MAX = 500;

export const postSchema = z.object({
  id: z.string().trim().max(100, "文章 ID 过长").optional(),
  expectedUpdatedAt: z.iso.datetime().optional(),
  title: z.string().trim().min(1, "标题不能为空").max(200, "标题最长 200 字"),
  slug: z.string().trim().max(200, "链接标识过长").optional().default(""),
  content: z
    .string()
    .max(1_000_000, "正文过长")
    .refine((v) => v.trim().length > 0, "正文不能为空"),
  excerpt: z.string().trim().max(EXCERPT_MAX, `摘要最长 ${EXCERPT_MAX} 字`).optional().default(""),
  coverImage: z.string().trim().max(500, "封面地址过长").nullable().optional().default(null),
  categoryId: z.string().trim().max(100, "分类 ID 过长").nullable().optional().default(null),
  seriesId: z.string().trim().max(100, "系列 ID 过长").nullable().optional().default(null),
  tags: z.string().max(1000, "标签过长").optional().default(""),
  published: z.boolean(),
  featured: z.boolean(),
  pinned: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
});

export const commentSchema = z.object({
  postId: z.string({ error: "文章 ID 不合法" }).trim().min(1, "缺少文章 ID").max(100, "文章 ID 过长"),
  slug: z.string({ error: "文章标识不合法" }).trim().min(1, "缺少文章标识").max(200, "文章标识过长"),
  content: z.string().trim().min(1, "评论内容不能为空").max(1000, "评论最多 1000 字"),
  parentId: z.string().trim().max(100, "父评论 ID 过长").nullable().optional(),
});

export const likeSchema = z.object({
  postId: z.string({ error: "文章 ID 不合法" }).trim().min(1, "缺少文章 ID").max(100, "文章 ID 过长"),
  slug: z.string({ error: "文章标识不合法" }).trim().min(1, "缺少文章标识").max(200, "文章标识过长"),
});

export const postPageQuerySchema = z.object({
  page: z.string().max(16).optional(),
  categorySlug: z.string().trim().min(1).max(200).optional(),
  tagSlug: z.string().trim().min(1).max(200).optional(),
  seriesSlug: z.string().trim().min(1).max(200).optional(),
}).strict();

export const postSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  page: z.string().max(16).optional(),
}).strict();

export const commentCursorSchema = z.object({
  id: z.string().min(1).max(100),
  createdAt: z.iso.datetime(),
});

// 游标不依赖对应评论仍存在。
export const commentPageSchema = z.object({
  postId: z.string({ error: "文章 ID 不合法" }).trim().min(1, "缺少文章 ID").max(100, "文章 ID 过长"),
  cursor: commentCursorSchema.nullable(),
});

export const roleSchema = z.object({
  userId: z.string({ error: "用户 ID 不合法" }).trim().min(1, "缺少用户 ID").max(100, "用户 ID 过长"),
  role: z.enum(["ADMIN", "MEMBER"], "角色不合法"),
});

// days=0 表示永久禁言；1~3650 表示定时禁言。
export const muteSchema = z.object({
  userId: z.string({ error: "用户 ID 不合法" }).trim().min(1, "缺少用户 ID").max(100, "用户 ID 过长"),
  days: z.number().int().min(0, "禁言时长不合法").max(3650, "禁言时长不合法"),
  reason: z.string().trim().max(200, "原因最长 200 字").optional().default(""),
});

export const permissionSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"], "角色不合法"),
  permissions: z.array(z.string({ error: "权限名不合法" }).max(100, "权限名过长")),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(50, "名称最长 50 字"),
  description: z.string().trim().max(200, "描述最长 200 字").optional().default(""),
});

export const tagSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(50, "名称最长 50 字"),
});

export const seriesSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(50, "名称最长 50 字"),
  description: z.string().trim().max(200, "描述最长 200 字").optional().default(""),
});

// 显示偏好范围复用 lib/display 常量。
export const displayPreferencesSchema = z.object({
  fontScale: z.number().min(FONT_SCALE_MIN, "字体缩放参数不合法").max(FONT_SCALE_MAX, "字体缩放参数不合法"),
  spacingScale: z.number().min(SPACING_SCALE_MIN, "页面间距参数不合法").max(SPACING_SCALE_MAX, "页面间距参数不合法"),
  density: z.enum(["compact", "normal", "comfortable", "custom"], "界面密度参数不合法"),
  headerH: z
    .number()
    .int()
    .min(HEADER_H_MIN, "页头高度参数不合法")
    .max(HEADER_H_MAX, "页头高度参数不合法")
    .nullable(),
  footerPy: z
    .number()
    .int()
    .min(FOOTER_PY_MIN, "页脚间距参数不合法")
    .max(FOOTER_PY_MAX, "页脚间距参数不合法")
    .nullable(),
  waveIntensity: z
    .number()
    .min(WAVE_INTENSITY_MIN, "水墨强度参数不合法")
    .max(WAVE_INTENSITY_MAX, "水墨强度参数不合法")
    .nullable(),
  inkEnabled: z.boolean().nullable(),
  reduceMotion: z.boolean().nullable(),
  proseLeading: z
    .number()
    .min(PROSE_LEADING_MIN, "正文行距参数不合法")
    .max(PROSE_LEADING_MAX, "正文行距参数不合法")
    .nullable(),
  smoothScroll: z.boolean().nullable(),
  readingProgress: z.boolean().nullable(),
});

export const batchPostsSchema = z.object({
  ids: z
    .array(z.string({ error: "文章 ID 不合法" }).min(1, "缺少文章 ID").max(100, "文章 ID 过长"))
    .min(1, "请选择文章")
    .max(200, "一次最多 200 篇"),
  operation: z.enum(["publish", "unpublish", "archive", "delete", "category"], "操作类型不合法"),
  categoryId: z.string().max(100, "分类 ID 过长").nullable().optional(),
});

export const freeInviteSchema = z.object({
  expiresInDays: z.number().int().min(1, "有效期至少 1 天").max(365, "有效期最长 365 天").optional().default(7),
  maxUses: z.number().int().min(1, "可用次数至少 1 次").max(1000, "可用次数最多 1000 次").optional().default(1),
});

// 通知分类与 NOTIFICATION_CATEGORIES 同源。
export const notificationCategorySchema = z.enum(
  Object.values(NOTIFICATION_CATEGORIES) as [NotificationCategory, ...NotificationCategory[]],
  "通知分类不合法"
);

export const notificationsQuerySchema = z.object({
  category: z.union([z.literal("all"), notificationCategorySchema]),
  cursor: z.object({
    id: z.string().trim().min(1).max(100),
    lastMergedAt: z.iso.datetime(),
  }).strict().optional(),
});

// 仅返回统一文案，不暴露 Zod 错误结构。
export type ParseOutcome<T> = { data: T | null; error?: string };

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): ParseOutcome<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { data: null, error: result.error.issues[0]?.message ?? "参数不合法" };
  }
  return { data: result.data };
}

export function parseId(id: unknown): ParseOutcome<string> {
  const result = idSchema.safeParse({ id });
  if (!result.success) return { data: null, error: result.error.issues[0]?.message ?? "参数不合法" };
  return { data: result.data.id };
}
