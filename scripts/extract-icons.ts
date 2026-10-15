// 提取使用中的 Phosphor 图标到 lib/generated/ph-icons.json。
// 运行：npx tsx scripts/extract-icons.ts
import fs from "fs";
import path from "path";
import phIcons from "@iconify-json/ph/icons.json";

// 新图标必须加入此列表，否则重跑脚本会将其从输出中删除。
const USED_ICONS = [
  "app-window-bold",
  "arrow-left-bold",
  "arrow-right-bold",
  "arrow-up-bold",
  "arrows-clockwise-bold",
  "article-bold",
  "bell-bold",
  "bell-light",
  "brackets-curly-bold",
  "bug-bold",
  "camera-bold",
  "chart-bar-bold",
  "chat-circle-dots-bold",
  "chat-dots-bold",
  "chats-bold",
  "check-bold",
  "cloud-bold",
  "code-bold",
  "copy-bold",
  "cursor-click-bold",
  "database-bold",
  "devices-bold",
  "envelope-bold",
  "files-bold",
  "gauge-bold",
  "git-branch-bold",
  "github-logo-bold",
  "globe-bold",
  "graduation-cap-bold",
  "heart-bold",
  "heart-fill",
  "image-bold",
  "list-bold",
  "magnifying-glass-bold",
  "map-pin-bold",
  "map-trifold-bold",
  "megaphone-bold",
  "moon-bold",
  "notepad-bold",
  "package-bold",
  "paint-brush-bold",
  "palette-bold",
  "pencil-line-bold",
  "plugs-bold",
  "rss-simple-bold",
  "scan-bold",
  "share-network-bold",
  "shield-check-bold",
  "shield-checkered-bold",
  "star-bold",
  "stethoscope-bold",
  "sun-bold",
  "sun-horizon-bold",
  "swatches-bold",
  "tag-bold",
  "ticket-bold",
  "triangle-bold",
  "user-circle-bold",
  "users-bold",
  "video-bold",
  "wrench-bold",
  "x-bold",
] as const;

const set = phIcons as unknown as {
  prefix: string;
  icons: Record<string, unknown>;
  width?: number;
  height?: number;
};

const icons: Record<string, unknown> = {};
const missing: string[] = [];
for (const name of USED_ICONS) {
  if (set.icons[name]) icons[name] = set.icons[name];
  else missing.push(name);
}

if (missing.length > 0) {
  console.error("以下图标在 @iconify-json/ph 中不存在：", missing.join(", "));
  process.exit(1);
}

const outPath = path.join(process.cwd(), "lib", "generated", "ph-icons.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
// 保留集合级 width/height，防止默认 16 viewBox 裁剪图标。
fs.writeFileSync(
  outPath,
  JSON.stringify({ prefix: set.prefix, width: set.width, height: set.height, icons })
);

console.log(`✅ 已提取 ${Object.keys(icons).length} 个图标 -> ${outPath.replace(process.cwd(), ".")}`);
