import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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
import { useConversations, useSettings, usePrompts, actions } from '../store';

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
  } = useScrollManagement(messages);

  useEffect(() => {
    if (user && isInitialized && !authLoading && !dataLoaded) {
      const loadUserData = async () => {
        try {
          await Promise.all([ loadConversations(), loadPrompts(), loadSettings() ]);
          setDataLoaded(true);
        } catch (error) {
          console.error('Error loading user data:', error);
          setDataLoaded(true);
        }
      };
      loadUserData();
    }
  }, [user, isInitialized, authLoading, dataLoaded, loadConversations, loadPrompts, loadSettings]);

  useEffect(() => {
    if (isInitialized && !authLoading && !user) {
      navigate({ to: '/login' });
    }
  }, [user, authLoading, isInitialized, navigate]);

  const sidebar = useSidebar();
  
  const {
    sendMessage,
    editAndRegenerate,
    isLoading,
    error,
    pendingMessage,
  } = useChat({
    onMessageSent: () => {
      lockToBottom();
    },
    onResponseComplete: () => {},
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  const displayMessages = useMemo(() => {
    const combined = [...messages];
    if (pendingMessage && !messages.some((m) => m.id === pendingMessage.id)) {
      combined.push(pendingMessage);
    }
    return combined;
  }, [messages, pendingMessage]);

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
    actions.resetStore();
    await supabase.auth.signOut();
    navigate({ to: '/login' });
  }, [navigate]);

  const handleStartEdit = useCallback((id: string) => {
    setEditingMessageId(id);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

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
      if (id && conversation) {
        sidebar.handleStartEdit(id, conversation.title);
      } else {
        sidebar.handleCancelEdit();
      }
    },
    editingTitle: sidebar.editingTitle,
    setEditingTitle: sidebar.setEditingTitle,
    handleUpdateChatTitle: sidebar.handleSaveEdit,
    isOpen: sidebar.isOpen,
    setIsOpen: sidebar.setIsOpen,
    isCollapsed: sidebar.isCollapsed,
  };

  // ИЗМЕНЕНИЕ: Убрал невалидные комментарии из JSX
  if (!isInitialized || authLoading || !dataLoaded) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                <p className="mt-4 text-gray-400">
                    {!isInitialized || authLoading ? 'Authenticating...' : 'Loading your data...'}
                </p>
            </div>
        </div>
    );
  }

  // ИЗМЕНЕНИЕ: Убрал невалидные комментарии из JSX
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

  const chatAreaProps = {
    messages: displayMessages,
    pendingMessage,
    isLoading,
    error,
    currentConversationId,
    editingMessageId,
    onStartEdit: handleStartEdit,
    onCancelEdit: handleCancelEdit,
    onSaveEdit: handleSaveEdit,
  };

  if (isDesktop) {
    return (
      <div className="h-[100dvh] bg-gray-900 text-white overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel
            defaultSize={20}
            minSize={15}
            maxSize={30}
            collapsible={true}
            collapsedSize={0}
            onCollapse={sidebar.toggleCollapse as PanelOnCollapse}
            className="flex flex-col"
          >
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