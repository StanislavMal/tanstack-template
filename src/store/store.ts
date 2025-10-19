// 📄 store/store.ts
import { Store } from '@tanstack/store'
import type { Message } from '../utils/ai'

export interface Prompt {
  id: string
  name: string
  content: string
  is_active: boolean
}

export interface UserSettings {
  model: 'gemini-1.5-flash' | 'gemini-1.5-pro'
  system_instruction: string
}

// -> ИЗМЕНЕНИЕ: Убираем массив 'messages' отсюда
export interface Conversation {
  id: string
  title: string
  user_id: string
  created_at: string
}

export interface State {
  prompts: Prompt[]
  settings: UserSettings | null
  conversations: Conversation[]
  // -> НОВОЕ: Отдельное состояние для сообщений текущего диалога
  currentMessages: Message[] 
  currentConversationId: string | null
  isLoading: boolean
}

const initialState: State = {
  prompts: [],
  settings: null,
  conversations: [],
  currentMessages: [], // -> НОВОЕ
  currentConversationId: null,
  isLoading: false
}

export const store = new Store<State>(initialState)

export const actions = {
  // -> ИЗМЕНЕНИЕ: Полностью переписываем логику работы с сообщениями
  setMessages: (messages: Message[]) => {
    store.setState(state => ({ ...state, currentMessages: messages }));
  },

  addMessage: (message: Message) => {
    store.setState(state => ({
      ...state,
      currentMessages: [...state.currentMessages, message]
    }));
  },

  editMessage: (messageId: string, newContent: string) => {
    store.setState(state => {
      const msgIndex = state.currentMessages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return state;
      
      const newMessages = [...state.currentMessages];
      // Обновляем сообщение
      newMessages[msgIndex] = { ...newMessages[msgIndex], content: newContent };
      // Обрезаем историю после отредактированного сообщения
      const finalMessages = newMessages.slice(0, msgIndex + 1);

      return { ...state, currentMessages: finalMessages };
    });
  },

  // Остальные actions
  setSettings: (settings: UserSettings) => {
    store.setState(state => ({ ...state, settings }));
  },
  
  setPrompts: (prompts: Prompt[]) => {
    store.setState(state => ({ ...state, prompts }));
  },

  setConversations: (conversations: Conversation[]) => {
    store.setState(state => ({ ...state, conversations }))
  },

  setCurrentConversationId: (id: string | null) => {
    store.setState(state => {
      // При смене диалога очищаем старые сообщения
      if (state.currentConversationId !== id) {
        return { ...state, currentConversationId: id, currentMessages: [] };
      }
      return { ...state, currentConversationId: id };
    });
  },

  addConversation: (conversation: Conversation) => {
    store.setState(state => ({
      ...state,
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
      currentMessages: [] // Новый диалог всегда пустой
    }));
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
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
      // Если удалили текущий, чистим сообщения
      currentMessages: state.currentConversationId === id ? [] : state.currentMessages,
    }));
  },
  
  setLoading: (isLoading: boolean) => {
    store.setState(state => ({ ...state, isLoading }))
  }
}

// Selectors
export const selectors = {
  getSettings: (state: State) => state.settings,
  getActivePrompt: (state: State) => state.prompts.find(p => p.is_active),
  getPrompts: (state: State) => state.prompts,
  getCurrentConversation: (state: State) => 
    state.conversations.find(c => c.id === state.currentConversationId),
  getConversations: (state: State) => state.conversations,
  getCurrentConversationId: (state: State) => state.currentConversationId,
  getIsLoading: (state: State) => state.isLoading,
  // -> НОВОЕ: Селектор для получения сообщений
  getCurrentMessages: (state: State) => state.currentMessages,
}