// 📄 src/lib/ai/index.ts

export type { Message, AIModel, AIProvider, AIProviderConfig, StreamChunk } from './types';
export { AIProviderFactory } from './provider-factory';
export { GeminiOpenAIProvider } from './providers/gemini-openai';
export { DeepSeekOpenAIProvider } from './providers/deepseek-openai';
export { streamChat } from './server';