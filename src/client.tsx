// 📄 src/client.tsx

import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start'
import * as Sentry from '@sentry/react'

import { createRouter } from './router'
import { initSentry } from './sentry'
import './i18n'

initSentry()

const router = createRouter()

// ✅ ИСПРАВЛЕНИЕ: Упрощённая версия без избыточного кода
const AppComponent = process.env.SENTRY_DSN
  ? Sentry.withErrorBoundary(StartClient, {
      fallback: () => <div>An error has occurred. Our team has been notified.</div>,
    })
  : StartClient

hydrateRoot(document, <AppComponent router={router} />)