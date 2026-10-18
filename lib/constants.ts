// 站点共享配置。
const SHORT_NAME = "暄宝xr";

export const SITE = {
  name: "Xuanbao.dev",
  shortName: SHORT_NAME,
  description: `欢迎来到${SHORT_NAME}的个人博客。`,
  // sitemap、RSS 和元数据使用此公开域名。
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // 建站日期，用于页脚运行天数。
  launchedAt: "2026-07-17",
};

// 查询保护上限；分页 UI 仍在客户端工作，避免一次请求拖入整张表。
export const QUERY_LIMITS = {
  postList: 50,
  searchPage: 20,
  archive: 1000,
  seriesAdjacent: 200,
  // sitemap 语义上收录最新条目；超出上限的旧条目不进 sitemap。
  sitemap: 5000,
} as const;

// 邮箱与 QQ 号仅在客户端组件中拼接渲染，不出现在 SSR HTML（见 EmailCard / QQCard）
export const CONTACT = {
  email: "412110785@qq.com",
  qq: "412110785",
  github: "https://github.com/Yiyazadxr",
} as const;

// 顶部导航栏目
export const NAV_LINKS = [
  { label: "首页", href: "/" },
  { label: "文章", href: "/blog" },
  { label: "社交", href: "/social" },
  { label: "工具", href: "/tools" },
  { label: "关于作者", href: "/about" },
] as const;

/* 页面内容配置 */

// 社交链接（social 页 + 关于页使用）
// QQ 和邮箱由客户端组件渲染，不进入 SSR HTML。
export const SOCIAL_LINKS = [
  {
    name: "GitHub",
    icon: "ph:github-logo-bold",
    url: "https://github.com/Yiyazadxr",
    description: "我的开源项目和代码",
  },
] as const;

// 友情链接（social 页使用）
export const FRIEND_LINKS: { name: string; url: string; description: string }[] = [
  // { name: "示例友链", url: "https://example.com", description: "一句话介绍" },
];

// 分类顺序
export const TOOL_CATEGORIES = [
  "设计/创意",
  "开发/部署",
  "安全/网络",
  "文件处理",
  "实用工具",
  "资源/学习",
] as const;

// 常用工具推荐（tools 页使用）
export const TOOLS = [
  {
    name: "中国色",
    icon: "ph:swatches-bold",
    url: "https://zhongguose.com/",
    description: "中国传统颜色百科，500+颜色名称/色值/拼音与AI配色工具",
    category: "设计/创意",
  },
  {
    name: "APPLORE",
    icon: "ph:app-window-bold",
    url: "https://app.uiboy.com/",
    description: "App 图标灵感库，浏览分析各平台应用图标设计",
    category: "设计/创意",
  },
  {
    name: "Canva",
    icon: "ph:paint-brush-bold",
    url: "https://www.canva.com/",
    description: "在线设计平台，海报/PPT/社交媒体图片一键搞定",
    category: "设计/创意",
  },
  {
    name: "Flourish",
    icon: "ph:chart-bar-bold",
    url: "https://app.flourish.studio/",
    description: "在线数据可视化，无需代码创建交互式图表、地图与故事",
    category: "设计/创意",
  },
  {
    name: "Iconify",
    icon: "ph:palette-bold",
    url: "https://icon-sets.iconify.design/",
    description: "20 万+ 免费图标，本站图标都来自这里",
    category: "设计/创意",
  },
  {
    name: "uiverse",
    icon: "ph:cursor-click-bold",
    url: "https://uiverse.io/",
    description: "开源 CSS/HTML UI 组件库，按钮/卡片/开关等可直接复制使用",
    category: "设计/创意",
  },
  {
    name: "VS Code",
    icon: "ph:code-bold",
    url: "https://code.visualstudio.com/",
    description: "主力代码编辑器，插件生态丰富",
    category: "开发/部署",
  },
  {
    name: "ToolRunner",
    icon: "ph:wrench-bold",
    url: "https://toolrunner.dev/",
    description: "浏览器端开发者工具箱，JSON、正则、JWT、Base64 等 20+ 工具，数据不上传",
    category: "开发/部署",
  },
  {
    name: "Ray.so",
    icon: "ph:sun-horizon-bold",
    url: "https://ray.so/",
    description: "精美代码截图生成器，一键将代码片段导出为高清图片",
    category: "开发/部署",
  },
  {
    name: "CodePen",
    icon: "ph:brackets-curly-bold",
    url: "https://codepen.io/",
    description: "前端代码在线演示与分享，支持实时预览 HTML/CSS/JS",
    category: "开发/部署",
  },
  {
    name: "Flutter",
    icon: "ph:devices-bold",
    url: "https://flutter.dev/",
    description: "Google 跨平台 UI 框架，一套代码构建 Web/移动端/桌面应用",
    category: "开发/部署",
  },
  {
    name: "Vercel",
    icon: "ph:triangle-bold",
    url: "https://vercel.com/",
    description: "前端云部署平台，Next.js 官方出品，零配置一键发布",
    category: "开发/部署",
  },
  {
    name: "Neon",
    icon: "ph:database-bold",
    url: "https://console.neon.tech/",
    description: "Serverless PostgreSQL 数据库，按用量付费，免费额度友好",
    category: "开发/部署",
  },
  {
    name: "UApiPro",
    icon: "ph:plugs-bold",
    url: "https://uapis.cn/",
    description: "免费公共 REST API 平台，100+ 接口涵盖网络/文本/图片/翻译等",
    category: "开发/部署",
  },
  {
    name: "BootCDN",
    icon: "ph:cloud-bold",
    url: "https://www.bootcdn.cn/",
    description: "国内 CDN 加速，前端公共库免费引用，速度快且稳定",
    category: "开发/部署",
  },
  {
    name: "VirusTotal",
    icon: "ph:scan-bold",
    url: "https://www.virustotal.com/",
    description: "多引擎在线病毒扫描，支持文件/URL/域名/IP 检测",
    category: "安全/网络",
  },
  {
    name: "VirScan",
    icon: "ph:shield-checkered-bold",
    url: "https://www.virscan.org/",
    description: "多引擎在线病毒扫描，非盈利免费服务，整合数十家杀毒引擎",
    category: "安全/网络",
  },
  {
    name: "微步在线",
    icon: "ph:magnifying-glass-bold",
    url: "https://x.threatbook.com/",
    description: "威胁情报社区，支持IP/域名/文件哈希查询与分析",
    category: "安全/网络",
  },
  {
    name: "CVE Details",
    icon: "ph:bug-bold",
    url: "https://www.cvedetails.com/",
    description: "漏洞数据库，查询 CVE 编号详情、影响范围与修复方案",
    category: "安全/网络",
  },
  {
    name: "who.cx",
    icon: "ph:globe-bold",
    url: "https://who.cx/",
    description: "域名 Whois 查询，支持注册商/DNS/备案等详细信息检索",
    category: "安全/网络",
  },
  {
    name: "ip.sb",
    icon: "ph:map-pin-bold",
    url: "https://ip.sb/",
    description: "IP 地址查询，支持 IPv4/IPv6/GeoIP/Whois/ASN 信息",
    category: "安全/网络",
  },
  {
    name: "ipinfo",
    icon: "ph:globe-bold",
    url: "https://ipinfo.io/",
    description: "一键查看我的公网 IP 及归属地，ISP/ASN/时区一目了然",
    category: "安全/网络",
  },
  {
    name: "FreeConvert",
    icon: "ph:arrows-clockwise-bold",
    url: "https://www.freeconvert.com/",
    description: "在线文件转换，支持1500+格式，涵盖视频/图片/音频/文档",
    category: "文件处理",
  },
  {
    name: "convert.io",
    icon: "ph:files-bold",
    url: "https://convert.io/cn/",
    description: "在线转换音视频、图片、PDF、电子书等文件格式",
    category: "文件处理",
  },
  {
    name: "TinyPNG",
    icon: "ph:image-bold",
    url: "https://tinypng.com/",
    description: "智能图片压缩，支持 PNG/JPEG，画质几乎无损",
    category: "文件处理",
  },
  {
    name: "纸由我",
    icon: "ph:notepad-bold",
    url: "https://paperme.toolooz.com/",
    description: "自定义打印纸生成器，横线/方格/书法格等，支持导出 PDF",
    category: "实用工具",
  },
  {
    name: "CuePrompter",
    icon: "ph:video-bold",
    url: "https://cueprompter.com/",
    description: "免费在线提词器，浏览器即用，支持滚动速度/镜像/配色调节",
    category: "实用工具",
  },
  {
    name: "draw.io",
    icon: "ph:git-branch-bold",
    url: "https://app.diagrams.net/",
    description: "免费在线流程图/思维导图/UML/架构图绘制工具",
    category: "实用工具",
  },
  {
    name: "标准地图服务",
    icon: "ph:map-trifold-bold",
    url: "http://bzdt.ch.mnr.gov.cn/",
    description: "自然资源部官方标准地图下载，中国全图/世界地图/区域地图",
    category: "实用工具",
  },
  {
    name: "软仓",
    icon: "ph:package-bold",
    url: "https://www.ruancang.net/",
    description: "专业软件资源导航，Adobe/AutoCAD/3ds Max 等下载与教程",
    category: "资源/学习",
  },
  {
    name: "校徽大全",
    icon: "ph:graduation-cap-bold",
    url: "https://www.urongda.com/",
    description: "中国大学矢量校徽资源平台，800+校徽免费下载 SVG/PNG",
    category: "资源/学习",
  },
  {
    name: "默沙东诊疗手册",
    icon: "ph:stethoscope-bold",
    url: "https://www.msdmanuals.cn/",
    description: "自1899年起的权威医学信息，涵盖所有医学领域，免费查阅",
    category: "资源/学习",
  },
  {
    name: "World Vector Logo",
    icon: "ph:star-bold",
    url: "https://worldvectorlogo.com/zh",
    description: "全球品牌 SVG 矢量标志免费下载，无需注册，无限量",
    category: "资源/学习",
  },
] as const;

// 技能标签（about 页使用，按 基础 → 前端/图形 → 桌面 → 移动 → 后端/运维 排序）
export const SKILLS = [
  "HTML / CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Tailwind CSS",
  "Three.js",
  "WebGL / GLSL",
  "Electron",
  "Kotlin",
  "Flutter",
  "Node.js",
  "Prisma",
  "PostgreSQL",
  "Python",
  "Docker",
] as const;

// 时间线：只记录本站（玄豹博客）自己的里程碑，不掺其它项目
export const TIMELINE = [
  {
    time: "2025",
    dateTime: "2025",
    title: "手写博客起步",
    description: "从零用 HTML/CSS 手写页面，搭起最早的个人站点",
  },
  {
    time: "2026.07",
    dateTime: "2026-07",
    title: "全栈重构启动",
    description: "用 Next.js 16 + Prisma 7 重建项目，完成布局、文章、认证、后台与评论系统",
  },
  {
    time: "2026.08",
    dateTime: "2026-08",
    title: "功能体系成型",
    description: "四级权限、站内通知与邀请制注册落地，接入 Vercel 与 PostgreSQL，项目在 GitHub 开源",
  },
  {
    time: "2026.09",
    dateTime: "2026-09",
    title: "质量与体验打磨",
    description: "补单元测试与 CI，完善文档与合规，加入动效体系、中文 slug 与首页节日彩蛋",
  },
  {
    time: "2026.10",
    dateTime: "2026-10",
    title: "安全与性能加固",
    description:
      "服务端全文搜索与分页、认证与写入一致性、浏览统计防刷与安全审计修复，并持续打磨阅读体验与动效",
  },
] as const;
