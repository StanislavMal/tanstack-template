// 📄 src/routes/__root.tsx

import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { AuthProvider } from '../providers/AuthProvider' 
import { useTranslation } from 'react-i18next'

import appCss from '../styles.css?url'

// Правильный lazy import DevTools только для dev режима
const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null // В production не рендерим
  : lazy(() =>
      import('@tanstack/router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    )

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
      {!import.meta.env.PROD && (
        <Suspense fallback={null}>
          <TanStackRouterDevtools />
        </Suspense>
      )}
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <html>
      <head>
        <title>{t('appTitle')}</title>
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