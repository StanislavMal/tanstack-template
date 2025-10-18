// 📄 src/router.tsx

import { createRouter as createTanstackRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next' // -> ИЗМЕНЕНИЕ

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './styles.css'

// -> ИЗМЕНЕНИЕ: Компонент теперь использует хук для перевода
const NotFoundComponent = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-6xl font-bold text-orange-500">404</h1>
      <p className="mt-4 text-2xl">{t('pageNotFound')}</p>
      <a href="/" className="mt-8 px-4 py-2 text-white bg-orange-600 rounded hover:bg-orange-700">
        {t('goHome')}
      </a>
    </div>
  );
};


// Create a new router instance
export const createRouter = () => {
  const router = createTanstackRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: NotFoundComponent,
  })
  return router
}

const router = createRouter()

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}