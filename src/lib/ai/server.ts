// 📄 src/lib/ai/server.ts

import { createServerFn } from '@tanstack/react-start';
import { AIProviderFactory } from './provider-factory';
import type { AIProviderConfig, StreamChunk, MessageContent } from './types';

export interface ChatRequest {
  messages: { role: 'user' | 'assistant' | 'system', content: MessageContent }[];
  provider: string;
  model: string;
  systemInstruction?: string;
  activePromptContent?: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
}

type StreamPayload = StreamChunk | { type: 'heartbeat' };

const AI_STREAM_INACTIVITY_TIMEOUT = 120000;

// ✅ НОВАЯ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
/**
 * Преобразует http(s) URL изображений в data URI (base64).
 * Это необходимо для API, которые не поддерживают загрузку по URL (например, Gemini OpenAI-совместимый эндпоинт).
 */
async function transformImageUrls(messages: { role: 'user' | 'assistant' | 'system', content: MessageContent }[]): Promise<{ role: 'user' | 'assistant' | 'system', content: MessageContent }[]> {
  return Promise.all(
    messages.map(async (msg) => {
      if (!Array.isArray(msg.content)) {
        return msg;
      }

      const newContent = await Promise.all(
        msg.content.map(async (part) => {
          if (part.type === 'image_url' && part.image_url?.url.startsWith('http')) {
            try {
              console.log(`[Server] Transforming image URL to base64: ${part.image_url.url.substring(0, 80)}...`);
              const response = await fetch(part.image_url.url);
              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
              }
              const contentType = response.headers.get('content-type') || 'image/jpeg';
              const arrayBuffer = await response.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString('base64');
              
              return {
                ...part,
                image_url: {
                  url: `data:${contentType};base64,${base64}`,
                },
              };
            } catch (error) {
              console.error(`[Server] Failed to transform image URL:`, error);
              // Возвращаем часть как есть, чтобы не сломать запрос, если загрузка не удалась
              return part; 
            }
          }
          return part;
        })
      );

      return { ...msg, content: newContent };
    })
  );
}


export const streamChat = createServerFn({
  method: 'POST',
  response: 'raw'
})
  .validator((data: ChatRequest) => data)
  .handler(async ({ data }) => {
    try {
      const provider = AIProviderFactory.getProvider(data.provider);

      const availableModels = provider.getAvailableModels();
      const selectedModel = availableModels.find(m => m.id === data.model);
      const maxOutputTokens = selectedModel?.maxOutputTokens || data.maxTokens || 8192;
      
      const fullSystemInstruction = [
        data.systemInstruction,
        data.activePromptContent
      ].filter(Boolean).join('\n\n');
      
      const initialMessages: { role: 'user' | 'assistant' | 'system', content: MessageContent }[] = [];
      if (fullSystemInstruction) {
        initialMessages.push({
          role: 'system',
          content: fullSystemInstruction,
        });
      }
      
      initialMessages.push(...data.messages.filter(m => m.role !== 'system'));

      // ✅ ИЗМЕНЕНИЕ: Преобразуем URL-ы в base64 перед отправкой в AI
      const finalMessages = await transformImageUrls(initialMessages);

      const config: Partial<AIProviderConfig> = {
        model: data.model,
        temperature: data.temperature,
        maxTokens: maxOutputTokens,
        reasoningEffort: data.reasoningEffort,
      };

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      const sendPayload = (payload: StreamPayload) => {
        writer.write(encoder.encode(JSON.stringify(payload) + '\n'));
      };

      const heartbeatInterval = setInterval(() => {
        sendPayload({ type: 'heartbeat' });
      }, 8000);

      let inactivityTimeout: NodeJS.Timeout | null = null;

      const resetInactivityTimeout = () => {
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
          console.error('AI stream timed out due to inactivity.');
          sendPayload({ error: 'AI response timed out. Please try again.' });
          writer.close(); 
        }, AI_STREAM_INACTIVITY_TIMEOUT);
      };

      (async () => {
        try {
          resetInactivityTimeout();
          const aiStream = await provider.streamChat(finalMessages, config);
          const reader = aiStream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            resetInactivityTimeout();
            if (done) break;
            writer.write(value);
          }
        } catch (error) {
          console.error('Error during AI stream processing:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown AI stream error';
          sendPayload({ error: errorMessage });
        } finally {
          clearInterval(heartbeatInterval);
          if (inactivityTimeout) clearTimeout(inactivityTimeout);
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
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  });