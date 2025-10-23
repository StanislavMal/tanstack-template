// 📄 src/store/store.ts

import { Store } from '@tanstack/store'
// -> ИЗМЕНЕНИЕ: Сначала импортируем тип для использования ВНУТРИ этого файла.
import type { Message } from '../lib/ai/types'

// -> ИЗМЕНЕНИЕ: Затем отдельно экспортируем этот импортированный тип для других файлов.
export type { Message }

export interface Prompt {
  id: string
  name: string
  content: string
  is_active: boolean
}

export interface UserSettings {
  model: string
  provider: string
  system_instruction: string
  temperature?: number
  maxTokens?: number
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high'
}

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
  // Теперь 'Message' здесь будет корректно распознан
  currentMessages: Message[] 
  currentConversationId: string | null
  isLoading: boolean
}

const initialState: State = {
  prompts: [],
  settings: null,
  conversations: [],
  currentMessages: [],
  currentConversationId: null,
  isLoading: false
}

export const store = new Store<State>(initialState)

export const actions = {
  // 'Message' здесь также будет корректно распознан
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
      newMessages[msgIndex] = { ...newMessages[msgIndex], content: newContent };
      const finalMessages = newMessages.slice(0, msgIndex + 1);

      return { ...state, currentMessages: finalMessages };
    });
  },

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
      currentMessages: []
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
      currentMessages: state.currentConversationId === id ? [] : state.currentMessages,
    }));
  },
  
  setLoading: (isLoading: boolean) => {
    store.setState(state => ({ ...state, isLoading }))
  }
}

export const selectors = {
  getSettings: (state: State) => state.settings,
  getActivePrompt: (state: State) => state.prompts.find(p => p.is_active),
  getPrompts: (state: State) => state.prompts,
  getCurrentConversation: (state: State) => 
    state.conversations.find(c => c.id === state.currentConversationId),
  getConversations: (state: State) => state.conversations,
  getCurrentConversationId: (state: State) => state.currentConversationId,
  getIsLoading: (state: State) => state.isLoading,
  getCurrentMessages: (state: State) => state.currentMessages,
}