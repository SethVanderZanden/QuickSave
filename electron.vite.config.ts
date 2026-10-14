import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const alias = { "@": resolve(__dirname, "src") };

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "desktop/main.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "desktop/preload.ts"),
      },
    },
  },
  renderer: {
    root: ".",
    plugins: [react(), tailwindcss()],
    resolve: { alias },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
  },
});
