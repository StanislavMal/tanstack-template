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
import { useConversations, useAppState, store } from '../store'
import { genAIResponse, type Message } from '../utils'
import { supabase } from '../utils/supabase'
import { useAuth } from '../providers/AuthProvider' // Важный импорт для получения юзера

// --- Защита маршрута ---
export const Route = createFileRoute('/')({
  // Эта функция выполнится ПЕРЕД загрузкой компонента
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      // Если сессии нет, перенаправляем на страницу входа
      throw redirect({
        to: '/login',
      })
    }
  },
  // Компонент будет отрендерен только если сессия есть
  component: Home,
})

// --- Основной компонент страницы ---
function Home() {
  const navigate = useNavigate()
  const { user } = useAuth() // Получаем текущего пользователя

  const {
    conversations,
    currentConversationId,
    currentConversation,
    setCurrentConversationId,
    loadConversations,
    createNewConversation,
    updateConversationTitle,
    deleteConversation,
    addMessage,
  } = useConversations()

  const { isLoading, setLoading, getActivePrompt } = useAppState()

  // Загружаем чаты из Supabase, когда пользователь становится известен
  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user, loadConversations])

  // Memoize messages to prevent unnecessary re-renders
  const messages = useMemo(
    () => currentConversation?.messages || [],
    [currentConversation],
  )

  // Local state
  const [input, setInput] = useState('')
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null)
  const [error, setError] = useState<string | null>(null)

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  const createTitleFromInput = useCallback((text: string) => {
    const words = text.trim().split(/\s+/)
    const firstThreeWords = words.slice(0, 3).join(' ')
    return firstThreeWords + (words.length > 3 ? '...' : '')
  }, [])

  const processAIResponse = useCallback(
    async (conversationId: string, userMessage: Message) => {
      try {
        const activePrompt = getActivePrompt(store.state)
        let systemPrompt
        if (activePrompt) {
          systemPrompt = {
            value: activePrompt.content,
            enabled: true,
          }
        }

        const response = await genAIResponse({
          data: {
            messages: [...messages, userMessage],
            systemPrompt,
          },
        })

        if (!response.body) throw new Error('No response body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let done = false
        let newMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: '',
        }

        while (!done) {
          const { value, done: readerDone } = await reader.read()
          done = readerDone
          if (value) {
            const rawText = decoder.decode(value, { stream: true })
            rawText
              .replace(/}\{/g, '}\n{')
              .split('\n')
              .forEach((chunkStr) => {
                if (chunkStr) {
                  try {
                    const parsed = JSON.parse(chunkStr)
                    if (parsed.text) {
                      newMessage = {
                        ...newMessage,
                        content: newMessage.content + parsed.text,
                      }
                      setPendingMessage({ ...newMessage })
                    }
                  } catch (e) {
                    /* ignore */
                  }
                }
              })
          }
        }

        setPendingMessage(null)
        if (newMessage.content.trim()) {
          await addMessage(conversationId, newMessage)
        }
      } catch (error) {
        console.error('Error in AI response:', error)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: 'Sorry, I encountered an error generating a response.',
        }
        await addMessage(conversationId, errorMessage)
      }
    },
    [messages, getActivePrompt, addMessage],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

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

      try {
        let conversationId = currentConversationId

        if (!conversationId) {
          try {
            const newConvId = await createNewConversation(conversationTitle)
            if (newConvId) {
              conversationId = newConvId
              await addMessage(conversationId, userMessage)
            } else {
              throw new Error('Failed to create conversation in Supabase')
            }
          } catch (error) {
            console.error('Error creating conversation:', error)
            setError('Failed to start a new conversation.')
            setLoading(false)
            return
          }
        } else {
          await addMessage(conversationId, userMessage)
        }

        await processAIResponse(conversationId, userMessage)
      } catch (error) {
        console.error('Error in handleSubmit:', error)
        setError('An unexpected error occurred.')
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

  const handleNewChat = useCallback(() => {
    setCurrentConversationId(null)
  }, [setCurrentConversationId])

  const handleDeleteChat = useCallback(
    async (id: string) => {
      await deleteConversation(id)
    },
    [deleteConversation],
  )

  const handleUpdateChatTitle = useCallback(
    async (id: string, title: string) => {
      await updateConversationTitle(id, title)
      setEditingChatId(null)
      setEditingTitle('')
    },
    [updateConversationTitle],
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate({ to: '/login' })
  }

  return (
    <div className="relative flex h-screen bg-gray-900">
      <div className="absolute z-50 top-5 right-5 flex gap-2">
        <button
          onClick={handleLogout}
          className="px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600"
        >
          Logout
        </button>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center justify-center w-10 h-10 text-white transition-opacity rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        handleNewChat={handleNewChat}
        setCurrentConversationId={setCurrentConversationId}
        handleDeleteChat={handleDeleteChat}
        editingChatId={editingChatId}
        setEditingChatId={setEditingChatId}
        editingTitle={editingTitle}
        setEditingTitle={setEditingTitle}
        handleUpdateChatTitle={handleUpdateChatTitle}
      />

      <div className="flex flex-col flex-1">
        {error && (
          <p className="w-full max-w-3xl p-4 mx-auto font-bold text-orange-500">
            {error}
          </p>
        )}
        {currentConversationId ? (
          <>
            <div
              ref={messagesContainerRef}
              className="flex-1 pb-24 overflow-y-auto"
            >
              <div className="w-full max-w-3xl px-4 mx-auto">
                {[...messages, pendingMessage]
                  .filter((message): message is Message => message !== null)
                  .map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                {isLoading && <LoadingIndicator />}
              </div>
            </div>

            <ChatInput
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </>
        ) : (
          <WelcomeScreen
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        )}
      </div>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}