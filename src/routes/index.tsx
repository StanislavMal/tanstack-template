// 📄 src/routes/index.tsx

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Settings, Menu, AlertTriangle } from 'lucide-react'
import {
  SettingsDialog,
  ChatMessage,
  LoadingIndicator,
  ChatInput,
  Sidebar,
  WelcomeScreen,
} from '../components'
import { useConversations, usePrompts, useSettings, useAppState } from '../store'
import { genAIResponse, type Message } from '../utils'
import { supabase } from '../utils/supabase'
import { useAuth } from '../providers/AuthProvider'

import { Panel, PanelGroup, PanelResizeHandle, type PanelOnCollapse } from 'react-resizable-panels'


export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { throw redirect({ to: '/login' }) }
  },
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const { conversations, loadConversations, createNewConversation, updateConversationTitle, deleteConversation, addMessage, setCurrentConversationId, currentConversationId, currentConversation } = useConversations()
  const { isLoading, setLoading } = useAppState()
  const { settings, loadSettings } = useSettings()
  const { activePrompt, loadPrompts } = usePrompts()
  
  const [input, setInput] = useState('')
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // -> ИЗМЕНЕНИЕ: Создаем ДВА разных ref'а для мобильного и десктопного контейнеров
  const mobileMessagesContainerRef = useRef<HTMLElement>(null);
  const desktopMessagesContainerRef = useRef<HTMLElement>(null);

  const [pendingMessage, setPendingMessage] = useState<Message | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);


  useEffect(() => {
    if (user) {
      loadConversations()
      loadPrompts()
      loadSettings()
    }
  }, [user, loadConversations, loadPrompts, loadSettings])

  const messages = useMemo(() => currentConversation?.messages || [], [currentConversation])
  
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

  // -> ИЗМЕНЕНИЕ: Функция теперь проверяет оба ref'а
  const scrollToBottom = useCallback(() => {
    const container = mobileMessagesContainerRef.current || desktopMessagesContainerRef.current;
    if (container) {
        setTimeout(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }
}, []);
  
  useEffect(() => { scrollToBottom() }, [messages, pendingMessage, scrollToBottom])
  
  const createTitleFromInput = useCallback((text: string) => {
    const words = text.trim().split(/\s+/)
    const firstThreeWords = words.slice(0, 3).join(' ')
    return firstThreeWords + (words.length > 3 ? '...' : '')
  }, [])

  const processAIResponse = useCallback(
    async (userMessage: Message) => {
      if (!settings) {
        setError("User settings not loaded.");
        return null;
      }
      
      finalContentRef.current = ''; 
      const initialAssistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' };
      
      try {
        const response = await genAIResponse({
          data: {
            messages: [...messages, userMessage],
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
                    isFirstChunk = false;
                  }
                  textQueueRef.current += parsed.text;
                }
              } catch (e) { /* ignore */ }
            }
          })
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
        return null;
      }
    },
    [messages, settings, activePrompt],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      textQueueRef.current = '';
      finalContentRef.current = '';
      setPendingMessage(null);
      setError(null);

      const currentInput = input
      setInput('')
      setLoading(true)

      const conversationTitle = createTitleFromInput(currentInput)
      const userMessage: Message = { id: Date.now().toString(), role: 'user' as const, content: currentInput.trim() }

      let conversationId = currentConversationId;
      
      try {
        if (!conversationId) {
          const newConvId = await createNewConversation(conversationTitle)
          if (newConvId) conversationId = newConvId
        }
        
        if (!conversationId) throw new Error('Failed to create or find conversation ID.');

        await addMessage(conversationId, userMessage);
        
        const finalAiMessage = await processAIResponse(userMessage);
        
        if (finalAiMessage && finalAiMessage.content.trim()) {
            await addMessage(conversationId, finalAiMessage);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        console.error('Error in handleSubmit:', error)
        setError(errorMessage);
      } finally {
        setLoading(false)
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
    ],
  )

  const handleNewChat = useCallback(() => { setCurrentConversationId(null) }, [setCurrentConversationId])
  const handleDeleteChat = useCallback(async (id: string) => { await deleteConversation(id) }, [deleteConversation])
  const handleUpdateChatTitle = useCallback(async (id: string, title: string) => { await updateConversationTitle(id, title); setEditingChatId(null); setEditingTitle(''); }, [updateConversationTitle])
  const handleLogout = async () => { await supabase.auth.signOut(); navigate({ to: '/login' }) }

  const MainContent = () => (
    <div className="w-full h-full p-4">
        {error && (
            <div className="bg-red-500/10 border-l-4 border-red-500 text-red-300 p-4 mb-4 rounded-r-lg" role="alert">
                <div className="flex">
                    <div className="py-1"><AlertTriangle className="h-5 w-5 text-red-400 mr-3" /></div>
                    <div>
                        <p className="font-bold">An error occurred</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            </div>
        )}
        <div className="space-y-6">
          {currentConversationId ? (
              <>
                  {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
                  {pendingMessage && <ChatMessage message={pendingMessage} />}
                  {isLoading && (!pendingMessage || pendingMessage.content === '') && <LoadingIndicator />}
              </>
          ) : (
              <div className="flex h-full items-center justify-center pt-20 md:pt-0"><WelcomeScreen /></div>
          )}
        </div>
    </div>
  );


  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
        {/* Мобильная версия */}
        <div className="md:hidden h-full flex flex-col">
            {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div>}
            <Sidebar {...{ conversations, currentConversationId, handleNewChat, handleDeleteChat, editingChatId, setEditingChatId, editingTitle, setEditingTitle, handleUpdateChatTitle, isOpen: isSidebarOpen, setIsOpen: setIsSidebarOpen, isCollapsed: false, setCurrentConversationId: (id) => { setCurrentConversationId(id); setIsSidebarOpen(false); } }} />
            
            <div className="flex-1 flex flex-col relative min-h-0">
                <header className="absolute top-0 left-0 right-0 h-16 bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-between px-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white rounded-lg hover:bg-gray-700"><Menu className="w-6 h-6" /></button>
                    <div className="flex items-center gap-2">
                        <button onClick={handleLogout} className="px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600">Logout</button>
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center w-9 h-9 text-white rounded-full bg-gradient-to-r from-orange-500 to-red-600"><Settings className="w-5 h-5" /></button>
                    </div>
                </header>
                
                {/* -> ИЗМЕНЕНИЕ: Применяем ref к мобильному <main> */}
                <main ref={mobileMessagesContainerRef} className="flex-1 pt-16 pb-4 overflow-y-auto">
                    <MainContent />
                </main>
                
                <footer className="w-full">
                    <ChatInput {...{ input, setInput, handleSubmit, isLoading }} />
                </footer>
            </div>
        </div>

        {/* Десктопная версия */}
        <div className="hidden md:flex h-full">
            <PanelGroup direction="horizontal">
                <Panel defaultSize={20} minSize={15} maxSize={30} collapsible={true} collapsedSize={0} onCollapse={setIsSidebarCollapsed as PanelOnCollapse} className="flex flex-col">
                    <Sidebar {...{ conversations, currentConversationId, handleNewChat, setCurrentConversationId, handleDeleteChat, editingChatId, setEditingChatId, editingTitle, setEditingTitle, handleUpdateChatTitle, isOpen: true, setIsOpen: () => {}, isCollapsed: isSidebarCollapsed }} />
                </Panel>
                <PanelResizeHandle className="w-2 bg-gray-800 hover:bg-orange-500/50 transition-colors duration-200 cursor-col-resize" />
                <Panel className="flex-1 flex flex-col relative min-h-0">
                     <header className="absolute top-4 right-4 z-10 flex gap-2 items-center">
                        <button onClick={handleLogout} className="px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600">Logout</button>
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center w-10 h-10 text-white rounded-full bg-gradient-to-r from-orange-500 to-red-600"><Settings className="w-5 h-5" /></button>
                    </header>
                    
                    {/* -> ИЗМЕНЕНИЕ: Скролл теперь на <main>, а не на <Panel>. ref применяется сюда. */}
                    <main ref={desktopMessagesContainerRef} className="flex-1 overflow-y-auto">
                        <div className="w-full lg:w-3/4 xl:w-2/3 mx-auto">
                           <MainContent />
                        </div>
                    </main>
                    <footer className="w-full lg:w-3/4 xl:w-2/3 mx-auto">
                         <ChatInput {...{ input, setInput, handleSubmit, isLoading }} />
                    </footer>
                </Panel>
            </PanelGroup>
        </div>
        <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}