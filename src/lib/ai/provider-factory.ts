// 📄 src/lib/ai/provider-factory.ts

import { GeminiOpenAIProvider } from './providers/gemini-openai';
import { DeepSeekOpenAIProvider } from './providers/deepseek-openai';
import type { AIProvider } from './types';

export class AIProviderFactory {
  private static providers = new Map<string, AIProvider>();

  static {
    // Регистрируем доступные провайдеры
    this.registerProvider('gemini', new GeminiOpenAIProvider());
    this.registerProvider('deepseek', new DeepSeekOpenAIProvider());
  }

  static registerProvider(name: string, provider: AIProvider): void {
    this.providers.set(name, provider);
  }

  static getProvider(name: string): AIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }
    return provider;
  }

  static getAllProviders(): Map<string, AIProvider> {
    return this.providers;
  }
}