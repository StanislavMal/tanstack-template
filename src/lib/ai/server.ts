// 📄 src/lib/ai/server.ts

import { createServerFn } from '@tanstack/react-start';
import { AIProviderFactory } from './provider-factory';
import type { Message, AIProviderConfig } from './types';

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

export const streamChat = createServerFn({
  method: 'POST',
  response: 'raw'
})
  .validator((data: ChatRequest) => data)
  .handler(async ({ data }) => {
    try {
      const provider = AIProviderFactory.getProvider(data.provider);
      
      // ИЗМЕНЕНИЕ: Правильно формируем финальный массив сообщений
      const finalMessages = [...data.messages];
      
      const fullSystemInstruction = [
        data.systemInstruction,
        data.activePromptContent
      ].filter(Boolean).join('\n\n');

      // Если есть системная инструкция, добавляем ее как первое сообщение
      if (fullSystemInstruction) {
        finalMessages.unshift({
          id: 'system-instruction', // ID не важен, т.к. это временное сообщение
          role: 'system',
          content: fullSystemInstruction,
        });
      }

      const config: Partial<AIProviderConfig> = {
        model: data.model,
        // systemInstruction больше не нужен, т.к. он уже в `finalMessages`
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        reasoningEffort: data.reasoningEffort,
      };

      // Передаем в провайдер уже полностью готовый массив сообщений
      const stream = await provider.streamChat(finalMessages, config);
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error) {
      console.error('Error in streamChat:', error);
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
