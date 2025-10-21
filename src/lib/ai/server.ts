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
      
      // Объединяем системные инструкции
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

      const stream = await provider.streamChat(data.messages, config);
      
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