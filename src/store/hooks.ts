// 📄 store/hooks.ts

import { useCallback } from 'react';
import { useStore } from '@tanstack/react-store';
import { actions, selectors, store, type Conversation, type Prompt, type UserSettings } from './store';
import type { Message } from '../utils/ai';
import { supabase } from '../utils/supabase';
import { useAuth } from '../providers/AuthProvider';

export function useSettings() {
    const { user } = useAuth();
    const settings = useStore(store, s => selectors.getSettings(s));

    const loadSettings = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
        if (error) console.error("Error loading settings:", error);
        if (data && data.settings) actions.setSettings(data.settings as UserSettings);
    }, [user]);

    const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
        if (!user || !settings) return;
        const updated = { ...settings, ...newSettings };
        actions.setSettings(updated);
        const { error } = await supabase.from('profiles').update({ settings: updated }).eq('id', user.id);
        if (error) {
            console.error("Error updating settings:", error);
            actions.setSettings(settings); 
        }
    }, [user, settings]);

    return { settings, loadSettings, updateSettings };
}

export function usePrompts() {
    const { user } = useAuth();
    const prompts = useStore(store, s => selectors.getPrompts(s));
    const activePrompt = useStore(store, s => selectors.getActivePrompt(s));

    const loadPrompts = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase.from('prompts').select('*').eq('user_id', user.id).order('created_at');
        if (error) console.error("Error loading prompts:", error);
        if (data) actions.setPrompts(data as Prompt[]);
    }, [user]);

    const createPrompt = useCallback(async (name: string, content: string) => {
        if (!user) return;
        const { error } = await supabase.from('prompts').insert({ name, content, user_id: user.id });
        if (error) console.error("Error creating prompt:", error);
        else await loadPrompts();
    }, [user, loadPrompts]);

    const deletePrompt = useCallback(async (id: string) => {
        if (!user) return;
        const { error } = await supabase.from('prompts').delete().eq('id', id);
        if (error) console.error("Error deleting prompt:", error);
        else await loadPrompts();
    }, [user, loadPrompts]);

    const setPromptActive = useCallback(async (id: string, isActive: boolean) => {
        if (!user) return;
        await supabase.from('prompts').update({ is_active: false }).eq('user_id', user.id);
        if (isActive) {
            await supabase.from('prompts').update({ is_active: true }).eq('id', id);
        }
        await loadPrompts();
    }, [user, loadPrompts]);
    
    return { prompts, activePrompt, loadPrompts, createPrompt, deletePrompt, setPromptActive };
}

export function useAppState() {
  const isLoading = useStore(store, s => selectors.getIsLoading(s));
  return {
    isLoading,
    setLoading: actions.setLoading
  };
}

export function useConversations() {
  const { user } = useAuth();
  const conversations = useStore(store, s => selectors.getConversations(s));
  const currentConversationId = useStore(store, s => selectors.getCurrentConversationId(s));
  const currentConversation = useStore(store, s => selectors.getCurrentConversation(s));

  const setCurrentConversationId = useCallback((id: string | null) => {
      actions.setCurrentConversationId(id);
  }, []);

  const loadConversations = useCallback(async () => {
      if (!user) return;
      const { data, error } = await supabase.from('conversations').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) { console.error('Error loading conversations:', error); return; }
      const formattedConversations = data.map(conv => ({ ...conv, messages: conv.messages || [] }));
      actions.setConversations(formattedConversations as Conversation[]);
  }, [user]);

  const createNewConversation = useCallback(async (title: string = 'New Conversation') => {
      if (!user) return null;
      const { data, error } = await supabase.from('conversations').insert({ title, messages: [], user_id: user.id }).select().single();
      if (error || !data) { console.error('Failed to create conversation in Supabase:', error); return null; }
      const newConversation: Conversation = { id: data.id, title: data.title, messages: data.messages || [] };
      actions.addConversation(newConversation);
      actions.setCurrentConversationId(newConversation.id);
      return newConversation.id;
  }, [user]);

  const updateConversationTitle = useCallback(async (id: string, title: string) => {
      actions.updateConversationTitle(id, title);
      const { error } = await supabase.from('conversations').update({ title }).eq('id', id);
      if (error) console.error('Failed to update title in Supabase:', error);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
      actions.deleteConversation(id);
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (error) console.error('Failed to delete conversation from Supabase:', error);
  }, []);
  
  const addMessage = useCallback(async (conversationId: string, message: Message) => {
      const conversation = selectors.getConversations(store.state).find(c => c.id === conversationId);
      if (!conversation) return;
      
      const updatedMessages = [...conversation.messages, message];
      
      actions.addMessage(conversationId, message);

      const { error } = await supabase.from('conversations').update({ messages: updatedMessages }).eq('id', conversationId);
      if (error) console.error('Failed to add message to Supabase:', error);
  }, []);

  // -> ИЗМЕНЕНИЕ: Новая функция для редактирования
  const editMessageAndUpdate = useCallback(async (conversationId: string, messageId: string, newContent: string) => {
    // 1. Оптимистично обновляем UI
    actions.editMessage(conversationId, messageId, newContent);

    // 2. Получаем обновленное состояние из стора
    // Используем setTimeout, чтобы дождаться, пока setState из store завершится
    await new Promise(resolve => setTimeout(resolve, 0));
    const updatedConversation = selectors.getConversations(store.state).find(c => c.id === conversationId);

    if (!updatedConversation) {
        console.error("Conversation not found after editing.");
        // Здесь можно было бы откатить изменения, но пока просто логируем
        return null;
    }

    // 3. Отправляем обрезанный массив сообщений в Supabase
    const { error } = await supabase.from('conversations').update({ messages: updatedConversation.messages }).eq('id', conversationId);
    if (error) {
        console.error('Failed to update messages in Supabase after edit:', error);
        // Тут тоже нужна логика отката, но пока пропустим для простоты
    }

    // 4. Возвращаем новое (обрезанное) сообщение пользователя для повторной отправки в AI
    return updatedConversation.messages[updatedConversation.messages.length - 1];
  }, []);

  return {
    conversations,
    currentConversationId,
    currentConversation,
    setCurrentConversationId,
    loadConversations,
    createNewConversation,
    updateConversationTitle,
    deleteConversation,
    addMessage,
    editMessageAndUpdate, // -> ИЗМЕНЕНИЕ: Экспортируем новую функцию
  };
}