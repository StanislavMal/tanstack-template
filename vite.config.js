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
    // Only generate source maps if Sentry is enabled
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
    // Увеличим лимит предупреждения о размере чанков (временно)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // Подавляем предупреждения от библиотеки openai о 'this' в ES модулях
      onwarn(warning, warn) {
        // Игнорируем предупреждения о 'this' из node_modules/openai
        if (
          warning.code === 'THIS_IS_UNDEFINED' && 
          warning.id?.includes('node_modules/openai')
        ) {
          return;
        }
        
        // Игнорируем предупреждения о неиспользуемых импортах из @tanstack/start
        if (
          warning.code === 'UNUSED_EXTERNAL_IMPORT' &&
          warning.exporter?.includes('@tanstack/start')
        ) {
          return;
        }
        
        // Показываем все остальные предупреждения
        warn(warning);
      },
      output: {
        // Улучшаем разделение кода для уменьшения размера чанков
        manualChunks(id) {
          // Выносим большие библиотеки в отдельные чанки
          if (id.includes('node_modules')) {
            // React и связанные библиотеки
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            
            // TanStack библиотеки
            if (id.includes('@tanstack')) {
              return 'vendor-tanstack';
            }
            
            // Markdown и подсветка кода
            if (id.includes('react-markdown') || id.includes('rehype') || id.includes('highlight.js')) {
              return 'vendor-markdown';
            }
            
            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            
            // i18n
            if (id.includes('i18next')) {
              return 'vendor-i18n';
            }
            
            // Sentry
            if (id.includes('@sentry')) {
              return 'vendor-sentry';
            }
            
            // Остальные node_modules
            return 'vendor-other';
          }
        },
      },
    },
  },
});