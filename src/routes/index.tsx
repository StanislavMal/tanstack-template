// 📄 src/routes/index.tsx

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef, useCallback, useMemo, useLayoutEffect } from 'react' // -> ИЗМЕНЕНИЕ: Добавили useLayoutEffect
import { Settings, Menu, AlertTriangle } from 'lucide-react'
import {
  SettingsDialog,
  ChatMessage,
  LoadingIndicator,
  ChatInput,
  Sidebar,
  WelcomeScreen,
  ScrollDownButton,
} from '../components'
import { useConversations, usePrompts, useSettings, useAppState } from '../store' 
import { genAIResponse, type Message } from '../utils'
import { supabase } from '../utils/supabase'
import { useAuth } from '../providers/AuthProvider'
import { useTranslation } from 'react-i18next'
import { Panel, PanelGroup, PanelResizeHandle, type PanelOnCollapse } from 'react-resizable-panels'
import { useMediaQuery } from '../hooks/useMediaQuery'


export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { throw redirect({ to: '/login' }) }
  },
  component: Home,
})

function Home() {
  const { t } = useTranslation(); 
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const { conversations, messages, loadConversations, createNewConversation, updateConversationTitle, deleteConversation, addMessage, setCurrentConversationId, currentConversationId, editMessageAndUpdate, duplicateConversation } = useConversations()
  const { isLoading, setLoading } = useAppState()
  const { settings, loadSettings } = useSettings()
  const { activePrompt, loadPrompts } = usePrompts()
  
  const [input, setInput] = useState('')
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // -> ИЗМЕНЕНИЕ: Заменяем useState на useRef для управления блокировкой прокрутки.
  // Это предотвращает лишние ререндеры и гонки состояний.
  const isLockedToBottomRef = useRef(true);

  const [pendingMessage, setPendingMessage] = useState<Message | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // -> ИЗМЕНЕНИЕ: Это состояние теперь отвечает ТОЛЬКО за видимость кнопки.
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);

  const isDesktop = useMediaQuery('(min-width: 768px)');


  useEffect(() => {
    if (user) {
      loadConversations()
      loadPrompts()
      loadSettings()
    }
  }, [user, loadConversations, loadPrompts, loadSettings])
  
  const displayMessages = useMemo(() => {
    const combined = [...messages];
    if (pendingMessage && !messages.some(m => m.id === pendingMessage.id)) {
        combined.push(pendingMessage);
    }
    return combined;
  }, [messages, pendingMessage]);

  const textQueueRef = useRef<string>('');
  const animationFrameRef = useRef<number | undefined>(undefined);
  const finalContentRef = useRef<string>(''); 

  useEffect(() => {
    const animatePrinting = () => {
      if (textQueueRef.current.length > 0) {
        const speed = 2;
        const charsToPrint = textQueueRef.current.substring(0, speed);
        textQueueRef.current = textQueueRef.current.substring(speed);

        setPendingMessage(prev => {
          if (prev) {
            const newContent = prev.content + charsToPrint;
            finalContentRef.current = newContent;
            return { ...prev, content: newContent };
          }
          return null;
        });
      }
      animationFrameRef.current = requestAnimationFrame(animatePrinting);
    };

    animationFrameRef.current = requestAnimationFrame(animatePrinting);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const forceScrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  // -> ИЗМЕНЕНИЕ: Этот хук теперь использует useLayoutEffect и новую логику.
  // Он срабатывает после каждого обновления DOM (когда добавляется новый текст).
  useLayoutEffect(() => {
    // Если пользователь заблокировал прокрутку внизу, мы её выполняем.
    if (isLockedToBottomRef.current) {
      forceScrollToBottom();
    }
  }, [displayMessages, forceScrollToBottom]);

  // -> ИЗМЕНЕНИЕ: Этот хук теперь только обновляет флаг и видимость кнопки.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Даем небольшой "запас" в 150px, чтобы скролл считался "нижним".
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
      
      // Обновляем наш ref-флаг. Это не вызовет перерисовку.
      isLockedToBottomRef.current = isAtBottom;
      // Обновляем состояние для показа/скрытия кнопки.
      setShowScrollDownButton(!isAtBottom);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messagesContainerRef.current]);


  const createTitleFromInput = useCallback((text: string) => {
    const words = text.trim().split(/\s+/)
    const firstThreeWords = words.slice(0, 3).join(' ')
    return firstThreeWords + (words.length > 3 ? '...' : '')
  }, [])

  const processAIResponse = useCallback(
    async (userMessage: Message) => {
      if (!settings) {
        setError("User settings not loaded.");
        setLoading(false);
        return null;
      }
      
      finalContentRef.current = ''; 
      const initialAssistantMessage: Message = { id: crypto.randomUUID(), role: 'assistant', content: '' };
      
      try {
        const history = messages.at(-1)?.id === userMessage.id 
            ? messages.slice(0, -1) 
            : messages;

        const response = await genAIResponse({
          data: {
            messages: [...history, userMessage],
            model: settings.model,
            mainSystemInstruction: settings.system_instruction,
            activePromptContent: activePrompt?.content,
          },
        })
        
        if (!response.body) throw new Error('No response body');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let isFirstChunk = true;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const rawText = decoder.decode(value, { stream: true });
          rawText.replace(/}\{/g, '}\n{').split('\n').forEach((chunkStr) => {
            if (chunkStr) {
              try {
                const parsed = JSON.parse(chunkStr);
                if (parsed.text) {
                  if (isFirstChunk) {
                    setPendingMessage(initialAssistantMessage);
                    setLoading(false);
                    isFirstChunk = false;
                  }
                  textQueueRef.current += parsed.text;
                }
              } catch (e) { /* ignore */ }
            }
          })
        }
        
        if (isFirstChunk) {
            setLoading(false);
        }

        await new Promise(resolve => {
            const interval = setInterval(() => {
                if (textQueueRef.current.length === 0) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 50);
        });
        
        return { ...initialAssistantMessage, content: finalContentRef.current };

      } catch (error) {
        console.error('Error in AI response:', error);
        setError('An error occurred while getting the AI response.');
        setLoading(false);
        return null;
      }
    },
    [settings, activePrompt, messages, setLoading],
);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      textQueueRef.current = '';
      finalContentRef.current = '';
      setPendingMessage(null);
      setError(null);
      
      // -> ИЗМЕНЕНИЕ: Принудительно включаем блокировку прокрутки вниз при отправке нового сообщения.
      isLockedToBottomRef.current = true;
      setShowScrollDownButton(false);
      forceScrollToBottom();

      const currentInput = input
      setInput('')
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      setLoading(true)

      const conversationTitle = createTitleFromInput(currentInput)
      const userMessage: Message = { id: crypto.randomUUID(), role: 'user' as const, content: currentInput.trim() }

      let convId = currentConversationId;
      
      try {
        if (!convId) {
          const newConvId = await createNewConversation(conversationTitle || t('newChat'))
          if (newConvId) convId = newConvId
        }
        
        if (!convId) throw new Error('Failed to create or find conversation ID.');

        await addMessage(convId, userMessage);
        
        const finalAiMessage = await processAIResponse(userMessage);
        
        if (finalAiMessage && finalAiMessage.content.trim()) {
            await addMessage(convId, finalAiMessage);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        console.error('Error in handleSubmit:', error)
        setError(errorMessage);
        setLoading(false);
      } finally {
        setPendingMessage(null);
      }
    },
    [
      input,
      isLoading,
      currentConversationId,
      createNewConversation,
      addMessage,
      processAIResponse,
      setLoading,
      createTitleFromInput,
      t,
      forceScrollToBottom,
    ],
  )
  
  const handleSaveEdit = useCallback(async (messageId: string, newContent: string) => {
    if (!currentConversationId) return;

    setEditingMessageId(null);
    setLoading(true);
    setError(null);
    textQueueRef.current = '';
    finalContentRef.current = '';
    setPendingMessage(null);
    
    // -> ИЗМЕНЕНИЕ: Так же, как и в handleSubmit, блокируем скролл внизу.
    isLockedToBottomRef.current = true;
    setShowScrollDownButton(false);

    try {
      const updatedUserMessage = await editMessageAndUpdate(messageId, newContent);

      if (!updatedUserMessage) {
        throw new Error("Failed to get updated user message after edit.");
      }
      
      const finalAiMessage = await processAIResponse(updatedUserMessage);
        
      if (finalAiMessage && finalAiMessage.content.trim()) {
          await addMessage(currentConversationId, finalAiMessage);
      }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during edit.';
        console.error('Error in handleSaveEdit:', error)
        setError(errorMessage);
        setLoading(false);
    } finally {
        setPendingMessage(null);
    }
  }, [currentConversationId, editMessageAndUpdate, processAIResponse, addMessage, setLoading]);

  const handleScrollDownClick = useCallback(() => {
    // -> ИЗМЕНЕНИЕ: При клике на кнопку мы не только скроллим, но и снова "запираем" скролл внизу.
    isLockedToBottomRef.current = true;
    forceScrollToBottom();
    setShowScrollDownButton(false);
  }, [forceScrollToBottom]);

  const handleNewChat = useCallback(() => { setCurrentConversationId(null) }, [setCurrentConversationId])
  const handleDeleteChat = useCallback(async (id: string) => { await deleteConversation(id) }, [deleteConversation])
  const handleUpdateChatTitle = useCallback(async (id: string, title: string) => { await updateConversationTitle(id, title); setEditingChatId(null); setEditingTitle(''); }, [updateConversationTitle])
  const handleLogout = async () => { await supabase.auth.signOut(); navigate({ to: '/login' }) }
  const handleDuplicateChat = useCallback(async (id: string) => { await duplicateConversation(id) }, [duplicateConversation])

  const MainContent = () => (
    <div className="w-full h-full p-4">
        {error && (
            <div className="bg-red-500/10 border-l-4 border-red-500 text-red-300 p-4 mb-4 rounded-r-lg" role="alert">
                <div className="flex">
                    <div className="py-1"><AlertTriangle className="h-5 w-5 text-red-400 mr-3" /></div>
                    <div>
                        <p className="font-bold">{t('errorOccurred')}</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            </div>
        )}
        <div className="space-y-4">
          {currentConversationId ? (
              <>
                  {displayMessages.map((message) => (
                    <ChatMessage 
                      key={message.id} 
                      message={message} 
                      isEditing={editingMessageId === message.id}
                      onStartEdit={() => setEditingMessageId(message.id)}
                      onCancelEdit={() => setEditingMessageId(null)}
                      onSaveEdit={(newContent) => handleSaveEdit(message.id, newContent)}
                      onCopyMessage={() => navigator.clipboard.writeText(message.content)}
                    />
                  ))}
                  {isLoading && <LoadingIndicator />}
              </>
          ) : (
              <WelcomeScreen />
          )}
        </div>
    </div>
  );


  return (
    <div className="h-[100dvh] bg-gray-900 text-white overflow-hidden">
      {isDesktop ? (
        <PanelGroup direction="horizontal">
            <Panel defaultSize={20} minSize={15} maxSize={30} collapsible={true} collapsedSize={0} onCollapse={setIsSidebarCollapsed as PanelOnCollapse} className="flex flex-col">
                <Sidebar {...{ conversations, currentConversationId, handleNewChat, setCurrentConversationId, handleDeleteChat, handleDuplicateChat, editingChatId, setEditingChatId, editingTitle, setEditingTitle, handleUpdateChatTitle, isOpen: true, setIsOpen: () => {}, isCollapsed: isSidebarCollapsed }} />
            </Panel>
            <PanelResizeHandle className="w-2 bg-gray-800 hover:bg-orange-500/50 transition-colors duration-200 cursor-col-resize" />
            <Panel className="flex-1 flex flex-col relative min-h-0">
                  <header className="absolute top-4 right-4 z-10 flex gap-2 items-center">
                    <button onClick={handleLogout} className="px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600">{t('logout')}</button>
                    <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center w-10 h-10 text-white rounded-full bg-gradient-to-r from-orange-500 to-red-600"><Settings className="w-5 h-5" /></button>
                </header>
                
                <main ref={messagesContainerRef} className="flex-1 overflow-y-auto">
                    <div className={`w-full max-w-5xl mx-auto ${!currentConversationId ? 'h-full flex items-center justify-center' : ''}`}>
                        <MainContent />
                    </div>
                </main>
                
                {showScrollDownButton && (
                    <ScrollDownButton
                        onClick={handleScrollDownClick}
                        className="bottom-28 right-10"
                    />
                )}

                <footer className="w-full max-w-5xl mx-auto">
                      <ChatInput ref={textareaRef} {...{ input, setInput, handleSubmit, isLoading }} />
                </footer>
            </Panel>
        </PanelGroup>
      ) : (
        <div className="h-full flex flex-col relative">
            {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div>}
            <Sidebar 
                {...{ 
                    conversations, currentConversationId, handleDeleteChat, handleDuplicateChat, editingChatId, setEditingChatId, editingTitle, setEditingTitle, handleUpdateChatTitle, isOpen: isSidebarOpen, setIsOpen: setIsSidebarOpen, isCollapsed: false,
                    handleNewChat: () => { handleNewChat(); setIsSidebarOpen(false); },
                    setCurrentConversationId: (id) => { setCurrentConversationId(id); setIsSidebarOpen(false); } 
                }} 
            />
            
            <header className="flex-shrink-0 h-16 bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-between px-4 border-b border-gray-700">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white rounded-lg hover:bg-gray-700"><Menu className="w-6 h-6" /></button>
                <div className="flex items-center gap-2">
                    <button onClick={handleLogout} className="px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600">{t('logout')}</button>
                    <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center w-9 h-9 text-white rounded-full bg-gradient-to-r from-orange-500 to-red-600"><Settings className="w-5 h-5" /></button>
                </div>
            </header>
            
            <main 
                ref={messagesContainerRef} 
                className={`flex-1 overflow-y-auto min-h-0 ${!currentConversationId ? 'flex items-center justify-center' : ''}`}
            >
                <MainContent />
            </main>
            
            {showScrollDownButton && (
                <ScrollDownButton
                    onClick={handleScrollDownClick}
                    className="bottom-24 right-4"
                />
            )}
            
            <footer className="flex-shrink-0 w-full">
                <ChatInput ref={textareaRef} {...{ input, setInput, handleSubmit, isLoading }} />
            </footer>
        </div>
      )}
        
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}