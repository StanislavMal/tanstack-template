// 📄 src/routes/index.tsx

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
import {
  useChat,
  useSidebar,
  useScrollManagement,
  useMediaQuery,
} from '../hooks';
import { useConversations, useSettings, usePrompts } from '../store';
import type { Conversation } from '../store/store';

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
  const { user } = useAuth();
  
  // State управления
  const [input, setInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Хуки для функциональности
  const isDesktop = useMediaQuery('(min-width: 768px)');
  
  // Store хуки
  const { messages, currentConversationId } = useConversations();
  const { loadConversations } = useConversations();
  const { loadSettings } = useSettings();
  const { loadPrompts } = usePrompts();

  // Загрузка данных при монтировании
  useEffect(() => {
    if (user) {
      loadConversations();
      loadPrompts();
      loadSettings();
    }
  }, [user, loadConversations, loadPrompts, loadSettings]);

  // Управление скроллом
  const {
    messagesContainerRef,
    contentRef,
    showScrollDownButton,
    scrollToBottom,
    lockToBottom,
  } = useScrollManagement();

  // Управление сайдбаром
  const sidebar = useSidebar();

  // Управление чатом
  const {
    sendMessage,
    editAndRegenerate,
    isLoading,
    error,
    pendingMessage,
  } = useChat({
    onMessageSent: () => {
      lockToBottom();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    },
    onResponseComplete: () => {
      // Можно добавить звуковое уведомление или другую логику
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Комбинируем сообщения для отображения
  const displayMessages = useMemo(() => {
    const combined = [...messages];
    if (pendingMessage && !messages.some(m => m.id === pendingMessage.id)) {
      combined.push(pendingMessage);
    }
    return combined;
  }, [messages, pendingMessage]);

  // Обработчики событий
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    setInput('');
    
    // Создаем заголовок из первых слов
    const words = currentInput.trim().split(/\s+/);
    const title = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
    
    await sendMessage(currentInput, title);
  }, [input, isLoading, sendMessage]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate({ to: '/login' });
  }, [navigate]);

  const handleStartEdit = useCallback((id: string) => {
    setEditingMessageId(id);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const handleSaveEdit = useCallback(async (id: string, newContent: string) => {
    setEditingMessageId(null);
    await editAndRegenerate(id, newContent);
  }, [editAndRegenerate]);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // Рендер для десктопа с панелями
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
            <Sidebar 
              conversations={sidebar.conversations}
              currentConversationId={sidebar.currentConversationId}
              handleNewChat={sidebar.handleNewChat}
              setCurrentConversationId={sidebar.handleSelectChat}
              handleDeleteChat={sidebar.handleDeleteChat}
              handleDuplicateChat={sidebar.handleDuplicateChat}
              editingChatId={sidebar.editingChatId}
              setEditingChatId={(id) => {
                const conversation = sidebar.conversations.find((c: Conversation) => c.id === id);
                if (id && conversation) {
                  sidebar.handleStartEdit(id, conversation.title);
                } else {
                  sidebar.handleCancelEdit();
                }
              }}
              editingTitle={sidebar.editingTitle}
              setEditingTitle={sidebar.setEditingTitle}
              handleUpdateChatTitle={(_id, _title) => sidebar.handleSaveEdit()}
              isOpen={true}
              setIsOpen={() => {}}
              isCollapsed={sidebar.isCollapsed}
            />
          </Panel>
          
          <PanelResizeHandle className="w-2 bg-gray-800 hover:bg-orange-500/50 transition-colors duration-200 cursor-col-resize" />
          
          <Panel className="flex-1 flex flex-col relative min-h-0">
            <Header 
              onMenuClick={() => {}}
              onSettingsClick={() => setIsSettingsOpen(true)}
              onLogout={handleLogout}
              isMobile={false}
            />
            
            <main ref={messagesContainerRef} className="flex-1 overflow-y-auto">
              <div ref={contentRef}>
                <div className={`w-full max-w-5xl mx-auto ${!currentConversationId ? 'h-full flex items-center justify-center' : ''}`}>
                  <ChatArea
                    messages={displayMessages}
                    pendingMessage={pendingMessage}
                    isLoading={isLoading}
                    error={error}
                    currentConversationId={currentConversationId}
                    editingMessageId={editingMessageId}
                    onStartEdit={handleStartEdit}
                    onCancelEdit={handleCancelEdit}
                    onSaveEdit={handleSaveEdit}
                    onCopyMessage={handleCopyMessage}
                  />
                </div>
              </div>
            </main>
            
            {showScrollDownButton && (
              <ScrollDownButton
                onClick={scrollToBottom}
                className="bottom-28 right-10"
              />
            )}

            <Footer
              ref={textareaRef}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </Panel>
        </PanelGroup>
        
        <SettingsDialog 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </div>
    );
  }

  // Рендер для мобильных устройств
  return (
    <div className="h-[100dvh] bg-gray-900 text-white flex flex-col relative overflow-hidden">
      {sidebar.isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50" 
          onClick={() => sidebar.setIsOpen(false)}
        />
      )}
      
      <Sidebar 
        conversations={sidebar.conversations}
        currentConversationId={sidebar.currentConversationId}
        handleNewChat={sidebar.handleNewChat}
        setCurrentConversationId={sidebar.handleSelectChat}
        handleDeleteChat={sidebar.handleDeleteChat}
        handleDuplicateChat={sidebar.handleDuplicateChat}
        editingChatId={sidebar.editingChatId}
        setEditingChatId={(id) => {
          const conversation = sidebar.conversations.find((c: Conversation) => c.id === id);
          if (id && conversation) {
            sidebar.handleStartEdit(id, conversation.title);
          } else {
            sidebar.handleCancelEdit();
          }
        }}
        editingTitle={sidebar.editingTitle}
        setEditingTitle={sidebar.setEditingTitle}
        handleUpdateChatTitle={(_id, _title) => sidebar.handleSaveEdit()}
        isOpen={sidebar.isOpen}
        setIsOpen={sidebar.setIsOpen}
        isCollapsed={false}
      />
      
      <Header 
        onMenuClick={sidebar.toggleSidebar}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        isMobile={true}
      />
      
      <main 
        ref={messagesContainerRef} 
        className={`flex-1 overflow-y-auto overflow-x-hidden min-h-0 ${!currentConversationId ? 'flex items-center justify-center' : ''}`}
      >
        <div ref={contentRef}>
          <ChatArea
            messages={displayMessages}
            pendingMessage={pendingMessage}
            isLoading={isLoading}
            error={error}
            currentConversationId={currentConversationId}
            editingMessageId={editingMessageId}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onCopyMessage={handleCopyMessage}
          />
        </div>
      </main>
      
      {showScrollDownButton && (
        <ScrollDownButton
          onClick={scrollToBottom}
          className="bottom-24 right-4"
        />
      )}
      
      <Footer
        ref={textareaRef}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
      
      <SettingsDialog 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}