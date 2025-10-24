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

  const textQueueRef = useRef<string>('');
  const displayedTextRef = useRef<string>('');
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const bufferRef = useRef<string>('');
  const activeRequestIdRef = useRef<string | null>(null);
  const isStreamActiveRef = useRef<boolean>(false); // ✅ НОВОЕ

  useEffect(() => {
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      textQueueRef.current = '';
      displayedTextRef.current = '';
      bufferRef.current = '';
      activeRequestIdRef.current = null;
      isStreamActiveRef.current = false;
    };
  }, [currentConversationId]);

  // ✅ ИСПРАВЛЕНО: interval работает пока стрим активен ИЛИ есть символы
  const startTypingAnimation = useCallback((messageId: string) => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    const streamSpeed = settings?.streamSpeed || 30;
    
    // Адаптивный интервал
    let updateIntervalMs: number;
    if (streamSpeed <= 30) {
      updateIntervalMs = 33;  // 30 FPS
    } else if (streamSpeed <= 60) {
      updateIntervalMs = 50;  // 20 FPS
    } else if (streamSpeed <= 100) {
      updateIntervalMs = 75;  // 13 FPS
    } else {
      updateIntervalMs = 100; // 10 FPS
    }
    
    const charsPerTick = Math.max(1, Math.round((streamSpeed * updateIntervalMs) / 1000));

    console.log(`[Animation] Speed: ${streamSpeed} chars/sec, Interval: ${updateIntervalMs}ms, ${charsPerTick} chars/tick`);

    intervalIdRef.current = setInterval(() => {
      // ✅ Если есть символы - печатаем
      if (textQueueRef.current.length > 0) {
        const charsToAdd = textQueueRef.current.substring(0, charsPerTick);
        textQueueRef.current = textQueueRef.current.substring(charsPerTick);
        displayedTextRef.current += charsToAdd;

        setPendingMessage(prev => {
          if (prev && prev.id === messageId) {
            return { ...prev, content: displayedTextRef.current };
          }
          return prev;
        });

        console.log(`[Animation] Displayed: ${displayedTextRef.current.length}, Queue: ${textQueueRef.current.length}`);
      }
      
      // ✅ КЛЮЧЕВОЕ: останавливаем ТОЛЬКО если стрим завершён И очередь пуста
      if (!isStreamActiveRef.current && textQueueRef.current.length === 0) {
        if (intervalIdRef.current) {
          console.log('[Animation] Stream finished and queue empty, stopping');
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
      }
    }, updateIntervalMs);
  }, [settings?.streamSpeed]);

  const stopTypingAnimation = useCallback(() => {
    isStreamActiveRef.current = false; // ✅ Сигнализируем что стрим завершён
    // НЕ останавливаем interval сразу - он сам остановится когда очередь опустеет
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
        console.warn('[useChat] Failed to parse NDJSON line');
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

      // Очистка
      bufferRef.current = '';
      textQueueRef.current = '';
      displayedTextRef.current = '';
      isStreamActiveRef.current = false;
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      
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

        // ✅ Получаем чанки
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
              if (!animationStarted) {
                console.log('[Stream] First chunk received, starting animation');
                
                // Инициализируем пустое сообщение
                setPendingMessage({ 
                  id: assistantMessageId, 
                  role: 'assistant', 
                  content: '' 
                });
                
                // ✅ Отмечаем что стрим активен
                isStreamActiveRef.current = true;
                
                // Запускаем анимацию
                startTypingAnimation(assistantMessageId);
                setIsLoading(false);
                animationStarted = true;
              }
              
              // Просто добавляем в очередь - анимация сама заберёт
              textQueueRef.current += chunk.text;
              console.log(`[Stream] Added to queue, total: ${textQueueRef.current.length}`);
            }
          }
        }

        console.log('[Stream] All chunks received, total queue: ', textQueueRef.current.length);

        // ✅ Сигнализируем что стрим завершён
        isStreamActiveRef.current = false;

        // ✅ Ждём пока очередь опустеет
        await new Promise<void>(resolve => {
          const checkInterval = setInterval(() => {
            const queueEmpty = textQueueRef.current.length === 0;
            const animationStopped = intervalIdRef.current === null;
            
            console.log(`[Wait] Queue: ${textQueueRef.current.length}, Animation: ${animationStopped ? 'stopped' : 'running'}`);
            
            if (queueEmpty && animationStopped) {
              clearInterval(checkInterval);
              console.log('[Wait] Animation complete!');
              resolve();
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            // Форсируем остановку если что-то пошло не так
            if (intervalIdRef.current) {
              clearInterval(intervalIdRef.current);
              intervalIdRef.current = null;
            }
            console.log('[Wait] Timeout reached');
            resolve();
          }, 120000);
        });

        console.log('[Stream] Final displayed length:', displayedTextRef.current.length);

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
          setPendingMessage(null);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('[useChat] Error in sendMessage:', error);
        setError(errorMsg);
        options.onError?.(errorMsg);
      } finally {
        setIsLoading(false);
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
          setPendingMessage(null);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An error occurred during edit';
        console.error('[useChat] Error in editAndRegenerate:', error);
        setError(errorMsg);
        options.onError?.(errorMsg);
      } finally {
        setIsLoading(false);
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