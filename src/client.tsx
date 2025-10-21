// 📄 src/client.tsx (Исправленная версия с default export)

import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start'
import * as Sentry from '@sentry/react'

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

// Основная функция рендеринга
function render() {
  hydrateRoot(document, <AppComponent router={router} />)
}

// Default export для Vinxi
export default render

// Вызываем рендеринг
render()