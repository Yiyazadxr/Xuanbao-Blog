import type { PostListItem } from "@/lib/posts";

export type PostPageFilters = { categorySlug?: string; tagSlug?: string; seriesSlug?: string };
export type PostPageResponse = {
  posts: (Omit<PostListItem, "createdAt"> & { createdAt: string })[];
  total: number;
  page: number;
};

export type PostSearchResponse = {
  posts: (Omit<PostListItem, "createdAt"> & { createdAt: string; snippet: string | null })[];
  total: number;
  page: number;
};

export type PostConflict = {
  updatedAt: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
};
