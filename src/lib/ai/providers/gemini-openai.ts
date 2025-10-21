// 📄 src/lib/ai/providers/gemini-openai.ts

import OpenAI from 'openai';
import type { AIProvider, Message, AIModel, AIProviderConfig, StreamChunk } from '../types';

export class GeminiOpenAIProvider implements AIProvider {
  name = 'Gemini (OpenAI Compatible)';
  
  private apiKeys: string[];
  private currentKeyIndex = 0;

  constructor() {
    // Собираем все доступные ключи
    this.apiKeys = Object.keys(process.env)
      .filter(key => key.startsWith('GEMINI_API_KEY_') && process.env[key])
      .map(key => process.env[key] as string);
    
    if (this.apiKeys.length === 0) {
      throw new Error('No GEMINI_API_KEY_* environment variables found');
    }
  }

  private getNextApiKey(): string {
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  async streamChat(messages: Message[], config: Partial<AIProviderConfig>): Promise<ReadableStream<Uint8Array>> {
    const apiKey = this.getNextApiKey();
    
    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });

    // Преобразуем сообщения в формат OpenAI
    const openAIMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Добавляем системную инструкцию если есть
    if (config.systemInstruction) {
      openAIMessages.unshift({
        role: 'system',
        content: config.systemInstruction,
      });
    }

    try {
      const stream = await openai.chat.completions.create({
        model: config.model || 'gemini-2.0-flash',
        messages: openAIMessages,
        stream: true,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        // Gemini-специфичные параметры
        ...(config.reasoningEffort && config.reasoningEffort !== 'none' && {
          reasoning_effort: config.reasoningEffort,
        }),
      });

      // Создаем ReadableStream для совместимости с существующим кодом
      return new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                const streamChunk: StreamChunk = { text: content };
                controller.enqueue(encoder.encode(JSON.stringify(streamChunk)));
              }
            }
            
            const finalChunk: StreamChunk = { finished: true };
            controller.enqueue(encoder.encode(JSON.stringify(finalChunk)));
          } catch (error) {
            const errorChunk: StreamChunk = { 
              error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
            controller.enqueue(encoder.encode(JSON.stringify(errorChunk)));
          } finally {
            controller.close();
          }
        },
      });
    } catch (error) {
      console.error('Error in GeminiOpenAIProvider:', error);
      throw error;
    }
  }

  getAvailableModels(): AIModel[] {
    return [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'gemini',
        description: 'Fast and cost-effective model for most tasks',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        supportsFunctions: true,
        supportsVision: true,
        supportsAudio: true,
        reasoning: {
          supported: false,
        },
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'gemini',
        description: 'Latest Flash model with reasoning capabilities',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        supportsFunctions: true,
        supportsVision: true,
        supportsAudio: true,
        reasoning: {
          supported: true,
          levels: ['low', 'medium', 'high'],
        },
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'gemini',
        description: 'Most capable model with advanced reasoning',
        contextWindow: 2000000,
        maxOutputTokens: 8192,
        supportsFunctions: true,
        supportsVision: true,
        supportsAudio: true,
        reasoning: {
          supported: true,
          levels: ['low', 'medium', 'high'],
        },
      },
    ];
  }
}