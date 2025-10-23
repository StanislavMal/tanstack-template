import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required.')
}

// Определяем storage в зависимости от окружения (SSR или клиент)
const getStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage
  }
  // Для SSR возвращаем заглушку, которая ничего не делает
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }
}

// Создаем и экспортируем клиент Supabase с настройками сохранения сессии
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Сохранять сессию между перезагрузками
    storageKey: 'supabase.auth.token', // Ключ для хранения в localStorage
    storage: getStorage(), // Используем localStorage на клиенте, заглушку на сервере
    autoRefreshToken: true, // Автоматически обновлять токен
    detectSessionInUrl: true, // Определять сессию из URL (для magic links и т.д.)
  }
})