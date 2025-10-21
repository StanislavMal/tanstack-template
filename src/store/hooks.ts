// 📄 src/store/hooks.ts

import { useCallback, useEffect } from 'react';
import { useStore } from '@tanstack/react-store';
import { actions, selectors, store, type Conversation, type Prompt, type UserSettings } from './store';
import type { Message } from '../lib/ai/types';
import { supabase } from '../utils/supabase';
import { useAuth } from '../providers/AuthProvider';

export function useSettings() {
    const { user } = useAuth();
    const settings = useStore(store, s => selectors.getSettings(s));

    const loadSettings = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
    if (error) console.error("Error loading settings:", error);
    if (data && data.settings) {
        // Добавляем значения по умолчанию для новых полей
        const loadedSettings = data.settings as UserSettings;
        const settingsWithDefaults: UserSettings = {
            model: loadedSettings.model || 'gemini-2.5-flash', // Обновлено на 2.5-flash
            provider: loadedSettings.provider || 'gemini',
            system_instruction: loadedSettings.system_instruction || '',
            temperature: loadedSettings.temperature || 0.7,
            maxTokens: loadedSettings.maxTokens || 8192,
            reasoningEffort: loadedSettings.reasoningEffort || 'none',
        };
        actions.setSettings(settingsWithDefaults);
    } else {
        // Создаем настройки по умолчанию с моделью 2.5
        const defaultSettings: UserSettings = {
            model: 'gemini-2.5-flash', // Обновлено на 2.5-flash
            provider: 'gemini',
            system_instruction: '',
            temperature: 0.7,
            maxTokens: 8192,
            reasoningEffort: 'none',
        };
        actions.setSettings(defaultSettings);
        // Сохраняем в БД
        await supabase.from('profiles').update({ settings: defaultSettings }).eq('id', user.id);
    }
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
  const currentMessages = useStore(store, s => selectors.getCurrentMessages(s));

  useEffect(() => {
    if (currentConversationId && user) {
      const loadMessages = async () => {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', currentConversationId)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error loading messages:', error);
          actions.setMessages([]);
        } else {
          const formattedMessages = data.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content
          })) as Message[];
          actions.setMessages(formattedMessages);
        }
      };
      loadMessages();
    }
  }, [currentConversationId, user]);

  const setCurrentConversationId = useCallback((id: string | null) => {
      actions.setCurrentConversationId(id);
  }, []);

  const loadConversations = useCallback(async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) { 
        console.error('Error loading conversations:', error); 
        return; 
      }
      actions.setConversations(data as Conversation[]);
  }, [user]);

  const createNewConversation = useCallback(async (title: string = 'New Conversation') => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('conversations')
        .insert({ title, user_id: user.id })
        .select()
        .single();
      
      if (error || !data) { 
        console.error('Failed to create conversation in Supabase:', error); 
        return null; 
      }
      
      const newConversation: Conversation = data as Conversation;
      actions.addConversation(newConversation);
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
    if (!user) return;

    actions.addMessage(message);

    const { error } = await supabase.from('messages').insert({
      id: message.id,
      conversation_id: conversationId,
      user_id: user.id,
      role: message.role,
      content: message.content
    });

    if (error) {
      console.error('Failed to add message to Supabase:', error);
    }
  }, [user]);

  const editMessageAndUpdate = useCallback(async (messageId: string, newContent: string) => {
    const originalMessages = selectors.getCurrentMessages(store.state);
    const originalMessageIndex = originalMessages.findIndex(m => m.id === messageId);
    if (originalMessageIndex === -1) return null;

    const idsToDelete = originalMessages
      .slice(originalMessageIndex + 1)
      .map(m => m.id);

    actions.editMessage(messageId, newContent);
    
    try {
      const promises = [];

      if (idsToDelete.length > 0) {
        promises.push(supabase.from('messages').delete().in('id', idsToDelete));
      }

      promises.push(
        supabase
          .from('messages')
          .update({ content: newContent })
          .eq('id', messageId)
      );
      
      const results = await Promise.all(promises);
      results.forEach(res => {
        if (res.error) throw res.error;
      });

    } catch (error) {
      console.error('Failed to update messages in Supabase after edit:', error);
      actions.setMessages(originalMessages);
      return null;
    }

    const updatedMessages = selectors.getCurrentMessages(store.state);
    return updatedMessages.at(-1) || null;
  }, []);
  
  const duplicateConversation = useCallback(async (id: string) => {
    if (!user) return;
    
    const originalConversation = conversations.find(c => c.id === id);
    if (!originalConversation) return;

    const { data: messagesToCopy, error: messagesError } = await supabase
      .from('messages')
      .select('role, content, user_id')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Failed to load messages for duplication:', messagesError);
      return;
    }

    const newTitle = `copy_${originalConversation.title}`;
    const { data: newConvData, error: newConvError } = await supabase
      .from('conversations')
      .insert({ title: newTitle, user_id: user.id })
      .select()
      .single();

    if (newConvError || !newConvData) {
      console.error('Failed to create duplicated conversation:', newConvError);
      return;
    }

    const newConversation = newConvData as Conversation;

    if (messagesToCopy && messagesToCopy.length > 0) {
        const newMessages = messagesToCopy.map(msg => ({
            ...msg,
            conversation_id: newConversation.id,
        }));
        
        const { error: insertError } = await supabase.from('messages').insert(newMessages);
        if (insertError) {
            console.error('Failed to insert duplicated messages:', insertError);
            await supabase.from('conversations').delete().eq('id', newConversation.id);
            return;
        }
    }
    
    await loadConversations();
    setCurrentConversationId(newConversation.id);

  }, [user, conversations, loadConversations, setCurrentConversationId]);

  return {
    conversations,
    currentConversationId,
    currentConversation,
    messages: currentMessages,
    setCurrentConversationId,
    loadConversations,
    createNewConversation,
    updateConversationTitle,
    deleteConversation,
    addMessage,
    editMessageAndUpdate,
    duplicateConversation,
  };
}