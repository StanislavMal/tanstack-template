import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required.')
}

// -> ИСПРАВЛЕНИЕ: Убираем getStorage() и используем прямую проверку
// Supabase сам определит что использовать на сервере/клиенте
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'supabase.auth.token',
    // -> ИЗМЕНЕНИЕ: Удалили storage - пусть Supabase сам определяет
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // -> ДОБАВЛЕНО: Указываем что хранилище на клиенте
    flowType: 'pkce',
  }
})