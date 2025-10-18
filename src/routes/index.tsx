// 📄 src/routes/index.tsx

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Settings, Menu } from 'lucide-react' // -> ИЗМЕНЕНИЕ: Добавлена иконка Menu
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

  useEffect(() => {
    if (user) {
      loadConversations()
      loadPrompts()
      loadSettings()
    }
  }, [user, loadConversations, loadPrompts, loadSettings])

  const messages = useMemo(() => currentConversation?.messages || [], [currentConversation])
  
  const [input, setInput] = useState('')
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // ++ НОВОЕ: Состояние для мобильного сайдбара
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null)
  const [error, setError] = useState<string | null>(null)
  
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

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
  }, [])
  
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

      const currentInput = input
      setInput('')
      setLoading(true)
      setError(null)

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
        console.error('Error in handleSubmit:', error)
        setError(error instanceof Error ? error.message : 'An unexpected error occurred.')
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

  return (
    // -> ИЗМЕНЕНИЕ: Добавлен `overflow-hidden` для исправления бага с прокруткой
    <div className="relative flex h-screen bg-gray-900 overflow-hidden">
      
      {/* ++ НОВОЕ: Оверлей для затемнения фона на мобильных при открытом сайдбаре */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* -> ИЗМЕНЕНИЕ: Передаем новые props в Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        handleNewChat={handleNewChat}
        setCurrentConversationId={(id) => {
          setCurrentConversationId(id);
          setIsSidebarOpen(false); // Закрываем сайдбар при выборе чата на мобильном
        }}
        handleDeleteChat={handleDeleteChat}
        editingChatId={editingChatId}
        setEditingChatId={setEditingChatId}
        editingTitle={editingTitle}
        setEditingTitle={setEditingTitle}
        handleUpdateChatTitle={handleUpdateChatTitle}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex flex-col flex-1">
        {/* -> ИЗМЕНЕНИЕ: Добавлена кнопка-бургер */}
        <div className="absolute top-5 right-5 z-10 flex gap-2 items-center">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-white rounded-lg md:hidden hover:bg-gray-700"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <button onClick={handleLogout} className="px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600">Logout</button>
          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center w-10 h-10 text-white transition-opacity rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"><Settings className="w-5 h-5" /></button>
        </div>

        {error && <p className="w-full max-w-3xl p-4 mx-auto font-bold text-orange-500">{error}</p>}
        {currentConversationId ? (
          <>
            <div ref={messagesContainerRef} className="flex-1 pb-24 overflow-y-auto">
              <div className="w-full max-w-3xl px-4 mx-auto">
                {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
                {pendingMessage && <ChatMessage message={pendingMessage} />}
                {isLoading && (!pendingMessage || pendingMessage.content === '') && <LoadingIndicator />}
              </div>
            </div>
            <ChatInput input={input} setInput={setInput} handleSubmit={handleSubmit} isLoading={isLoading} />
          </>
        ) : (
          <WelcomeScreen input={input} setInput={setInput} handleSubmit={handleSubmit} isLoading={isLoading} />
        )}
      </div>

      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}