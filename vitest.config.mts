import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "convex", environment: "edge-runtime", include: ["tests/rooms.test.ts"] } },
      { test: { name: "browser", environment: "jsdom", include: ["tests/browser/**/*.test.{ts,tsx}"] } },
    ],
  },
});
