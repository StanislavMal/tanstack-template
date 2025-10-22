// 📄 src/lib/ai/providers/gemini-openai.ts

import OpenAI from 'openai';
import type { AIProvider, Message, AIModel, AIProviderConfig, StreamChunk } from '../types';

export class GeminiOpenAIProvider implements AIProvider {
  name = 'Gemini (OpenAI Compatible)';
  
  private apiKeys: string[];
  private currentKeyIndex = 0;
  private failedKeys = new Set<number>();

  constructor() {
    this.apiKeys = Object.keys(process.env)
      .filter(key => key.startsWith('GEMINI_API_KEY_') && process.env[key])
      .map(key => process.env[key] as string);
    
    if (this.apiKeys.length === 0) {
      throw new Error('No GEMINI_API_KEY_* environment variables found');
    }
    
    console.log(`[GeminiProvider] Loaded ${this.apiKeys.length} API keys`);
  }

  private getNextApiKey(): { key: string; index: number } {
    if (this.failedKeys.size >= this.apiKeys.length) {
      console.warn('[GeminiProvider] All keys failed, resetting failed keys set');
      this.failedKeys.clear();
    }

    let attempts = 0;
    while (attempts < this.apiKeys.length) {
      const index = this.currentKeyIndex;
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      
      if (!this.failedKeys.has(index)) {
        return { key: this.apiKeys[index], index };
      }
      attempts++;
    }

    const index = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return { key: this.apiKeys[index], index };
  }

  private markKeyAsFailed(index: number) {
    this.failedKeys.add(index);
    console.warn(`[GeminiProvider] Marked key #${index + 1} as failed`);
  }

  async streamChat(messages: Message[], config: Partial<AIProviderConfig>): Promise<ReadableStream<Uint8Array>> {
    const maxRetries = Math.min(this.apiKeys.length, 3);
    let lastError: Error | null = null;

    // ИЗМЕНЕНИЕ: Валидация - фильтруем пустые сообщения
    const validMessages = messages.filter(msg => {
      const isValid = msg.content && msg.content.trim() !== '';
      if (!isValid) {
        console.warn('[GeminiProvider] Filtered out invalid message:', msg);
      }
      return isValid;
    });

    if (validMessages.length === 0) {
      console.error('[GeminiProvider] No valid messages after filtering. Original messages:', messages);
      throw new Error('No valid messages to send to AI');
    }

    console.log(`[GeminiProvider] Sending ${validMessages.length} messages (filtered from ${messages.length})`);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { key: apiKey, index: keyIndex } = this.getNextApiKey();
      
      console.log(`[GeminiProvider] Attempt ${attempt + 1}/${maxRetries} using key #${keyIndex + 1}`);

      const openai = new OpenAI({
        apiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      });

      const openAIMessages = validMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      if (config.systemInstruction) {
        openAIMessages.unshift({
          role: 'system',
          content: config.systemInstruction,
        });
      }

      // ИЗМЕНЕНИЕ: Вернули reasoning_effort
      const requestOptions: any = {
        model: config.model || 'gemini-2.5-flash',
        messages: openAIMessages,
        stream: true,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 8192,
      };

      // Добавляем reasoning_effort для моделей 2.5
      if (config.model?.includes('2.5')) {
        if (config.reasoningEffort && config.reasoningEffort !== 'none') {
          requestOptions.reasoning_effort = config.reasoningEffort;
        }
        
        if (config.model === 'gemini-2.5-pro' && (!config.reasoningEffort || config.reasoningEffort === 'none')) {
          requestOptions.reasoning_effort = 'low';
        }
      }

      try {
        console.log(`[GeminiProvider] Request:`, {
          model: requestOptions.model,
          messagesCount: openAIMessages.length,
          temperature: requestOptions.temperature,
          reasoning_effort: requestOptions.reasoning_effort,
        });
        
        const response = await openai.chat.completions.create(requestOptions);

        return new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            
            try {
              if (Symbol.asyncIterator in response) {
                for await (const chunk of response as AsyncIterable<any>) {
                  const content = chunk.choices[0]?.delta?.content;
                  if (content) {
                    const streamChunk: StreamChunk = { text: content };
                    controller.enqueue(encoder.encode(JSON.stringify(streamChunk) + '\n'));
                  }
                }
              } else {
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
              console.error('[GeminiProvider] Error in stream processing:', error);
              const errorChunk: StreamChunk = { 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
              };
              controller.enqueue(encoder.encode(JSON.stringify(errorChunk) + '\n'));
            } finally {
              controller.close();
            }
          },
        });

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        const is503Error = error instanceof Error && 
          (error.message.includes('503') || error.message.includes('Service Unavailable'));
        
        const is429Error = error instanceof Error && 
          (error.message.includes('429') || error.message.includes('Rate limit'));

        if (is503Error || is429Error) {
          console.warn(`[GeminiProvider] Key #${keyIndex + 1} failed with ${is503Error ? '503' : '429'}, trying next key...`);
          this.markKeyAsFailed(keyIndex);
          continue;
        }

        console.error('[GeminiProvider] Non-retryable error:', error);
        console.error('[GeminiProvider] Request that failed:', {
          model: requestOptions.model,
          messagesCount: openAIMessages.length,
          messages: openAIMessages,
        });
        
        throw new Error(`Gemini API Error: ${lastError.message}`);
      }
    }

    throw new Error(
      `Gemini API failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`
    );
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