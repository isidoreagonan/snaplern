import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "vercel",
    vercel: {
      functions: {
        maxDuration: 60
      }
    }
  },
});
