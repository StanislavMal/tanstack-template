// 📄 src/hooks/useChat.ts

import { useState, useRef, useCallback } from 'react';
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
    messages, 
    addMessage, 
    createNewConversation,
    editMessageAndUpdate 
  } = useConversations();

  const textQueueRef = useRef<string>('');
  const animationFrameRef = useRef<number | undefined>(undefined);
  const finalContentRef = useRef<string>('');

  // Анимация печатания текста
  const startTextAnimation = useCallback(() => {
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

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animatePrinting);
  }, []);

  const stopTextAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const processAIResponse = useCallback(
    async (userMessage: Message) => {  // Удалили неиспользуемый параметр conversationId
      if (!settings) {
        const errorMsg = "User settings not loaded.";
        setError(errorMsg);
        options.onError?.(errorMsg);
        return null;
      }

      finalContentRef.current = '';
      textQueueRef.current = '';
      
      const initialAssistantMessage: Message = { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: '' 
      };

      setPendingMessage(initialAssistantMessage);
      startTextAnimation();

      try {
        const history = messages.at(-1)?.id === userMessage.id 
          ? messages.slice(0, -1) 
          : messages;

        // Определяем провайдер на основе модели
        const provider = settings.model.startsWith('gemini') ? 'gemini' : 'gemini'; // Пока только Gemini

        const response = await streamChat({
          data: {
            messages: [...history, userMessage],
            provider,
            model: settings.model,
            systemInstruction: settings.system_instruction,
            activePromptContent: activePrompt?.content,
          },
        });

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let isFirstChunk = true;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const rawText = decoder.decode(value, { stream: true });
          
          // Обрабатываем каждый JSON объект в потоке
          rawText.split('\n').forEach((line) => {
            if (line.trim()) {
              try {
                const chunk = JSON.parse(line);
                
                if (chunk.error) {
                  throw new Error(chunk.error);
                }
                
                if (chunk.text) {
                  if (isFirstChunk) {
                    setIsLoading(false);
                    isFirstChunk = false;
                  }
                  textQueueRef.current += chunk.text;
                }
                
                if (chunk.finished) {
                  // Поток завершен
                }
              } catch (e) {
                if (e instanceof SyntaxError) {
                  console.warn("Failed to parse chunk:", line);
                } else {
                  throw e;
                }
              }
            }
          });
        }

        // Ждем завершения анимации
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (textQueueRef.current.length === 0) {
              clearInterval(checkInterval);
              resolve(null);
            }
          }, 50);
        });

        const finalMessage = { 
          ...initialAssistantMessage, 
          content: finalContentRef.current 
        };

        return finalMessage;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An error occurred';
        console.error('Error in processAIResponse:', error);
        setError(errorMsg);
        options.onError?.(errorMsg);
        return null;
      } finally {
        stopTextAnimation();
      }
    },
    [settings, activePrompt, messages, startTextAnimation, stopTextAnimation, options]
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
        
        // Создаем новую беседу если нужно
        if (!convId) {
          const title = conversationTitle || content.slice(0, 30) + '...';
          convId = await createNewConversation(title);
          if (!convId) throw new Error('Failed to create conversation');
        }

        // Добавляем сообщение пользователя
        await addMessage(convId, userMessage);
        options.onMessageSent?.(userMessage);

        // Получаем ответ AI
        const aiResponse = await processAIResponse(userMessage);
        
        if (aiResponse && aiResponse.content.trim()) {
          await addMessage(convId, aiResponse);
          options.onResponseComplete?.(aiResponse);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Error in sendMessage:', error);
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
        const updatedMessage = await editMessageAndUpdate(messageId, newContent);
        if (!updatedMessage) {
          throw new Error("Failed to update message");
        }

        options.onMessageSent?.(updatedMessage);

        const aiResponse = await processAIResponse(updatedMessage);
        
        if (aiResponse && aiResponse.content.trim()) {
          await addMessage(currentConversationId, aiResponse);
          options.onResponseComplete?.(aiResponse);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An error occurred during edit';
        console.error('Error in editAndRegenerate:', error);
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