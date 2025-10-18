// 📄 src/routes/__root.tsx

import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AuthProvider } from '../providers/AuthProvider' 
import { useTranslation } from 'react-i18next' // Импорт остается

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  // -> ИЗМЕНЕНИЕ: Возвращаем `head` к простому объекту без вызова хука.
  // Заголовок `title` отсюда убираем, мы установим его динамически.
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
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
  // -> ИЗМЕНЕНИЕ: Хук `useTranslation` теперь вызывается здесь, ВНУТРИ компонента React. Это правильно.
  const { t } = useTranslation();

  return (
    <html>
      <head>
        {/* -> ИЗМЕНЕНИЕ: Вставляем тег <title> с переведенным текстом прямо сюда. */}
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