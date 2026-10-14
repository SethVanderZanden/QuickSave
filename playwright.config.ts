import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/electron",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
