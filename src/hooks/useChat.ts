// 📄 src/hooks/useChat.ts

import { useState, useRef, useCallback, useEffect } from 'react';
import { streamChat } from '../lib/ai/server';
import type { Message } from '../lib/ai/types';
import { useConversations, useSettings, usePrompts } from '../store/hooks';

interface UseChatOptions {
  onMessageSent?: (message: Message) => void;
  onResponseComplete?: (message: Message) => void;
  onError?: (error: string) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null);
  
  const { settings } = useSettings();
  const { activePrompt } = usePrompts();
  const { 
    currentConversationId, 
    addMessage, 
    createNewConversation,
    editMessageAndUpdate 
  } = useConversations();

  // ✅ УПРОЩЕНО: только необходимые refs
  const textQueueRef = useRef<string>('');
  const displayedTextRef = useRef<string>('');
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const bufferRef = useRef<string>('');
  const activeRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      textQueueRef.current = '';
      displayedTextRef.current = '';
      bufferRef.current = '';
      activeRequestIdRef.current = null;
    };
  }, [currentConversationId]);

  // ✅ НОВАЯ ЛОГИКА: простой setInterval
  const startTypingAnimation = useCallback((messageId: string) => {
    // Останавливаем предыдущую анимацию если была
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    const streamSpeed = settings?.streamSpeed || 30; // символов/секунду
    const intervalMs = 50; // обновляем каждые 50ms
    const charsPerTick = Math.max(1, Math.round((streamSpeed * intervalMs) / 1000));

    console.log(`[Animation] Starting with speed: ${streamSpeed} chars/sec, ${charsPerTick} chars per tick`);

    intervalIdRef.current = setInterval(() => {
      // Забираем символы из очереди
      if (textQueueRef.current.length > 0) {
        const charsToAdd = textQueueRef.current.substring(0, charsPerTick);
        textQueueRef.current = textQueueRef.current.substring(charsPerTick);
        displayedTextRef.current += charsToAdd;

        // Обновляем React state
        setPendingMessage(prev => {
          if (prev && prev.id === messageId) {
            return { ...prev, content: displayedTextRef.current };
          }
          return prev;
        });
      } else if (displayedTextRef.current.length > 0) {
        // Очередь пустая, но текст есть - финальное обновление
        setPendingMessage(prev => {
          if (prev && prev.id === messageId && prev.content !== displayedTextRef.current) {
            return { ...prev, content: displayedTextRef.current };
          }
          return prev;
        });
      } else {
        // Всё готово - останавливаем
        if (intervalIdRef.current) {
          console.log('[Animation] Finished');
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
      }
    }, intervalMs);
  }, [settings?.streamSpeed]);

  const stopTypingAnimation = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  const parseNDJSON = useCallback((data: string) => {
    bufferRef.current += data;
    const lines = bufferRef.current.split('\n');
    bufferRef.current = lines.pop() || '';
    
    const chunks = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      try {
        const chunk = JSON.parse(trimmedLine);
        chunks.push(chunk);
      } catch (parseError) {
        console.warn('[useChat] Failed to parse NDJSON line:', trimmedLine);
      }
    }
    
    return chunks;
  }, []);

  const processAIResponse = useCallback(
    async (messageHistory: Message[]) => {
      if (!settings) {
        const errorMsg = "User settings not loaded.";
        setError(errorMsg);
        options.onError?.(errorMsg);
        return null;
      }

      const requestId = crypto.randomUUID();
      activeRequestIdRef.current = requestId;

      // ✅ ОЧИСТКА всех буферов
      bufferRef.current = '';
      textQueueRef.current = '';
      displayedTextRef.current = '';
      stopTypingAnimation();
      
      const assistantMessageId = crypto.randomUUID();

      try {
        const provider = settings.model.startsWith('gemini') ? 'gemini' : 'gemini';

        const response = await streamChat({
          data: {
            messages: messageHistory,
            provider,
            model: settings.model,
            systemInstruction: settings.system_instruction,
            activePromptContent: activePrompt?.content,
          },
        });

        if (activeRequestIdRef.current !== requestId) {
          return null;
        }

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let animationStarted = false;

        while (true) {
          if (activeRequestIdRef.current !== requestId) {
            reader.cancel();
            return null;
          }

          const { value, done } = await reader.read();
          if (done) break;

          const rawText = decoder.decode(value, { stream: true });
          const chunks = parseNDJSON(rawText);
          
          for (const chunk of chunks) {
            if (chunk.error) {
              throw new Error(chunk.error);
            }
            
            if (chunk.text) {
              // ✅ При первом чанке инициализируем сообщение и запускаем анимацию
              if (!animationStarted) {
                console.log('[Stream] First chunk received, starting animation');
                setPendingMessage({ 
                  id: assistantMessageId, 
                  role: 'assistant', 
                  content: '' 
                });
                startTypingAnimation(assistantMessageId);
                setIsLoading(false);
                animationStarted = true;
              }
              
              // Просто добавляем в очередь
              textQueueRef.current += chunk.text;
              console.log(`[Stream] Queue size: ${textQueueRef.current.length}`);
            }
          }
        }

        if (activeRequestIdRef.current !== requestId) {
          return null;
        }

        console.log('[Stream] All chunks received, waiting for animation to finish');

        // ✅ Ждём пока анимация допечатает всё
        await new Promise<void>(resolve => {
          const checkInterval = setInterval(() => {
            if (textQueueRef.current.length === 0 && !intervalIdRef.current) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          
          // Таймаут 10 секунд
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 10000);
        });

        console.log('[Stream] Animation finished, final content length:', displayedTextRef.current.length);

        const finalMessage = { 
          id: assistantMessageId, 
          role: 'assistant' as const, 
          content: displayedTextRef.current 
        };

        return finalMessage;

      } catch (error) {
        if (activeRequestIdRef.current !== requestId) {
          return null;
        }

        const errorMsg = error instanceof Error ? error.message : 'An error occurred';
        console.error('[useChat] Error:', error);
        setError(errorMsg);
        options.onError?.(errorMsg);
        return null;
      } finally {
        stopTypingAnimation();
        bufferRef.current = '';
      }
    },
    [settings, activePrompt, startTypingAnimation, stopTypingAnimation, options, parseNDJSON]
  );

  const sendMessage = useCallback(
    async (content: string, conversationTitle?: string) => {
      if (!content.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);
      setPendingMessage(null);
      
      const userMessage: Message = { 
        id: crypto.randomUUID(), 
        role: 'user', 
        content: content.trim() 
      };

      try {
        let convId = currentConversationId;
        
        if (!convId) {
          const title = conversationTitle || content.slice(0, 30) + '...';
          convId = await createNewConversation(title);
          if (!convId) throw new Error('Failed to create conversation');
        }

        await addMessage(convId, userMessage);
        options.onMessageSent?.(userMessage);

        const { selectors, store } = await import('../store/store');
        const currentMessages = selectors.getCurrentMessages(store.state);

        const aiResponse = await processAIResponse(currentMessages);
        
        if (aiResponse && aiResponse.content.trim()) {
          await addMessage(convId, aiResponse);
          options.onResponseComplete?.(aiResponse);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('[useChat] Error in sendMessage:', error);
        setError(errorMsg);
        options.onError?.(errorMsg);
      } finally {
        setIsLoading(false);
        setPendingMessage(null);
      }
    },
    [
      isLoading, 
      currentConversationId, 
      createNewConversation, 
      addMessage, 
      processAIResponse,
      options
    ]
  );

  const editAndRegenerate = useCallback(
    async (messageId: string, newContent: string) => {
      if (!currentConversationId) return;

      setIsLoading(true);
      setError(null);
      setPendingMessage(null);

      try {
        const updatedHistory = await editMessageAndUpdate(messageId, newContent);
        
        if (!updatedHistory || updatedHistory.length === 0) {
          throw new Error("Failed to update message");
        }

        const lastMessage = updatedHistory[updatedHistory.length - 1];
        options.onMessageSent?.(lastMessage);

        const aiResponse = await processAIResponse(updatedHistory);
        
        if (aiResponse && aiResponse.content.trim()) {
          await addMessage(currentConversationId, aiResponse);
          options.onResponseComplete?.(aiResponse);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An error occurred during edit';
        console.error('[useChat] Error in editAndRegenerate:', error);
        setError(errorMsg);
        options.onError?.(errorMsg);
      } finally {
        setIsLoading(false);
        setPendingMessage(null);
      }
    },
    [
      currentConversationId, 
      editMessageAndUpdate, 
      addMessage, 
      processAIResponse,
      options
    ]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    sendMessage,
    editAndRegenerate,
    isLoading,
    error,
    clearError,
    pendingMessage,
  };
}