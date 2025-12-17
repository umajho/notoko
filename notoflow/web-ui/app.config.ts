import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  ssr: false,
  server: {
    esbuild: { options: { target: "esnext" } },
    experimental: {
      websocket: true,
    },
  },
}).addRouter({
  name: "live-querying",
  type: "http",
  handler: "./src/server/live-querying.ts",
  target: "server",
  base: "/live-querying.ws",
});
