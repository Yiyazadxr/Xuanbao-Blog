import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  applySchema,
  batchPostsSchema,
  changePasswordSchema,
  commentPageSchema,
  commentSchema,
  displayPreferencesSchema,
  emailSchema,
  freeInviteSchema,
  idSchema,
  likeSchema,
  muteSchema,
  parseId,
  parseInput,
  postSchema,
  roleSchema,
  updateNameSchema,
  verifyPasswordSchema,
} from "@/lib/validation";

describe("emailSchema", () => {
  it("接受合法邮箱", () => {
    expect(emailSchema.safeParse("a@b.com").success).toBe(true);
  });

  it("拒绝非法邮箱", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("idSchema / parseId", () => {
  it("合法 id 通过", () => {
    expect(parseId("abc123")).toEqual({ data: "abc123" });
  });

  it("空 id 报缺少 ID（传播 zod 文案）", () => {
    expect(parseId("")).toEqual({ data: null, error: "缺少 ID" });
  });

  it("超长 id 报 ID 过长（不漏 zod 默认英文文案）", () => {
    expect(parseId("x".repeat(101))).toEqual({ data: null, error: "ID 过长" });
  });

  it("非字符串 id 报 ID 不合法（不漏 zod 默认英文文案）", () => {
    expect(parseId(123)).toEqual({ data: null, error: "ID 不合法" });
  });
});

describe("postSchema", () => {
  it("标题为空报错", () => {
    const res = postSchema.safeParse({ title: "  ", content: "x", published: false });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0]?.message).toBe("标题不能为空");
  });

  it("正文为空报错", () => {
    const res = postSchema.safeParse({ title: "t", content: "   ", published: false });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0]?.message).toBe("正文不能为空");
  });
});

describe("commentSchema", () => {
  it("空评论报错", () => {
    const res = commentSchema.safeParse({ postId: "p", slug: "s", content: "  " });
    expect(res.success).toBe(false);
  });

  it("超长评论报错", () => {
    const res = commentSchema.safeParse({
      postId: "p",
      slug: "s",
      content: "字".repeat(1001),
    });
    expect(res.success).toBe(false);
  });
});

describe("verifyPasswordSchema", () => {
  it("密码不足 8 位报错", () => {
    const res = verifyPasswordSchema.safeParse({
      password: "1234567",
      confirmPassword: "1234567",
    });
    expect(res.success).toBe(false);
  });

  it("两次密码不一致报错", () => {
    const res = verifyPasswordSchema.safeParse({
      password: "password1",
      confirmPassword: "password2",
    });
    expect(res.success).toBe(false);
  });
});

describe("applySchema / updateNameSchema / changePasswordSchema", () => {
  it("申请说明可省略", () => {
    expect(applySchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });

  it("昵称超长报错", () => {
    const res = updateNameSchema.safeParse({ name: "字".repeat(31) });
    expect(res.success).toBe(false);
  });

  it("确认密码为空报错", () => {
    const res = changePasswordSchema.safeParse({
      currentPassword: "oldpass1",
      newPassword: "newpass1",
      confirmPassword: "",
    });
    expect(res.success).toBe(false);
  });
});

describe("displayPreferencesSchema", () => {
  const base = {
    spacingScale: 1,
    density: "normal" as const,
    headerH: null,
    footerPy: null,
    waveIntensity: null,
    inkEnabled: null,
    reduceMotion: null,
  };

  it("字体缩放低于下限报错（带自定义文案）", () => {
    const res = displayPreferencesSchema.safeParse({ ...base, fontScale: 0.5 });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0]?.message).toBe("字体缩放参数不合法");
  });

  it("字体缩放高于上限报错（同样带自定义文案）", () => {
    const res = displayPreferencesSchema.safeParse({ ...base, fontScale: 2 });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0]?.message).toBe("字体缩放参数不合法");
  });
});

describe("freeInviteSchema", () => {
  it("省略参数应用默认值", () => {
    const parsed = freeInviteSchema.parse({});
    expect(parsed.expiresInDays).toBe(7);
    expect(parsed.maxUses).toBe(1);
  });
});

describe("parseInput", () => {
  it("合法输入返回 data", () => {
    const res = parseInput(idSchema, { id: "x" });
    expect(res.data).toEqual({ id: "x" });
  });

  it("非法输入返回首条错误信息", () => {
    const res = parseInput(idSchema, { id: "" });
    expect(res.data).toBeNull();
    expect(res.error).toBe("缺少 ID");
  });
});

// 这些用例的目的是锁死「不把 zod 默认英文文案透给用户」
describe("错误文案中文化", () => {
  it("commentSchema 缺 postId 报缺少文章 ID", () => {
    const res = parseInput(commentSchema, { postId: "", slug: "s", content: "hi" });
    expect(res.error).toBe("缺少文章 ID");
  });

  it("likeSchema 超长 postId 报文章 ID 过长", () => {
    const res = parseInput(likeSchema, { postId: "x".repeat(101), slug: "s" });
    expect(res.error).toBe("文章 ID 过长");
  });

  it("commentPageSchema 拒绝无效时间游标", () => {
    const res = parseInput(commentPageSchema, { postId: "p", cursor: { id: "c", createdAt: "invalid" } });
    expect(res.error).toBe("参数格式不正确");
  });

  it("roleSchema 非法角色报角色不合法", () => {
    const res = parseInput(roleSchema, { userId: "u", role: "OWNER" });
    expect(res.error).toBe("角色不合法");
  });

  it("muteSchema 天数越界报禁言时长不合法", () => {
    const res = parseInput(muteSchema, { userId: "u", days: 9999 });
    expect(res.error).toBe("禁言时长不合法");
  });

  it("batchPostsSchema 非法操作报操作类型不合法", () => {
    const res = parseInput(batchPostsSchema, { ids: ["a"], operation: "nuke" });
    expect(res.error).toBe("操作类型不合法");
  });

  it("displayPreferencesSchema 页头高度越界报页头高度参数不合法", () => {
    const res = parseInput(displayPreferencesSchema, {
      fontScale: 1,
      spacingScale: 1,
      density: "normal",
      headerH: 99999,
      footerPy: null,
      waveIntensity: null,
      inkEnabled: null,
      reduceMotion: null,
    });
    expect(res.error).toBe("页头高度参数不合法");
  });

  it("全局兜底：未声明文案的类型错误也是中文", () => {
    expect(parseInput(muteSchema, { userId: "u", days: "3" }).error).toBe("参数类型不合法");
  });

  it("全局兜底：临时 schema 的越界错误也是中文", () => {
    expect(parseInput(z.object({ n: z.number().max(10) }), { n: 99 }).error).toBe("参数值过大");
  });
});
