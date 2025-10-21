import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const basePlugins = [
  TanStackRouterVite({ autoCodeSplitting: true }), 
  viteReact(), 
  tailwindcss(),
];

// Add Sentry plugin only if auth token is available
if (process.env.SENTRY_AUTH_TOKEN) {
  basePlugins.push(
    sentryVitePlugin({
      org: "org-name",
      project: "project-name",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: basePlugins,
  build: {
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
    // Поднимаем лимит - TanStack Start сам управляет code-splitting
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, warn) {
        // Игнорируем THIS_IS_UNDEFINED от openai
        if (
          warning.code === 'THIS_IS_UNDEFINED' && 
          warning.id?.includes('node_modules/openai')
        ) {
          return;
        }
        
        // Игнорируем UNUSED_EXTERNAL_IMPORT от TanStack и React
        if (
          warning.code === 'UNUSED_EXTERNAL_IMPORT' &&
          (warning.exporter?.includes('@tanstack') || warning.exporter?.includes('react'))
        ) {
          return;
        }
        
        // Игнорируем предупреждения о externalized модулях
        if (warning.code === 'PLUGIN_WARNING' && warning.plugin === 'vite:resolve') {
          return;
        }
        
        warn(warning);
      },
    },
  },
});