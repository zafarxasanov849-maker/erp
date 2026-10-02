import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "src/lib/supabase/database.types.ts",
      "supabase/functions/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  {
    // service role klienti faqat cron/webhook'larda va xodim yaratishda (CLAUDE.md qoida 1)
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/api/**", "src/lib/supabase/admin.ts", "src/features/staff/actions.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/admin",
              message:
                "Service role faqat src/app/api/ (cron, webhook) va src/features/staff/actions.ts (xodim yaratish) da.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
