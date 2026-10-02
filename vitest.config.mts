import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Server UTC'da ishlaydi deb faraz qilamiz — Toshkent vaqtini to'g'ri hisoblashni tekshirish uchun.
    env: { TZ: "UTC" },
  },
});
