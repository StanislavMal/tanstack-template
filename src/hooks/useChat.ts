// 📄 src/hooks/useChat.ts

import { useState, useRef, useCallback, useEffect } from 'react';
import { streamChat } from '../lib/ai/server';
import type { Message } from '../lib/ai/types';
import { useConversations, useSettings, usePrompts } from '../store/hooks';
import { selectors, store } from '../store/store';

interface UseChatOptions {
  onResponseStart?: () => void;
  onResponseComplete?: (message: Message) => void;
  onError?: (error: string) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ✅ ВОЗВРАЩАЕМ `pendingMessage` для поддержки "живого" форматирования
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
  const displayedTextRef = useRef<string>(''); // ✅ Будем хранить полный текст здесь
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const bufferRef = useRef<string>('');
  const activeRequestIdRef = useRef<string | null>(null);
  const isStreamActiveRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, []);

  // ✅ Анимация теперь обновляет `pendingMessage`
  const startTypingAnimation = useCallback((messageId: string) => {
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);

    const streamSpeed = settings?.streamSpeed || 30;
    const updateIntervalMs = 33;
    const charsPerTick = Math.max(1, Math.round((streamSpeed * updateIntervalMs) / 1000));

    intervalIdRef.current = setInterval(() => {
      if (textQueueRef.current.length > 0) {
        const charsToAdd = textQueueRef.current.substring(0, charsPerTick);
        textQueueRef.current = textQueueRef.current.substring(charsPerTick);
        displayedTextRef.current += charsToAdd;
        
        setPendingMessage(prev => 
          prev && prev.id === messageId 
            ? { ...prev, content: displayedTextRef.current } 
            : prev
        );

      } else if (!isStreamActiveRef.current) {
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
      }
    }, updateIntervalMs);
  }, [settings?.streamSpeed]);

  const stopTypingAnimation = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    isStreamActiveRef.current = false;
  }, []);

  const parseNDJSON = useCallback((data: string) => {
    bufferRef.current += data;
    const lines = bufferRef.current.split('\n');
    bufferRef.current = lines.pop() || '';
    
    const chunks = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        chunks.push(JSON.parse(line));
      } catch (e) {
        console.warn('[useChat] Failed to parse NDJSON line:', line);
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
      textQueueRef.current = '';
      displayedTextRef.current = ''; // ✅ Сброс
      setPendingMessage(null);
      stopTypingAnimation();
      
      const assistantMessageId = crypto.randomUUID();

      try {
        const provider = settings.model.startsWith('deepseek') ? 'deepseek' : 'gemini';
        const response = await streamChat({
          data: {
            messages: messageHistory,
            provider,
            model: settings.model,
            systemInstruction: settings.system_instruction,
            activePromptContent: activePrompt?.content,
            temperature: settings.temperature,
            reasoningEffort: settings.reasoningEffort,
          },
        });

        if (activeRequestIdRef.current !== requestId || !response.body) return null;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let animationStarted = false;

        while (true) {
          if (activeRequestIdRef.current !== requestId) {
            reader.cancel();
            return null;
          }

          const { value, done } = await reader.read();
          if (done) {
            isStreamActiveRef.current = false;
            break;
          }

          const rawText = decoder.decode(value, { stream: true });
          const chunks = parseNDJSON(rawText);
          
          for (const chunk of chunks) {
            if (chunk.error) throw new Error(chunk.error);
            if (chunk.text) {
              if (!animationStarted) {
                // ✅ Создаем `pendingMessage` при первом чанке
                setPendingMessage({ 
                  id: assistantMessageId, 
                  role: 'assistant', 
                  content: '' 
                });
                isStreamActiveRef.current = true;
                startTypingAnimation(assistantMessageId);
                setIsLoading(false);
                options.onResponseStart?.();
                animationStarted = true;
              }
              textQueueRef.current += chunk.text;
            }
          }
        }
        
        await new Promise<void>((resolve) => {
          const checkCompletion = () => {
            if (textQueueRef.current.length === 0 && !intervalIdRef.current) {
              resolve();
            } else {
              setTimeout(checkCompletion, 50);
            }
          };
          checkCompletion();
        });
        
        return { 
          id: assistantMessageId, 
          role: 'assistant' as const, 
          content: displayedTextRef.current 
        };

      } catch (error) {
        if (activeRequestIdRef.current !== requestId) return null;
        const errorMsg = error instanceof Error ? error.message : 'An error occurred';
        setError(errorMsg);
        options.onError?.(errorMsg);
        return null;
      } finally {
        stopTypingAnimation();
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
      
      const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: content.trim() };

      try {
        let convId = currentConversationId;
        if (!convId) {
          const title = conversationTitle || content.slice(0, 30) + '...';
          convId = await createNewConversation(title);
          if (!convId) throw new Error('Failed to create conversation');
        }
        
        await addMessage(convId, userMessage);
        await new Promise(resolve => setTimeout(resolve, 10));
        const currentMessages = selectors.getCurrentMessages(store.state);
        
        const aiResponse = await processAIResponse(currentMessages);
        
        if (aiResponse && aiResponse.content.trim()) {
          await addMessage(convId, aiResponse);
          options.onResponseComplete?.(aiResponse);
        }
        setPendingMessage(null); // ✅ Финальная очистка

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
        setError(errorMsg);
        options.onError?.(errorMsg);
        setPendingMessage(null);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, currentConversationId, createNewConversation, addMessage, processAIResponse, options]
  );

  const editAndRegenerate = useCallback(
    async (messageId: string, newContent: string) => {
      if (!currentConversationId || isLoading) return;

      setIsLoading(true);
      setError(null);
      setPendingMessage(null);

      try {
        const updatedHistory = await editMessageAndUpdate(messageId, newContent);
        if (!updatedHistory) throw new Error("Failed to update message");

        const aiResponse = await processAIResponse(updatedHistory);
        
        if (aiResponse && aiResponse.content.trim()) {
          await addMessage(currentConversationId, aiResponse);
          options.onResponseComplete?.(aiResponse);
        }
        setPendingMessage(null);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An error occurred during edit';
        setError(errorMsg);
        options.onError?.(errorMsg);
        setPendingMessage(null);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, currentConversationId, editMessageAndUpdate, addMessage, processAIResponse, options]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    sendMessage,
    editAndRegenerate,
    isLoading,
    error,
    clearError,
    pendingMessage, // ✅ Возвращаем `pendingMessage`
  };
}
