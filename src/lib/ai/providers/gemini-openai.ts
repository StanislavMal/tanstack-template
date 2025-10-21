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

    // Подготавливаем параметры запроса
    const requestOptions: any = {
      model: config.model || 'gemini-2.5-flash',
      messages: openAIMessages,
      stream: true,
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 8192,
    };

    // Настройки размышлений для моделей 2.5
    if (config.model?.includes('2.5')) {
      const isProModel = config.model === 'gemini-2.5-pro';
      
      // Для Pro моделей reasoning всегда включен
      if (isProModel) {
        requestOptions.reasoning_effort = config.reasoningEffort || 'low';
      } else if (config.reasoningEffort && config.reasoningEffort !== 'none') {
        // Для Flash моделей reasoning опционален
        requestOptions.reasoning_effort = config.reasoningEffort;
      }
      
      // Включаем отображение мыслей через extra_body для всех моделей с reasoning
      if (requestOptions.reasoning_effort && requestOptions.reasoning_effort !== 'none') {
        requestOptions.extra_body = {
          google: {
            thinking_config: {
              include_thoughts: true
            }
          }
        };
      }
    }

    try {
      console.log(`Using Gemini model: ${requestOptions.model}, reasoning: ${requestOptions.reasoning_effort || 'none'}`);
      
      // Добавляем отладочную информацию
      console.log('Request options:', {
        model: requestOptions.model,
        reasoning_effort: requestOptions.reasoning_effort,
        has_extra_body: !!requestOptions.extra_body,
        message_count: requestOptions.messages.length
      });

      const response = await openai.chat.completions.create(requestOptions);

      // Создаем ReadableStream для совместимости с существующим кодом
      return new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          let reasoningBuffer = '';
          
          try {
            // Используем правильный способ итерации по стриму
            if (Symbol.asyncIterator in response) {
              for await (const chunk of response as AsyncIterable<any>) {
                const content = chunk.choices[0]?.delta?.content;
                
                // Обрабатываем reasoning content если есть
                if (chunk.choices[0]?.delta?.reasoning_content) {
                  reasoningBuffer += chunk.choices[0]?.delta?.reasoning_content;
                  const reasoningChunk: StreamChunk = { 
                    reasoning: chunk.choices[0]?.delta?.reasoning_content 
                  };
                  controller.enqueue(encoder.encode(JSON.stringify(reasoningChunk) + '\n'));
                }
                
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
                
                // Обрабатываем reasoning content если есть
                if (chunk.choices[0]?.delta?.reasoning_content) {
                  reasoningBuffer += chunk.choices[0]?.delta?.reasoning_content;
                  const reasoningChunk: StreamChunk = { 
                    reasoning: chunk.choices[0]?.delta?.reasoning_content 
                  };
                  controller.enqueue(encoder.encode(JSON.stringify(reasoningChunk) + '\n'));
                }
                
                if (content) {
                  const streamChunk: StreamChunk = { text: content };
                  controller.enqueue(encoder.encode(JSON.stringify(streamChunk) + '\n'));
                }
              }
            }
            
            const finalChunk: StreamChunk = { 
              finished: true,
              reasoning: reasoningBuffer || undefined
            };
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
      console.error('Error in GeminiOpenAIProvider:', error);
      
      // Добавляем более информативное сообщение об ошибке
      let errorMessage = 'Unknown Gemini API error';
      
      if (error.status === 400) {
        errorMessage = 'Bad request - check model name and parameters';
      } else if (error.status === 401) {
        errorMessage = 'Invalid API key';
      } else if (error.status === 403) {
        errorMessage = 'API key does not have access to this model';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded';
      } else if (error.status === 500) {
        errorMessage = 'Internal server error';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(`Gemini API Error: ${errorMessage} (status: ${error.status})`);
    }
  }

  getAvailableModels(): AIModel[] {
    return [
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