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

    // Подготавливаем параметры запроса согласно документации
    const requestOptions: any = {
      model: config.model || 'gemini-2.0-flash-exp',
      messages: openAIMessages,
      stream: true,
    };

    // Добавляем опциональные параметры
    if (config.temperature !== undefined) {
      requestOptions.temperature = config.temperature;
    }
    
    if (config.maxTokens !== undefined) {
      requestOptions.max_tokens = config.maxTokens;
    }

    // Настройки reasoning согласно документации
    if (config.model?.includes('2.5')) {
      const isProModel = config.model === 'gemini-2.5-pro-exp';
      
      if (isProModel) {
        // Для Pro моделей reasoning всегда включен
        requestOptions.reasoning_effort = config.reasoningEffort || 'low';
      } else if (config.reasoningEffort && config.reasoningEffort !== 'none') {
        // Для Flash моделей reasoning опционален
        requestOptions.reasoning_effort = config.reasoningEffort;
      }
    }

    try {
      console.log(`Sending request to Gemini API:`, {
        model: requestOptions.model,
        messageCount: openAIMessages.length,
        hasSystemInstruction: !!config.systemInstruction,
        reasoningEffort: requestOptions.reasoning_effort,
        temperature: requestOptions.temperature,
        maxTokens: requestOptions.max_tokens
      });

      const response = await openai.chat.completions.create(requestOptions);

      // Создаем ReadableStream для совместимости с существующим кодом
      return new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            // Используем правильный способ итерации по стриму
            if (Symbol.asyncIterator in response) {
              for await (const chunk of response as AsyncIterable<any>) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                  const streamChunk: StreamChunk = { text: content };
                  // Отправляем каждый чанк в отдельной строке
                  controller.enqueue(encoder.encode(JSON.stringify(streamChunk) + '\n'));
                }
              }
            } else {
              // Альтернативный способ для старых версий OpenAI
              const stream = response as any;
              for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                  const streamChunk: StreamChunk = { text: content };
                  controller.enqueue(encoder.encode(JSON.stringify(streamChunk) + '\n'));
                }
              }
            }
            
            const finalChunk: StreamChunk = { finished: true };
            controller.enqueue(encoder.encode(JSON.stringify(finalChunk) + '\n'));
          } catch (error) {
            console.error('Error in stream processing:', error);
            const errorChunk: StreamChunk = { 
              error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
            controller.enqueue(encoder.encode(JSON.stringify(errorChunk) + '\n'));
          } finally {
            controller.close();
          }
        },
      });
    } catch (error: any) {
      console.error('Error in GeminiOpenAIProvider:', {
        status: error.status,
        message: error.message,
        code: error.code,
        type: error.type
      });
      
      // Более информативное сообщение об ошибке
      let errorMessage = 'Gemini API Error';
      if (error.status === 400) {
        errorMessage = 'Invalid request to Gemini API. Please check your model configuration and parameters.';
      } else if (error.status === 401) {
        errorMessage = 'Invalid API key for Gemini. Please check your environment variables.';
      } else if (error.status === 403) {
        errorMessage = 'Access forbidden. Please check your API key permissions.';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.status >= 500) {
        errorMessage = 'Gemini API is currently unavailable. Please try again later.';
      }
      
      throw new Error(`${errorMessage} (Status: ${error.status})`);
    }
  }

  getAvailableModels(): AIModel[] {
    return [
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash Experimental',
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
        id: 'gemini-2.5-flash-exp',
        name: 'Gemini 2.5 Flash Experimental',
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
        id: 'gemini-2.5-pro-exp',
        name: 'Gemini 2.5 Pro Experimental',
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