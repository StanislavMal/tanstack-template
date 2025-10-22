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
  // Для SSR возвращаем заглушку
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }
}

// Создаем и экспортируем клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'supabase.auth.token',
    storage: getStorage(),
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})