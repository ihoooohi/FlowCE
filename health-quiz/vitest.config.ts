import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Integration tests share one Postgres database and truncate between
    // tests — run files sequentially so they don't clobber each other.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
