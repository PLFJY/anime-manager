import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const host = process.env.TAURI_DEV_HOST ?? "127.0.0.1";

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("fluent-"),
        },
      },
    }),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host,
  },
});
