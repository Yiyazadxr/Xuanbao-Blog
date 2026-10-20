import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 下划线前缀的变量/参数视为有意忽略（如从 props 解构排除 react-markdown 的 node）
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  // 客户端组件禁止引入服务端模块：这些模块依赖 Prisma 客户端或 Node API，
  // 被打进浏览器包时类型检查不报错，只在运行时炸。
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/prisma", "@/lib/permissions-server", "@/lib/rate-limit", "@/lib/mail"],
              message: "客户端组件不能引入服务端模块（Prisma / 权限查询 / 限流 / 邮件）。",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    // eslint-config-next 默认忽略项
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 归档和 Prisma 生成代码
    "_legacy/**",
    "lib/generated/**",
  ]),
]);

export default eslintConfig;
