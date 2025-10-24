import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle, type PanelOnCollapse } from 'react-resizable-panels';
import { supabase } from '../utils/supabase';
import { useAuth } from '../providers/AuthProvider';
import {
  SettingsDialog,
  Sidebar,
  ScrollDownButton,
  Header,
  ChatArea,
  Footer,
} from '../components';
import type { FooterRef } from '../components/Footer';
import {
  useChat,
  useSidebar,
  useScrollManagement,
  useMediaQuery,
} from '../hooks';
import { useConversations, useSettings, usePrompts, actions, store } from '../store';
import type { Conversation, UserSettings, Prompt } from '../store';
import type { Message } from '../lib/ai/types';

type MessageWithConversationId = Message & { conversation_id: string };
type ProfilePayload = { id: string; settings: UserSettings | null };

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: '/login' });
    }
  },
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isInitialized } = useAuth();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  // ✅ ИСПРАВЛЕНИЕ: Добавляем состояние для отслеживания ошибок загрузки
  const [loadError, setLoadError] = useState<string | null>(null);
  const footerRef = useRef<FooterRef>(null);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  
  const { messages, currentConversationId } = useConversations();
  const { loadConversations } = useConversations();
  const { loadSettings } = useSettings();
  const { loadPrompts } = usePrompts();
  
  const {
    messagesContainerRef,
    contentRef,
    showScrollDownButton,
    scrollToBottom,
    lockToBottom,
  } = useScrollManagement(messages.length);

  // ✅ ИСПРАВЛЕНИЕ: Улучшенная обработка загрузки с retry и обработкой ошибок
  useEffect(() => {
    if (user && isInitialized && !authLoading && !dataLoaded) {
      const loadUserData = async () => {
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts && !dataLoaded) {
          try {
            await Promise.all([
              loadConversations(),
              loadPrompts(),
              loadSettings()
            ]);
            
            setDataLoaded(true);
            setLoadError(null);
            break;
          } catch (error) {
            attempts++;
            console.error(`Error loading user data (attempt ${attempts}/${maxAttempts}):`, error);
            
            if (attempts >= maxAttempts) {
              setLoadError('Failed to load your data. Please refresh the page.');
              setDataLoaded(true); // ✅ Устанавливаем true даже при ошибке, чтобы не зависнуть
            } else {
              // Ждём перед следующей попыткой
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        }
      };
      
      loadUserData();
    }
  }, [user, isInitialized, authLoading, dataLoaded, loadConversations, loadPrompts, loadSettings]);
  
  useEffect(() => {
    if (!user || !dataLoaded) return;
    const channels = [
      supabase.channel('conversations-changes').on<Conversation>(
        'postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `user_id=eq.${user.id}` },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT': actions.addConversation(payload.new); break;
            case 'UPDATE': actions.updateConversationTitle(payload.new.id, payload.new.title); break;
            case 'DELETE': actions.deleteConversation((payload.old as Conversation).id); break;
          }
        }
      ).subscribe(),
      supabase.channel('messages-changes').on<MessageWithConversationId>(
        'postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}`},
        (payload) => {
          if (store.state.currentConversationId === payload.new.conversation_id) {
            if (!store.state.currentMessages.some(m => m.id === payload.new.id)) {
              actions.addMessage(payload.new);
            }
          }
        }
      ).subscribe(),
      supabase.channel('profiles-changes').on<ProfilePayload>(
        'postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}`},
        (payload) => { if (payload.new.settings) { actions.setSettings(payload.new.settings); } }
      ).subscribe(),
      supabase.channel('prompts-changes').on<Prompt>(
        'postgres_changes', { event: '*', schema: 'public', table: 'prompts', filter: `user_id=eq.${user.id}`},
        () => { loadPrompts(); }
      ).subscribe()
    ];
    return () => {
      console.log('[Realtime] Unsubscribing from all channels.');
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, dataLoaded, loadPrompts]);

  useEffect(() => {
    if (isInitialized && !authLoading && !user) {
      navigate({ to: '/login', replace: true });
    }
  }, [user, authLoading, isInitialized, navigate]);

  const sidebar = useSidebar();
  
  const { sendMessage, editAndRegenerate, isLoading, error, pendingMessage } = useChat({
    onMessageSent: () => { lockToBottom(); },
    onResponseComplete: () => {},
    onError: (error) => { console.error('Chat error:', error); },
  });

  const displayMessages = messages;

  const handleSend = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;
      const words = message.trim().split(/\s+/);
      const title = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
      await sendMessage(message, title);
    },
    [isLoading, sendMessage]
  );

  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error on sign out attempt:', error.message);
    }
  }, []);

  const handleStartEdit = useCallback((id: string) => { setEditingMessageId(id); }, []);
  const handleCancelEdit = useCallback(() => { setEditingMessageId(null); }, []);

  const handleSaveEdit = useCallback(
    async (id: string, newContent: string) => {
      setEditingMessageId(null);
      await editAndRegenerate(id, newContent);
    },
    [editAndRegenerate]
  );
  
  const sidebarProps = {
    conversations: sidebar.conversations,
    currentConversationId: sidebar.currentConversationId,
    handleNewChat: sidebar.handleNewChat,
    setCurrentConversationId: sidebar.handleSelectChat,
    handleDeleteChat: sidebar.handleDeleteChat,
    handleDuplicateChat: sidebar.handleDuplicateChat,
    editingChatId: sidebar.editingChatId,
    setEditingChatId: (id: string | null) => {
      const conversation = sidebar.conversations.find((c) => c.id === id);
      if (id && conversation) { sidebar.handleStartEdit(id, conversation.title); } else { sidebar.handleCancelEdit(); }
    },
    editingTitle: sidebar.editingTitle,
    setEditingTitle: sidebar.setEditingTitle,
    handleUpdateChatTitle: sidebar.handleSaveEdit,
    isOpen: sidebar.isOpen,
    setIsOpen: sidebar.setIsOpen,
    isCollapsed: sidebar.isCollapsed,
  };

  // ✅ ИСПРАВЛЕНИЕ: Показываем ошибку загрузки если она произошла
  if (!isInitialized || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-400">Loading your data...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading Error</h2>
          <p className="text-gray-400 mb-6">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const chatAreaProps = { messages: displayMessages, pendingMessage, isLoading, error, currentConversationId, editingMessageId, onStartEdit: handleStartEdit, onCancelEdit: handleCancelEdit, onSaveEdit: handleSaveEdit };

  if (isDesktop) {
    return (
      <div className="h-[100dvh] bg-gray-900 text-white overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={20} minSize={15} maxSize={30} collapsible={true} collapsedSize={0} onCollapse={sidebar.toggleCollapse as PanelOnCollapse} className="flex flex-col">
            <Sidebar {...sidebarProps} isOpen={true} setIsOpen={() => {}} />
          </Panel>
          <PanelResizeHandle className="w-2 bg-gray-800 hover:bg-orange-500/50 transition-colors duration-200 cursor-col-resize" />
          <Panel className="flex-1 flex flex-col relative min-h-0">
            <Header onMenuClick={() => {}} onSettingsClick={() => setIsSettingsOpen(true)} onLogout={handleLogout} isMobile={false} />
            <main ref={messagesContainerRef} className="flex-1 overflow-y-auto">
              <div ref={contentRef}>
                <div className={`w-full max-w-5xl mx-auto ${!currentConversationId ? 'h-full flex items-center justify-center' : ''}`}>
                  <ChatArea {...chatAreaProps} />
                </div>
              </div>
            </main>
            {showScrollDownButton && <ScrollDownButton onClick={scrollToBottom} className="bottom-28 right-10" />}
            <Footer ref={footerRef} onSend={handleSend} isLoading={isLoading} />
          </Panel>
        </PanelGroup>
        <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gray-900 text-white flex flex-col relative overflow-hidden">
      {sidebar.isOpen && <div className="fixed inset-0 z-20 bg-black/50" onClick={() => sidebar.setIsOpen(false)} />}
      <Sidebar {...sidebarProps} />
      <Header onMenuClick={sidebar.toggleSidebar} onSettingsClick={() => setIsSettingsOpen(true)} onLogout={handleLogout} isMobile={true} />
      <main ref={messagesContainerRef} className={`flex-1 overflow-y-auto overflow-x-hidden min-h-0 ${!currentConversationId ? 'flex items-center justify-center' : ''}`}>
        <div ref={contentRef}>
          <ChatArea {...chatAreaProps} />
        </div>
      </main>
      {showScrollDownButton && <ScrollDownButton onClick={scrollToBottom} className="bottom-24 right-4" />}
      <Footer ref={footerRef} onSend={handleSend} isLoading={isLoading} />
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}