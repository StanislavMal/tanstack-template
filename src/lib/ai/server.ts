// 📄 src/lib/ai/server.ts

import { createServerFn } from '@tanstack/react-start';
import { AIProviderFactory } from './provider-factory';
import type { Message, AIProviderConfig, StreamChunk } from './types';

export interface ChatRequest {
  messages: Message[];
  provider: string;
  model: string;
  systemInstruction?: string;
  activePromptContent?: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
}

type StreamPayload = StreamChunk | { type: 'heartbeat' };

// ✅ ИЗМЕНЕНИЕ: Добавляем константу для таймаута неактивности AI
const AI_STREAM_INACTIVITY_TIMEOUT = 40000; // 40 секунд

export const streamChat = createServerFn({
  method: 'POST',
  response: 'raw'
})
  .validator((data: ChatRequest) => data)
  .handler(async ({ data }) => {
    try {
      const provider = AIProviderFactory.getProvider(data.provider);
      
      const fullSystemInstruction = [
        data.systemInstruction,
        data.activePromptContent
      ].filter(Boolean).join('\n\n');

      const config: Partial<AIProviderConfig> = {
        model: data.model,
        systemInstruction: fullSystemInstruction,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        reasoningEffort: data.reasoningEffort,
      };

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      const sendPayload = (payload: StreamPayload) => {
        writer.write(encoder.encode(JSON.stringify(payload) + '\n'));
      };

      // Таймер 1: Heartbeat для поддержания соединения с Netlify
      const heartbeatInterval = setInterval(() => {
        sendPayload({ type: 'heartbeat' });
      }, 8000);

      // ✅ ИЗМЕНЕНИЕ: Таймер 2: Watchdog для отслеживания неактивности AI
      let inactivityTimeout: NodeJS.Timeout | null = null;

      const resetInactivityTimeout = () => {
        if (inactivityTimeout) {
          clearTimeout(inactivityTimeout);
        }
        inactivityTimeout = setTimeout(() => {
          console.error('AI stream timed out due to inactivity.');
          sendPayload({ error: 'AI response timed out. Please try again.' });
          // Принудительно завершаем, что вызовет блок finally
          writer.close(); 
        }, AI_STREAM_INACTIVITY_TIMEOUT);
      };

      // Асинхронно запускаем стриминг от AI
      (async () => {
        try {
          // Запускаем таймер неактивности перед первым запросом к AI
          resetInactivityTimeout();
          
          const aiStream = await provider.streamChat(data.messages, config);
          const reader = aiStream.getReader();

          while (true) {
            const { done, value } = await reader.read();
            
            // Сбрасываем таймер неактивности каждый раз, когда получаем данные
            resetInactivityTimeout();

            if (done) {
              break;
            }
            
            writer.write(value);
          }
        } catch (error) {
          console.error('Error during AI stream processing:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown AI stream error';
          sendPayload({ error: errorMessage });
        } finally {
          // Гарантированная очистка всех таймеров и закрытие потока
          clearInterval(heartbeatInterval);
          if (inactivityTimeout) {
            clearTimeout(inactivityTimeout);
          }
          writer.close();
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } catch (error) {
      console.error('Error in streamChat setup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return new Response(
        JSON.stringify({ error: `Failed to stream chat: ${errorMessage}` }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  });
