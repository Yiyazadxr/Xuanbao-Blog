import ReactMarkdown from "react-markdown";
import { CodeBlock } from "@/components/blog/CodeBlock";
import { MARKDOWN_REHYPE_PLUGINS, MARKDOWN_REMARK_PLUGINS } from "@/lib/markdown";

// 仅交互式代码块使用客户端组件。
export function PostContent({ content }: { content: string }) {
  return (
    <div className="prose prose-stone dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-headings:tracking-tight prose-a:text-accent prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:m-0 prose-pre:px-4 prose-pre:py-3.5">
      <ReactMarkdown
        remarkPlugins={MARKDOWN_REMARK_PLUGINS}
        rehypePlugins={MARKDOWN_REHYPE_PLUGINS}
        components={{
          pre: CodeBlock,
          // 正文图片延迟加载；alt 由 react-markdown 透传。
          img: (props) => {
            /* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */
            return <img loading="lazy" decoding="async" {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
