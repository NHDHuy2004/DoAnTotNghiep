import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Thư mục skill/guide kèm dự án — không phải mã ứng dụng,
    // chứa script & test mẫu dùng CommonJS nên không hợp quy ước lint của Next.
    "skills/**",
  ]),
]);

export default eslintConfig;
