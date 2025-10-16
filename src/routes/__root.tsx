import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
// Убираем Convex, добавляем наш AuthProvider
import { AuthProvider } from '../providers/AuthProvider' 

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'AI Chat (Supabase & Gemini)' }, // Можете поменять заголовок
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  // Компонент верхнего уровня остается без изменений, он вызывает RootDocument
  component: () => (
    <RootDocument>
      <Outlet />
      <TanStackRouterDevtools />
    </RootDocument>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Оборачиваем все дочерние компоненты в AuthProvider */}
        <AuthProvider>
          {children}
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}