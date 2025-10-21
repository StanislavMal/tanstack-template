// 📄 src/hooks/useChat.ts

import { useState, useRef, useCallback } from 'react';
import { streamChat } from '../lib/ai/server';
import type { Message } from '../lib/ai/types';
import { useConversations, useSettings, usePrompts } from '../store/hooks';

interface UseChatOptions {
  onMessageSent?: (message: Message) => void;
  onResponseComplete?: (message: Message) => void;
  onError?: (error: string) => void;
  onReasoningUpdate?: (reasoning: string) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null);
  const [reasoningContent, setReasoningContent] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  
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
  const reasoningQueueRef = useRef<string>('');
  const animationFrameRef = useRef<number | undefined>(undefined);
  const reasoningAnimationFrameRef = useRef<number | undefined>(undefined);
  const finalContentRef = useRef<string>('');
  const bufferRef = useRef<string>('');

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

  // Анимация отображения reasoning
  const startReasoningAnimation = useCallback(() => {
    const animateReasoning = () => {
      if (reasoningQueueRef.current.length > 0) {
        const speed = 1; // Медленнее для reasoning
        const charsToPrint = reasoningQueueRef.current.substring(0, speed);
        reasoningQueueRef.current = reasoningQueueRef.current.substring(speed);

        setReasoningContent(current => {
          const newContent = current + charsToPrint;
          options.onReasoningUpdate?.(newContent);
          return newContent;
        });
      }
      reasoningAnimationFrameRef.current = requestAnimationFrame(animateReasoning);
    };

    if (reasoningAnimationFrameRef.current) {
      cancelAnimationFrame(reasoningAnimationFrameRef.current);
    }
    reasoningAnimationFrameRef.current = requestAnimationFrame(animateReasoning);
  }, [options]);

  const stopTextAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const stopReasoningAnimation = useCallback(() => {
    if (reasoningAnimationFrameRef.current) {
      cancelAnimationFrame(reasoningAnimationFrameRef.current);
    }
  }, []);

  // Функция для парсинга потоковых данных
  const parseStreamData = useCallback((data: string) => {
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
      } catch (e) {
        const jsonMatches = trimmedLine.match(/\{.*?\}(?=\{|$)/g);
        if (jsonMatches) {
          for (const match of jsonMatches) {
            try {
              const chunk = JSON.parse(match);
              chunks.push(chunk);
            } catch (parseError) {
              console.warn('Failed to parse JSON chunk:', match, parseError);
            }
          }
        } else {
          console.warn('Failed to parse line as JSON:', trimmedLine);
        }
      }
    }
    
    return chunks;
  }, []);

  const processAIResponse = useCallback(
    async (userMessage: Message) => {
      if (!settings) {
        const errorMsg = "User settings not loaded.";
        setError(errorMsg);
        options.onError?.(errorMsg);
        return null;
      }

      // Сбрасываем состояние
      bufferRef.current = '';
      finalContentRef.current = '';
      textQueueRef.current = '';
      reasoningQueueRef.current = '';
      setReasoningContent('');
      setIsThinking(false);
      
      const initialAssistantMessage: Message = { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: '' 
      };

      setPendingMessage(initialAssistantMessage);
      startTextAnimation();

      // Запускаем reasoning анимацию если включено
      const shouldShowReasoning = settings.model.includes('2.5') && 
        (settings.model === 'gemini-2.5-pro' || settings.reasoningEffort !== 'none');
      
      if (shouldShowReasoning) {
        setIsThinking(true);
        startReasoningAnimation();
      }

      try {
        const history = messages.at(-1)?.id === userMessage.id 
          ? messages.slice(0, -1) 
          : messages;

        const provider = settings.model.startsWith('gemini') ? 'gemini' : 'gemini';

        const response = await streamChat({
          data: {
            messages: [...history, userMessage],
            provider,
            model: settings.model,
            systemInstruction: settings.system_instruction,
            activePromptContent: activePrompt?.content,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            reasoningEffort: settings.reasoningEffort,
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
          const chunks = parseStreamData(rawText);
          
          for (const chunk of chunks) {
            if (chunk.error) {
              throw new Error(chunk.error);
            }
            
            // Обрабатываем reasoning
            if (chunk.reasoning) {
              reasoningQueueRef.current += chunk.reasoning;
            }
            
            if (chunk.text) {
              if (isFirstChunk) {
                setIsLoading(false);
                isFirstChunk = false;
              }
              textQueueRef.current += chunk.text;
            }
            
            if (chunk.finished) {
              setIsThinking(false);
            }
          }
        }

        // Ждем завершения анимаций
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (textQueueRef.current.length === 0 && reasoningQueueRef.current.length === 0) {
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
        stopReasoningAnimation();
        setIsThinking(false);
        bufferRef.current = '';
      }
    },
    [settings, activePrompt, messages, startTextAnimation, stopTextAnimation, startReasoningAnimation, stopReasoningAnimation, options, parseStreamData]
  );

  const sendMessage = useCallback(
    async (content: string, conversationTitle?: string) => {
      if (!content.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);
      setPendingMessage(null);
      setReasoningContent('');
      
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
      setReasoningContent('');

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
    reasoningContent,
    isThinking,
  };
}