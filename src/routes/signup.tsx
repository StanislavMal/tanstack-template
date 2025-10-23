// 📄 src/routes/signup.tsx

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router' // <- ИЗМЕНЕНИЕ: Вернули useNavigate
import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/signup')({
  component: SignupComponent,
})

function SignupComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate() // <- ИЗМЕНЕНИЕ: Добавили хук
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const allowRegistration = import.meta.env.VITE_ALLOW_REGISTRATION !== 'false';

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setMessage(t('signupSuccess'))
      // ИЗМЕНЕНИЕ: Добавляем перенаправление через 2 секунды
      setTimeout(() => {
        navigate({ to: '/login' });
      }, 2000);
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        {allowRegistration ? (
          <>
            <h2 className="text-2xl font-bold text-center">{t('signup')}</h2>
            <form onSubmit={handleSignup} className="space-y-6">
              <input
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
                disabled={!!message} // ИЗМЕНЕНИЕ: Блокируем поля после успеха
              />
              <input
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
                disabled={!!message} // ИЗМЕНЕНИЕ: Блокируем поля после успеха
              />
              <button type="submit" disabled={loading || !!message} className="w-full px-4 py-2 font-bold text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:bg-gray-500">
                {loading ? t('signingUp') : t('signup')}
              </button>
              {error && <p className="text-red-500 text-center">{error}</p>}
              {message && <p className="text-green-500 text-center">{message}</p>}
            </form>
            <p className="text-center">
              {t('signupPrompt')}{' '}
              <Link to="/login" className="text-orange-400 hover:underline">
                {t('login')}
              </Link>
            </p>
          </>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-center">Регистрация отключена</h2>
            <p className="mt-4 text-gray-400">
              В данный момент регистрация новых пользователей временно приостановлена.
            </p>
            <p className="mt-6">
              <Link to="/login" className="text-orange-400 hover:underline">
                Вернуться на страницу входа
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
