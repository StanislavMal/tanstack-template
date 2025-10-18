// 📄 src/routes/__root.tsx

import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AuthProvider } from '../providers/AuthProvider' 

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      // -> ИЗМЕНЕНИЕ: Добавлены `maximum-scale=1` и `user-scalable=no` для предотвращения зума на мобильных устройствах
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
      { title: 'AI Chat (Supabase & Gemini)' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: () => (
    <RootDocument>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
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
        <AuthProvider>
          {children}
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}