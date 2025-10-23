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
// -> ИЗМЕНЕНИЕ: Убираем неиспользуемый импорт `Conversation`
import type { Message } from '../store/store';

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
        console.log(`[Home.tsx] useEffect for convId: ${currentConversationId} STARTING.`);
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', currentConversationId)
          .order('created_at', { ascending: true });

        const formattedMessages = error ? [] : data.map(m => ({
          id: m.id, role: m.role as 'user' | 'assistant' | 'system', content: m.content
        })) as Message[];
        
        console.log(`[Home.tsx] Loaded ${formattedMessages.length} messages.`);
        setMessages(formattedMessages);
        
        console.log('[Home.tsx] Calling lockToBottom() and scheduling forceScrollToBottom()');
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
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
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

    console.log('[Home.tsx] handleSubmit CALLED.');
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
    console.log('[Home.tsx] handleSaveEdit CALLED.');
    lockToBottom();
    await editAndRegenerate(id, newContent);
  }, [editAndRegenerate, lockToBottom]);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  if (authLoading) {
    return <div className="h-[100dvh] bg-gray-900 text-white flex items-center justify-center"><div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;
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
            {/* -> ИСПРАВЛЕНИЕ: Явно передаем все props */}
            <Sidebar 
              conversations={sidebar.conversations}
              currentConversationId={sidebar.currentConversationId}
              handleNewChat={sidebar.handleNewChat}
              setCurrentConversationId={sidebar.handleSelectChat}
              handleDeleteChat={sidebar.handleDeleteChat}
              handleDuplicateChat={sidebar.handleDuplicateChat}
              editingChatId={sidebar.editingChatId}
              setEditingChatId={(id) => {
                const conversation = sidebar.conversations.find((c) => c.id === id);
                if (id && conversation) {
                  sidebar.handleStartEdit(id, conversation.title);
                } else {
                  sidebar.handleCancelEdit();
                }
              }}
              editingTitle={sidebar.editingTitle}
              setEditingTitle={sidebar.setEditingTitle}
              handleUpdateChatTitle={() => sidebar.handleSaveEdit()}
              isOpen={sidebar.isOpen}
              setIsOpen={sidebar.setIsOpen}
              isCollapsed={sidebar.isCollapsed}
            />
          </Panel>
          <PanelResizeHandle className="w-2 bg-gray-800 hover:bg-orange-500/50 transition-colors duration-200 cursor-col-resize" />
          
          <Panel className="flex-1 flex flex-col relative min-h-0">
            <Header onMenuClick={() => {}} onSettingsClick={() => setIsSettingsOpen(true)} onLogout={handleLogout} isMobile={false} />
            
            <main ref={messagesContainerRef} className="flex-1 overflow-y-auto pb-28">
              <div ref={contentRef}>
                <div className={`w-full max-w-5xl mx-auto ${!currentConversationId ? 'h-full flex items-center justify-center' : ''}`}>
                  <ChatArea {...{messages: displayMessages, pendingMessage, isLoading, error, currentConversationId, editingMessageId, onStartEdit: handleStartEdit, onCancelEdit: handleCancelEdit, onSaveEdit: handleSaveEdit, onCopyMessage: handleCopyMessage}} />
                </div>
              </div>
            </main>
            
            {showScrollDownButton && <ScrollDownButton onClick={scrollToBottom} className="bottom-32 right-10" />}
            
            <div className="absolute bottom-0 left-0 right-0">
                <Footer ref={textareaRef} {...{input, setInput, handleSubmit, isLoading}} />
            </div>
          </Panel>
        </PanelGroup>
        <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    );
  }

  // Рендер для мобильных
  return (
    <div className="h-[100dvh] bg-gray-900 text-white flex flex-col">
      {sidebar.isOpen && <div className="fixed inset-0 z-20 bg-black/50" onClick={() => sidebar.setIsOpen(false)} />}
      
      {/* -> ИСПРАВЛЕНИЕ: Явно передаем все props */}
      <Sidebar 
        conversations={sidebar.conversations}
        currentConversationId={sidebar.currentConversationId}
        handleNewChat={sidebar.handleNewChat}
        setCurrentConversationId={sidebar.handleSelectChat}
        handleDeleteChat={sidebar.handleDeleteChat}
        handleDuplicateChat={sidebar.handleDuplicateChat}
        editingChatId={sidebar.editingChatId}
        setEditingChatId={(id) => {
          const conversation = sidebar.conversations.find((c) => c.id === id);
          if (id && conversation) {
            sidebar.handleStartEdit(id, conversation.title);
          } else {
            sidebar.handleCancelEdit();
          }
        }}
        editingTitle={sidebar.editingTitle}
        setEditingTitle={sidebar.setEditingTitle}
        handleUpdateChatTitle={() => sidebar.handleSaveEdit()}
        isOpen={sidebar.isOpen}
        setIsOpen={sidebar.setIsOpen}
        isCollapsed={sidebar.isCollapsed}
      />
      
      <Header onMenuClick={sidebar.toggleSidebar} onSettingsClick={() => setIsSettingsOpen(true)} onLogout={handleLogout} isMobile={true} />
      
      <div className="flex-1 relative min-h-0">
        <main ref={messagesContainerRef} className={`flex-1 overflow-y-auto pb-24 ${!currentConversationId ? 'flex items-center justify-center' : ''}`}>
          <div ref={contentRef}>
            <ChatArea {...{messages: displayMessages, pendingMessage, isLoading, error, currentConversationId, editingMessageId, onStartEdit: handleStartEdit, onCancelEdit: handleCancelEdit, onSaveEdit: handleSaveEdit, onCopyMessage: handleCopyMessage}} />
          </div>
        </main>
        
        {showScrollDownButton && <ScrollDownButton onClick={scrollToBottom} className="bottom-28 right-4" />}
        
        <div className="absolute bottom-0 left-0 right-0">
            <Footer ref={textareaRef} {...{input, setInput, handleSubmit, isLoading}} />
        </div>
      </div>
      
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}