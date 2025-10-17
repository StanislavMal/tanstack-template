// 📄 store/hooks.ts
import { useStore } from '@tanstack/react-store';
import { actions, selectors, store, type Conversation, type Prompt, type UserSettings } from './store';
import type { Message } from '../utils/ai';
import { supabase } from '../utils/supabase';
import { useAuth } from '../providers/AuthProvider';

// --- НОВЫЙ ХУК ДЛЯ НАСТРОЕК ПОЛЬЗОВАТЕЛЯ ---
export function useSettings() {
    const { user } = useAuth();
    const settings = useStore(store, s => selectors.getSettings(s));

    const loadSettings = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', user.id)
            .single();

        if (error) console.error("Error loading settings:", error);
        if (data && data.settings) {
            actions.setSettings(data.settings as UserSettings);
        }
    };

    const updateSettings = async (newSettings: Partial<UserSettings>) => {
        if (!user || !settings) return;

        const updated = { ...settings, ...newSettings };
        actions.setSettings(updated); // Оптимистичное обновление UI

        const { error } = await supabase
            .from('profiles')
            .update({ settings: updated })
            .eq('id', user.id);

        if (error) {
            console.error("Error updating settings:", error);
            // Можно откатить изменения в UI, если нужно
            actions.setSettings(settings); 
        }
    };

    return { settings, loadSettings, updateSettings };
}

// --- НОВЫЙ ХУК ДЛЯ ПРОМПТОВ ---
export function usePrompts() {
    const { user } = useAuth();
    const prompts = useStore(store, s => selectors.getPrompts(s));
    const activePrompt = useStore(store, s => selectors.getActivePrompt(s));

    const loadPrompts = async () => {
        if (!user) return;
        const { data, error } = await supabase.from('prompts').select('*').eq('user_id', user.id).order('created_at');
        if (error) console.error("Error loading prompts:", error);
        if (data) actions.setPrompts(data as Prompt[]);
    };

    const createPrompt = async (name: string, content: string) => {
        if (!user) return;
        const { data, error } = await supabase
            .from('prompts')
            .insert({ name, content, user_id: user.id })
            .select()
            .single();
        if (error) console.error("Error creating prompt:", error);
        if (data) await loadPrompts(); // Перезагружаем список
    };

    const deletePrompt = async (id: string) => {
        if (!user) return;
        const { error } = await supabase.from('prompts').delete().eq('id', id);
        if (error) console.error("Error deleting prompt:", error);
        else await loadPrompts(); // Перезагружаем список
    };

    const setPromptActive = async (id: string, isActive: boolean) => {
        if (!user) return;
        // 1. Деактивируем все промпты
        const { error: deactivateError } = await supabase.from('prompts').update({ is_active: false }).eq('user_id', user.id);
        if (deactivateError) {
            console.error("Error deactivating prompts:", deactivateError);
            return;
        }

        // 2. Активируем нужный, если требуется
        if (isActive) {
            const { error: activateError } = await supabase.from('prompts').update({ is_active: true }).eq('id', id);
            if (activateError) console.error("Error activating prompt:", activateError);
        }
        
        await loadPrompts(); // Перезагружаем список в любом случае
    };
    
    return { prompts, activePrompt, loadPrompts, createPrompt, deletePrompt, setPromptActive };
}

// Упрощенный хук для состояния приложения
export function useAppState() {
  const isLoading = useStore(store, s => selectors.getIsLoading(s));
  return {
    isLoading,
    setLoading: actions.setLoading
  };
}

// Хук useConversations остается без изменений
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
    loadConversations: async () => {
      if (!user) return;
      const { data, error } = await supabase.from('conversations').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) { console.error('Error loading conversations:', error); return; }
      const formattedConversations = data.map(conv => ({ ...conv, messages: conv.messages || [] }));
      actions.setConversations(formattedConversations as Conversation[]);
    },
    createNewConversation: async (title: string = 'New Conversation') => {
      if (!user) return null;
      const { data, error } = await supabase.from('conversations').insert({ title, messages: [], user_id: user.id }).select().single();
      if (error || !data) { console.error('Failed to create conversation in Supabase:', error); return null; }
      const newConversation: Conversation = { id: data.id, title: data.title, messages: data.messages || [] };
      actions.addConversation(newConversation);
      actions.setCurrentConversationId(newConversation.id);
      return newConversation.id;
    },
    updateConversationTitle: async (id: string, title: string) => {
      actions.updateConversationTitle(id, title);
      const { error } = await supabase.from('conversations').update({ title }).eq('id', id);
      if (error) console.error('Failed to update title in Supabase:', error);
    },
    deleteConversation: async (id: string) => {
      actions.deleteConversation(id);
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (error) console.error('Failed to delete conversation from Supabase:', error);
    },
    addMessage: async (conversationId: string, message: Message) => {
      const conversation = selectors.getCurrentConversation(store.state);
      if (!conversation) return;
      const updatedMessages = [...conversation.messages, message];
      actions.addMessage(conversationId, message);
      const { error } = await supabase.from('conversations').update({ messages: updatedMessages }).eq('id', conversationId);
      if (error) console.error('Failed to add message to Supabase:', error);
    },
  };
}