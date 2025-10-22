import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required.')
}

// -> ИСПРАВЛЕНИЕ: Правильная проверка SSR/CSR
const isServer = typeof window === 'undefined';

// -> ИСПРАВЛЕНИЕ: Создаем storage adapter который безопасен для SSR
const customStorageAdapter = {
  getItem: (key: string) => {
    if (isServer) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (isServer) return;
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to set item in localStorage:', error);
    }
  },
  removeItem: (key: string) => {
    if (isServer) return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item from localStorage:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'supabase.auth.token',
    storage: customStorageAdapter, // -> ИСПРАВЛЕНИЕ: Явно указываем adapter
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // -> ИСПРАВЛЕНИЕ: Убрали flowType: 'pkce' - он вызывает конфликты
  }
})