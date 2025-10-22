// 📄 src/routes/login.tsx

import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';

export const Route = createFileRoute('/login')({
  component: LoginComponent,
})

function LoginComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Если пользователь уже авторизован, перенаправляем на главную
  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: '/' })
    }
  }, [user, authLoading, navigate])

  const allowRegistration = import.meta.env.VITE_ALLOW_REGISTRATION !== 'false';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Навигация произойдет через useEffect выше
    }
  }

  // Показываем загрузку, пока проверяется авторизация
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если авторизован, ничего не показываем (useEffect перенаправит)
  if (user) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center">{t('login')}</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          <input
            type="password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:bg-gray-500">
            {loading ? t('loggingIn') : t('login')}
          </button>
          {error && <p className="text-red-500 text-center">{error}</p>}
        </form>
        {allowRegistration && (
          <p className="text-center">
            {t('loginPrompt')}{' '}
            <Link to="/signup" className="text-orange-400 hover:underline">
              {t('signup')}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}