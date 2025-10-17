// 📄 store/store.ts
import { Store } from '@tanstack/store'
import type { Message } from '../utils/ai'

// --- ИЗМЕНЕНИЯ: Обновленные типы ---
export interface Prompt {
  id: string // UUID из БД
  name: string
  content: string
  is_active: boolean
}

export interface UserSettings {
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro'
  system_instruction: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
}

export interface State {
  prompts: Prompt[]
  settings: UserSettings | null // Настройки будут загружаться
  conversations: Conversation[]
  currentConversationId: string | null
  isLoading: boolean
}

const initialState: State = {
  prompts: [],
  settings: null, // Изначально настроек нет
  conversations: [],
  currentConversationId: null,
  isLoading: false
}

export const store = new Store<State>(initialState)

export const actions = {
  // --- НОВЫЕ ACTIONS ---
  setSettings: (settings: UserSettings) => {
    store.setState(state => ({ ...state, settings }));
  },
  
  setPrompts: (prompts: Prompt[]) => {
    store.setState(state => ({ ...state, prompts }));
  },

  // --- ACTIONS ДЛЯ ЧАТОВ (без изменений) ---
  setConversations: (conversations: Conversation[]) => {
    store.setState(state => ({ ...state, conversations }))
  },

  setCurrentConversationId: (id: string | null) => {
    store.setState(state => ({ ...state, currentConversationId: id }))
  },

  addConversation: (conversation: Conversation) => {
    store.setState(state => ({
      ...state,
      conversations: [...state.conversations, conversation],
      currentConversationId: conversation.id
    }))
  },

  updateConversationTitle: (id: string, title: string) => {
    store.setState(state => ({
      ...state,
      conversations: state.conversations.map(conv =>
        conv.id === id ? { ...conv, title } : conv
      )
    }))
  },

  deleteConversation: (id: string) => {
    store.setState(state => ({
      ...state,
      conversations: state.conversations.filter(conv => conv.id !== id),
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId
    }))
  },

  addMessage: (conversationId: string, message: Message) => {
    store.setState(state => ({
      ...state,
      conversations: state.conversations.map(conv =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, message] }
          : conv
      )
    }))
  },

  setLoading: (isLoading: boolean) => {
    store.setState(state => ({ ...state, isLoading }))
  }
}

// Selectors
export const selectors = {
  // --- НОВЫЕ И ОБНОВЛЕННЫЕ SELECTORS ---
  getSettings: (state: State) => state.settings,
  getActivePrompt: (state: State) => state.prompts.find(p => p.is_active),
  getPrompts: (state: State) => state.prompts,
  // --- Старые селекторы без изменений ---
  getCurrentConversation: (state: State) => 
    state.conversations.find(c => c.id === state.currentConversationId),
  getConversations: (state: State) => state.conversations,
  getCurrentConversationId: (state: State) => state.currentConversationId,
  getIsLoading: (state: State) => state.isLoading
} 