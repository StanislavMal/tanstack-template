// 📄 src/hooks/useChat.ts

import { useState, useRef, useCallback, useEffect } from 'react';
import { streamChat } from '../lib/ai/server';
import type { Message } from '../lib/ai/types';
import { useConversations, useSettings, usePrompts } from '../store/hooks';
import { selectors, store } from '../store/store';

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
  const isStreamActiveRef = useRef<boolean>(false);
  const isProcessingQueueRef = useRef<boolean>(false);

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
      isProcessingQueueRef.current = false;
    };
  }, [currentConversationId]);

  const startTypingAnimation = useCallback((messageId: string) => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    const streamSpeed = settings?.streamSpeed || 30;
    
    let updateIntervalMs: number;
    if (streamSpeed <= 30) {
      updateIntervalMs = 33;
    } else if (streamSpeed <= 60) {
      updateIntervalMs = 50;
    } else if (streamSpeed <= 100) {
      updateIntervalMs = 75;
    } else {
      updateIntervalMs = 100;
    }
    
    const charsPerTick = Math.max(1, Math.round((streamSpeed * updateIntervalMs) / 1000));

    console.log(`[Animation] Started: ${streamSpeed} chars/sec`);
    
    isProcessingQueueRef.current = true;
    
    intervalIdRef.current = setInterval(() => {
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
      }
      
      if (textQueueRef.current.length === 0) {
        isProcessingQueueRef.current = false;
        
        if (!isStreamActiveRef.current) {
          console.log('[Animation] Completed');
          if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
          }
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
    isProcessingQueueRef.current = false;
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

      bufferRef.current = '';
      textQueueRef.current = '';
      displayedTextRef.current = '';
      isStreamActiveRef.current = false;
      isProcessingQueueRef.current = false;
      
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      
      const assistantMessageId = crypto.randomUUID();

      try {
        const provider = settings.model.startsWith('deepseek') ? 'deepseek' : 'gemini';

        console.log(`[AI] Starting stream with ${provider}/${settings.model}`);
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
              if (!animationStarted) {
                console.log('[AI] Stream started, processing response...');
                
                setPendingMessage({ 
                  id: assistantMessageId, 
                  role: 'assistant', 
                  content: '' 
                });
                
                isStreamActiveRef.current = true;
                startTypingAnimation(assistantMessageId);
                setIsLoading(false);
                animationStarted = true;
              }
              
              textQueueRef.current += chunk.text;
            }
          }
        }

        console.log(`[AI] Stream completed, ${textQueueRef.current.length} chars to process`);
        
        isStreamActiveRef.current = false;

        await new Promise<void>((resolve) => {
          const checkCompletion = () => {
            const queueEmpty = textQueueRef.current.length === 0;
            const notProcessing = !isProcessingQueueRef.current;
            
            if (queueEmpty && notProcessing) {
              console.log(`[AI] Response ready: ${displayedTextRef.current.length} chars`);
              resolve();
            } else {
              setTimeout(checkCompletion, 50);
            }
          };
          
          checkCompletion();
        });

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
        console.error('[AI] Error:', error);
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
          console.log('[Chat] Creating new conversation:', title);
          convId = await createNewConversation(title);
          if (!convId) throw new Error('Failed to create conversation');
        }

        await addMessage(convId, userMessage);
        options.onMessageSent?.(userMessage);

        await new Promise(resolve => setTimeout(resolve, 50));

        const currentMessages = selectors.getCurrentMessages(store.state);
        
        console.log(`[Chat] Processing ${currentMessages.length} messages`);

        if (currentMessages.length === 0) {
          throw new Error('No messages found in store! This should not happen.');
        }

        const aiResponse = await processAIResponse(currentMessages);
        
        if (aiResponse && aiResponse.content.trim()) {
          console.log('[Chat] Saving AI response...');
          await addMessage(convId, aiResponse);
          console.log('[Chat] AI response saved');
          options.onResponseComplete?.(aiResponse);
          setPendingMessage(null);
        } else {
          console.warn('[Chat] AI response empty, skipping save');
          setPendingMessage(null);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('[Chat] Error:', error);
        setError(errorMsg);
        options.onError?.(errorMsg);
        setPendingMessage(null);
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
          console.log('[Chat] Saving regenerated response...');
          await addMessage(currentConversationId, aiResponse);
          options.onResponseComplete?.(aiResponse);
          setPendingMessage(null);
        } else {
          setPendingMessage(null);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An error occurred during edit';
        console.error('[Chat] Error:', error);
        setError(errorMsg);
        options.onError?.(errorMsg);
        setPendingMessage(null);
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