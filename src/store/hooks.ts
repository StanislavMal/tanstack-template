import { useStore } from '@tanstack/react-store';
import { actions, selectors, store, type Conversation } from './store';
import type { Message } from '../utils/ai';
import { supabase } from '../utils/supabase';
import { useAuth } from '../providers/AuthProvider'; // импортируем useAuth

// Этот хук остается без изменений, он просто дает доступ к AppState
export function useAppState() {
  const isLoading = useStore(store, s => selectors.getIsLoading(s));
  const prompts = useStore(store, s => selectors.getPrompts(s)); // Добавляем prompts
  
  return {
    isLoading,
    prompts, // Возвращаем prompts
    
    // Actions
    setLoading: actions.setLoading,
    createPrompt: actions.createPrompt, // Возвращаем action
    deletePrompt: actions.deletePrompt, // Возвращаем action
    setPromptActive: actions.setPromptActive, // Возвращаем action
    
    // Selectors
    getActivePrompt: selectors.getActivePrompt,
  };
}


// --- ПЕРЕПИСЫВАЕМ ХУК ДЛЯ РАБОТЫ С SUPABASE ---
export function useConversations() {
  const { user } = useAuth();
  const conversations = useStore(store, s => selectors.getConversations(s));
  const currentConversationId = useStore(store, s => selectors.getCurrentConversationId(s));
  const currentConversation = useStore(store, s => selectors.getCurrentConversation(s));
  

  return {
    conversations,
    currentConversationId,
    currentConversation,

    setCurrentConversationId: (id: string | null) => {
      actions.setCurrentConversationId(id);
    },

    // Загрузка всех чатов из Supabase
    loadConversations: async () => {
      if (!user) return; // Если пользователя нет, ничего не делаем

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id) // <--- ВАЖНОЕ ИЗМЕНЕНИЕ
        .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading conversations:', error);
            return;
        }
        // Убедимся, что messages не null
        const formattedConversations = data.map(conv => ({
            ...conv,
            messages: conv.messages || []
        }));

        actions.setConversations(formattedConversations as Conversation[]);
    },

    createNewConversation: async (title: string = 'New Conversation') => {
      if (!user) return null; // Защита

      const { data, error } = await supabase
        .from('conversations')
        .insert({ title, messages: [], user_id: user.id }) // <--- ВАЖНОЕ ИЗМЕНЕНИЕ
        .select()
        .single();

      if (error || !data) {
        console.error('Failed to create conversation in Supabase:', error);
        return null;
      }
      
      const newConversation: Conversation = { 
          id: data.id, 
          title: data.title, 
          messages: data.messages || [] 
      };

      // 2. Обновляем локальное состояние
      actions.addConversation(newConversation);
      actions.setCurrentConversationId(newConversation.id);
      return newConversation.id;
    },

    updateConversationTitle: async (id: string, title: string) => {
      actions.updateConversationTitle(id, title); // Оптимистичное обновление
      const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', id);
      if (error) console.error('Failed to update title in Supabase:', error);
    },

    deleteConversation: async (id: string) => {
      actions.deleteConversation(id); // Оптимистичное обновление
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);
      if (error) console.error('Failed to delete conversation from Supabase:', error);
    },

    addMessage: async (conversationId: string, message: Message) => {
      // 1. Получаем текущие сообщения из локального стора
      const conversation = selectors.getCurrentConversation(store.state);
      if (!conversation) return;
      
      const updatedMessages = [...conversation.messages, message];

      // 2. Оптимистично обновляем UI
      actions.addMessage(conversationId, message);

      // 3. Отправляем обновленный массив сообщений в Supabase
      const { error } = await supabase
        .from('conversations')
        .update({ messages: updatedMessages })
        .eq('id', conversationId);
        
      if (error) console.error('Failed to add message to Supabase:', error);
    },
  };
}