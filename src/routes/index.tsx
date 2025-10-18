// 📄 src/routes/index.tsx

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Settings } from 'lucide-react'
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

  const { conversations, loadConversations, createNewConversation, updateConversationTitle, deleteConversation, addMessage, setCurrentConversationId, currentConversationId, currentConversation, updateMessageContent } = useConversations()
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
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  
  const textQueueRef = useRef<string>('');
  const animationFrameRef = useRef<number | undefined>(undefined);
  const streamingMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const animatePrinting = () => {
      if (textQueueRef.current.length > 0 && streamingMessageIdRef.current && currentConversationId) {
        const speed = 2;
        const charsToPrint = textQueueRef.current.substring(0, speed);
        textQueueRef.current = textQueueRef.current.substring(speed);

        const conv = currentConversation;
        const msg = conv?.messages.find(m => m.id === streamingMessageIdRef.current);

        if (conv && msg) {
          // Вызываем `updateMessageContent` для плавного обновления UI
          updateMessageContent(conv.id, msg.id, msg.content + charsToPrint);
        }
      }
      animationFrameRef.current = requestAnimationFrame(animatePrinting);
    };

    animationFrameRef.current = requestAnimationFrame(animatePrinting);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentConversationId, currentConversation, updateMessageContent]);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [])
  
  useEffect(() => { scrollToBottom() }, [messages, isLoading, scrollToBottom])
  
  const createTitleFromInput = useCallback((text: string) => {
    const words = text.trim().split(/\s+/)
    const firstThreeWords = words.slice(0, 3).join(' ')
    return firstThreeWords + (words.length > 3 ? '...' : '')
  }, [])

  const processAIResponse = useCallback(
    async (conversationId: string, userMessage: Message) => {
      if (!settings) {
        setError("User settings not loaded. Please try again.");
        return;
      }
      
      textQueueRef.current = '';
      const assistantMessageId = (Date.now() + 1).toString();
      streamingMessageIdRef.current = assistantMessageId;
      
      // Создаем и сразу добавляем "пустое" сообщение в историю
      const initialAssistantMessage: Message = { 
          id: assistantMessageId,
          role: 'assistant' as const, 
          content: '' 
      };
      await addMessage(conversationId, initialAssistantMessage);

      try {
        const response = await genAIResponse({
          data: {
            messages: [...messages, userMessage], // Передаем актуальные сообщения
            model: settings.model,
            mainSystemInstruction: settings.system_instruction,
            activePromptContent: activePrompt?.content,
          },
        })

        if (!response.body) throw new Error('No response body')
        
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { value, done } = await reader.read()
          if (done) {
            break;
          }
          const rawText = decoder.decode(value, { stream: true })
          rawText.replace(/}\{/g, '}\n{').split('\n').forEach((chunkStr) => {
            if (chunkStr) {
              try {
                const parsed = JSON.parse(chunkStr)
                if (parsed.text) {
                  textQueueRef.current += parsed.text;
                }
              } catch (e) { /* ignore */ }
            }
          })
        }
        
        // Ждем, пока вся очередь допечатается
        await new Promise(resolve => {
            const interval = setInterval(() => {
                if (textQueueRef.current.length === 0) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 50);
        });
        
        // Финальное обновление полного сообщения в БД
        const finalContent = currentConversation?.messages.find(m => m.id === assistantMessageId)?.content || '';
        if (finalContent.trim()) {
            await addMessage(conversationId, { ...initialAssistantMessage, content: finalContent });
        }

      } catch (error) {
        console.error('Error in AI response:', error);
        // Можно добавить логику для отображения ошибки в чате
      } finally {
        streamingMessageIdRef.current = null;
      }
    },
    [messages, settings, activePrompt, addMessage, updateMessageContent, currentConversation],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      textQueueRef.current = '';
      streamingMessageIdRef.current = null;

      const currentInput = input
      setInput('')
      setLoading(true)
      setError(null)

      const conversationTitle = createTitleFromInput(currentInput)
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: currentInput.trim(),
      }

      let conversationId = currentConversationId;
      
      try {
        if (!conversationId) {
          const newConvId = await createNewConversation(conversationTitle)
          if (newConvId) {
            conversationId = newConvId
          }
        }
        
        if (!conversationId) {
          throw new Error('Failed to create or find conversation ID.')
        }

        await addMessage(conversationId, userMessage)
        await processAIResponse(conversationId, userMessage)

      } catch (error) {
        console.error('Error in handleSubmit:', error)
        setError(error instanceof Error ? error.message : 'An unexpected error occurred.')
      } finally {
        setLoading(false)
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
    <div className="relative flex h-screen bg-gray-900">
      <div className="absolute z-50 top-5 right-5 flex gap-2">
        <button onClick={handleLogout} className="px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600">Logout</button>
        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center w-10 h-10 text-white transition-opacity rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"><Settings className="w-5 h-5" /></button>
      </div>

      <Sidebar conversations={conversations} currentConversationId={currentConversationId} handleNewChat={handleNewChat} setCurrentConversationId={setCurrentConversationId} handleDeleteChat={handleDeleteChat} editingChatId={editingChatId} setEditingChatId={setEditingChatId} editingTitle={editingTitle} setEditingTitle={setEditingTitle} handleUpdateChatTitle={handleUpdateChatTitle} />

      <div className="flex flex-col flex-1">
        {error && <p className="w-full max-w-3xl p-4 mx-auto font-bold text-orange-500">{error}</p>}
        {currentConversationId ? (
          <>
            <div ref={messagesContainerRef} className="flex-1 pb-24 overflow-y-auto">
              <div className="w-full max-w-3xl px-4 mx-auto">
                {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
                {/* pendingMessage больше не нужен, isLoading используется для индикатора загрузки */}
                {isLoading && <LoadingIndicator />}
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