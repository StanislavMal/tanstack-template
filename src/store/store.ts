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

export interface Conversation {
  id: string
  title: string
  messages: Message[]
}

export interface State {
  prompts: Prompt[]
  settings: UserSettings | null
  conversations: Conversation[]
  currentConversationId: string | null
  isLoading: boolean
}

const initialState: State = {
  prompts: [],
  settings: null,
  conversations: [],
  currentConversationId: null,
  isLoading: false
}

export const store = new Store<State>(initialState)

export const actions = {
  // -> ИЗМЕНЕНИЕ: Заменяем updateMessageContent на более универсальный
  editMessage: (conversationId: string, messageId: string, newContent: string) => {
    store.setState(state => {
      const convIndex = state.conversations.findIndex(c => c.id === conversationId);
      if (convIndex === -1) return state;

      const newConversations = [...state.conversations];
      const conversation = { ...newConversations[convIndex] };
      
      const msgIndex = conversation.messages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return state;

      const newMessages = [...conversation.messages];
      // Обновляем сообщение
      newMessages[msgIndex] = { ...newMessages[msgIndex], content: newContent };
      // Удаляем все сообщения *после* отредактированного
      newMessages.splice(msgIndex + 1);

      conversation.messages = newMessages;
      newConversations[convIndex] = conversation;

      return { ...state, conversations: newConversations };
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
  getSettings: (state: State) => state.settings,
  getActivePrompt: (state: State) => state.prompts.find(p => p.is_active),
  getPrompts: (state: State) => state.prompts,
  getCurrentConversation: (state: State) => 
    state.conversations.find(c => c.id === state.currentConversationId),
  getConversations: (state: State) => state.conversations,
  getCurrentConversationId: (state: State) => state.currentConversationId,
  getIsLoading: (state: State) => state.isLoading
}