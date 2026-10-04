import { revalidatePath } from "next/cache";

/** 文章变更影响详情、分类聚合及公开发现入口。 */
export function revalidatePostContent() {
  revalidatePath("/");
  revalidatePath("/blog", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/feed.xml");
  revalidatePath("/admin/posts");
}
