// 📄 src/routes/index.tsx

import { createFileRoute, useNavigate } from '@tanstack/react-router';
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
import type { Conversation, Message } from '../store/store';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [input, setInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { loadSettings } = useSettings();
  const { loadPrompts } = usePrompts();
  const {
    messages,
    currentConversationId,
    loadConversations,
    setMessages,
  } = useConversations();
  const sidebar = useSidebar();
  const {
    messagesContainerRef,
    contentRef,
    showScrollDownButton,
    scrollToBottom,
    lockToBottom,
    forceScrollToBottom,
  } = useScrollManagement();
  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadConversations();
      loadPrompts();
      loadSettings();
    }
  }, [user, loadConversations, loadPrompts, loadSettings]);

  useEffect(() => {
    const loadAndScroll = async () => {
      if (currentConversationId && user) {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', currentConversationId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading messages:', error);
          setMessages([]);
        } else {
          const formattedMessages = data.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content
          })) as Message[];
          setMessages(formattedMessages);
        }
        
        lockToBottom();
        setTimeout(() => forceScrollToBottom('auto'), 0);
      }
    };
    loadAndScroll();
  }, [currentConversationId, user, setMessages, lockToBottom, forceScrollToBottom]);

  const {
    sendMessage,
    editAndRegenerate,
    isLoading,
    error,
    pendingMessage,
  } = useChat({
    onMessageSent: () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    },
    onResponseComplete: () => {},
    onError: (error) => console.error('Chat error:', error),
  });

  const displayMessages = useMemo(() => {
    const combined = [...messages];
    if (pendingMessage && !messages.some(m => m.id === pendingMessage.id)) {
      combined.push(pendingMessage);
    }
    return combined;
  }, [messages, pendingMessage]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    lockToBottom(); 

    const currentInput = input;
    setInput('');
    const words = currentInput.trim().split(/\s+/);
    const title = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
    await sendMessage(currentInput, title);
  }, [input, isLoading, sendMessage, lockToBottom]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate({ to: '/login' });
  }, [navigate]);

  const handleStartEdit = useCallback((id: string) => setEditingMessageId(id), []);
  const handleCancelEdit = useCallback(() => setEditingMessageId(null), []);

  const handleSaveEdit = useCallback(async (id: string, newContent: string) => {
    setEditingMessageId(null);
    lockToBottom();
    await editAndRegenerate(id, newContent);
  }, [editAndRegenerate, lockToBottom]);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  if (authLoading) {
    return (
      <div className="h-[100dvh] bg-gray-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  if (isDesktop) {
    return (
      <div className="h-[100dvh] bg-gray-900 text-white overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel 
            defaultSize={20} minSize={15} maxSize={30} collapsible={true} 
            collapsedSize={0} onCollapse={sidebar.toggleCollapse as PanelOnCollapse}
            className="flex flex-col"
          >
            <Sidebar 
              conversations={sidebar.conversations} currentConversationId={sidebar.currentConversationId}
              handleNewChat={sidebar.handleNewChat} setCurrentConversationId={sidebar.handleSelectChat}
              handleDeleteChat={sidebar.handleDeleteChat} handleDuplicateChat={sidebar.handleDuplicateChat}
              editingChatId={sidebar.editingChatId}
              setEditingChatId={(id) => {
                const conversation = sidebar.conversations.find((c: Conversation) => c.id === id);
                id && conversation ? sidebar.handleStartEdit(id, conversation.title) : sidebar.handleCancelEdit();
              }}
              editingTitle={sidebar.editingTitle} setEditingTitle={sidebar.setEditingTitle}
              handleUpdateChatTitle={(_id, _title) => sidebar.handleSaveEdit()}
              isOpen={true} setIsOpen={() => {}} isCollapsed={sidebar.isCollapsed}
            />
          </Panel>
          <PanelResizeHandle className="w-2 bg-gray-800 hover:bg-orange-500/50 transition-colors duration-200 cursor-col-resize" />
          
          {/* -> ИЗМЕНЕНИЕ: Этот Panel теперь является relative-контейнером */}
          <Panel className="flex-1 flex flex-col relative min-h-0">
            <Header onMenuClick={() => {}} onSettingsClick={() => setIsSettingsOpen(true)} onLogout={handleLogout} isMobile={false} />
            
            {/* -> ИЗМЕНЕНИЕ: `main` теперь занимает все место и имеет внутренний отступ снизу */}
            <main ref={messagesContainerRef} className="absolute inset-0 overflow-y-auto pb-28">
              <div ref={contentRef}>
                <div className={`w-full max-w-5xl mx-auto ${!currentConversationId ? 'h-full flex items-center justify-center' : ''}`}>
                  <ChatArea
                    messages={displayMessages} pendingMessage={pendingMessage} isLoading={isLoading}
                    error={error} currentConversationId={currentConversationId} editingMessageId={editingMessageId}
                    onStartEdit={handleStartEdit} onCancelEdit={handleCancelEdit}
                    onSaveEdit={handleSaveEdit} onCopyMessage={handleCopyMessage}
                  />
                </div>
              </div>
            </main>
            
            {showScrollDownButton && (
              // -> ИЗМЕНЕНИЕ: Позиционирование кнопки немного изменилось, чтобы быть над футером
              <ScrollDownButton
                onClick={scrollToBottom}
                className="bottom-32 right-10"
              />
            )}

            {/* -> ИЗМЕНЕНИЕ: Футер теперь абсолютно позиционирован внизу */}
            <Footer
              ref={textareaRef}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </Panel>
        </PanelGroup>
        <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    );
  }

  // Рендер для мобильных устройств
  return (
    // -> ИЗМЕНЕНИЕ: Убираем flex-col, добавляем relative
    <div className="h-[100dvh] bg-gray-900 text-white relative">
      {sidebar.isOpen && <div className="fixed inset-0 z-20 bg-black/50" onClick={() => sidebar.setIsOpen(false)} />}
      <Sidebar 
        conversations={sidebar.conversations} currentConversationId={sidebar.currentConversationId}
        handleNewChat={sidebar.handleNewChat} setCurrentConversationId={sidebar.handleSelectChat}
        handleDeleteChat={sidebar.handleDeleteChat} handleDuplicateChat={sidebar.handleDuplicateChat}
        editingChatId={sidebar.editingChatId}
        setEditingChatId={(id) => {
          const conversation = sidebar.conversations.find((c: Conversation) => c.id === id);
          id && conversation ? sidebar.handleStartEdit(id, conversation.title) : sidebar.handleCancelEdit();
        }}
        editingTitle={sidebar.editingTitle} setEditingTitle={sidebar.setEditingTitle}
        handleUpdateChatTitle={(_id, _title) => sidebar.handleSaveEdit()}
        isOpen={sidebar.isOpen} setIsOpen={sidebar.setIsOpen} isCollapsed={false}
      />
      
      {/* -> ИЗМЕНЕНИЕ: Создаем обертку для основного контента, чтобы Header был в потоке, а остальное - нет */}
      <div className="flex flex-col h-full">
        <Header onMenuClick={sidebar.toggleSidebar} onSettingsClick={() => setIsSettingsOpen(true)} onLogout={handleLogout} isMobile={true} />
        <div className="flex-1 relative min-h-0">
          {/* -> ИЗМЕНЕНИЕ: main теперь занимает все место и имеет отступ */}
          <main 
            ref={messagesContainerRef} 
            className={`absolute inset-0 overflow-y-auto pb-24 ${!currentConversationId ? 'flex items-center justify-center' : ''}`}
          >
            <div ref={contentRef}>
              <ChatArea
                messages={displayMessages} pendingMessage={pendingMessage} isLoading={isLoading}
                error={error} currentConversationId={currentConversationId} editingMessageId={editingMessageId}
                onStartEdit={handleStartEdit} onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit} onCopyMessage={handleCopyMessage}
              />
            </div>
          </main>
          
          {showScrollDownButton && (
            // -> ИЗМЕНЕНИЕ: Отступ снизу для кнопки
            <ScrollDownButton
              onClick={scrollToBottom}
              className="bottom-28 right-4"
            />
          )}
          
          {/* -> ИЗМЕНЕНИЕ: Футер абсолютно позиционирован */}
          <Footer
            ref={textareaRef}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
      
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}