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
  const animationFrameRef = useRef<number | undefined>(undefined);
  const finalContentRef = useRef<string>('');
  const bufferRef = useRef<string>('');
  const activeRequestIdRef = useRef<string | null>(null);
  const isStreamingActiveRef = useRef<boolean>(false);
  
  // ✅ НОВОЕ: Для контроля скорости печати
  const lastRenderTimeRef = useRef<number>(0);
  const accumulatedCharsRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      textQueueRef.current = '';
      bufferRef.current = '';
      finalContentRef.current = '';
      accumulatedCharsRef.current = '';
      activeRequestIdRef.current = null;
      isStreamingActiveRef.current = false;
    };
  }, [currentConversationId]);

  // ✅ НОВАЯ ЛОГИКА: Постоянная настраиваемая скорость печати
  const startTextAnimation = useCallback(() => {
    const streamSpeed = settings?.streamSpeed || 30; // символов/секунду
    const updateInterval = 50; // обновляем React каждые 50ms для плавности
    const charsPerUpdate = Math.max(1, Math.round((streamSpeed * updateInterval) / 1000));

    const animatePrinting = () => {
      const now = performance.now();
      const timeSinceLastRender = now - lastRenderTimeRef.current;

      // Добавляем символы из очереди в аккумулятор
      if (textQueueRef.current.length > 0) {
        const takeChars = textQueueRef.current.substring(0, charsPerUpdate);
        textQueueRef.current = textQueueRef.current.substring(charsPerUpdate);
        accumulatedCharsRef.current += takeChars;
      }

      // Обновляем React state только каждые updateInterval мс
      if (timeSinceLastRender >= updateInterval && accumulatedCharsRef.current.length > 0) {
        setPendingMessage(prev => {
          if (prev) {
            const newContent = prev.content + accumulatedCharsRef.current;
            finalContentRef.current = newContent;
            accumulatedCharsRef.current = ''; // Очищаем аккумулятор
            lastRenderTimeRef.current = now;
            return { ...prev, content: newContent };
          }
          return null;
        });
      }

      // Продолжаем анимацию если есть данные или стрим активен
      if (textQueueRef.current.length > 0 || accumulatedCharsRef.current.length > 0 || isStreamingActiveRef.current) {
        animationFrameRef.current = requestAnimationFrame(animatePrinting);
      } else {
        // Финальное обновление
        if (finalContentRef.current) {
          setPendingMessage(prev => {
            if (prev && prev.content !== finalContentRef.current) {
              return { ...prev, content: finalContentRef.current };
            }
            return prev;
          });
        }
        animationFrameRef.current = undefined;
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    lastRenderTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animatePrinting);
  }, [settings?.streamSpeed]);

  const stopTextAnimation = useCallback(() => {
    isStreamingActiveRef.current = false;
    
    setTimeout(() => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }, 100);
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
        console.warn('[useChat] Failed to parse NDJSON line:', {
          line: trimmedLine,
          error: parseError instanceof Error ? parseError.message : 'Unknown error'
        });
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

      bufferRef.current = '';
      finalContentRef.current = '';
      textQueueRef.current = '';
      accumulatedCharsRef.current = '';
      isStreamingActiveRef.current = false;
      
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
          console.log('[useChat] Request cancelled, aborting stream processing');
          return null;
        }

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let isFirstChunk = true;

        while (true) {
          if (activeRequestIdRef.current !== requestId) {
            reader.cancel();
            console.log('[useChat] Request cancelled during streaming');
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
              if (isFirstChunk) {
                setPendingMessage({ 
                  id: assistantMessageId, 
                  role: 'assistant', 
                  content: '' 
                });
                isStreamingActiveRef.current = true;
                startTextAnimation();
                setIsLoading(false);
                isFirstChunk = false;
              }
              
              // Добавляем текст в очередь
              textQueueRef.current += chunk.text;
            }
          }
        }

        if (activeRequestIdRef.current !== requestId) {
          console.log('[useChat] Request cancelled before saving');
          return null;
        }

        // Останавливаем стрим и ждём завершения анимации
        isStreamingActiveRef.current = false;

        await new Promise<void>(resolve => {
          const checkInterval = setInterval(() => {
            if (textQueueRef.current.length === 0 && 
                accumulatedCharsRef.current.length === 0 && 
                animationFrameRef.current === undefined) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 5000);
        });

        const finalMessage = { 
          id: assistantMessageId, 
          role: 'assistant' as const, 
          content: finalContentRef.current 
        };

        return finalMessage;

      } catch (error) {
        if (activeRequestIdRef.current !== requestId) {
          return null;
        }

        const errorMsg = error instanceof Error ? error.message : 'An error occurred';
        console.error('[useChat] Error in processAIResponse:', error);
        setError(errorMsg);
        options.onError?.(errorMsg);
        return null;
      } finally {
        stopTextAnimation();
        bufferRef.current = '';
      }
    },
    [settings, activePrompt, startTextAnimation, stopTextAnimation, options, parseNDJSON]
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