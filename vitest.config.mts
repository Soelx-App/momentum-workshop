import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "convex", environment: "edge-runtime", include: ["tests/*.test.ts"] } },
      { test: { name: "browser", environment: "jsdom", include: ["tests/browser/**/*.test.{ts,tsx}"] } },
    ],
  },
});
