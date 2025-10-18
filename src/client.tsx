// 📄 src/client.tsx (Исправленная версия)

import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start'
import * as Sentry from '@sentry/react'
// import { Suspense } from 'react' // -> ИЗМЕНЕНИЕ: Suspense больше не нужен здесь

import { createRouter } from './router'
import { initSentry } from './sentry'

// Импортируем конфигурацию i18n
import './i18n'

initSentry()

const router = createRouter()

const AppComponent = process.env.SENTRY_DSN
  ? Sentry.withErrorBoundary(StartClient, {
      fallback: () => <div>An error has occurred. Our team has been notified.</div>,
    })
  : StartClient

// -> ИЗМЕНЕНИЕ: Убираем обертку Suspense
hydrateRoot(document, <AppComponent router={router} />)