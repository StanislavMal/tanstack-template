// 📄 src/lib/ai/types.ts

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'gemini' | 'deepseek' | 'openai' | 'anthropic';
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsFunctions?: boolean;
  supportsVision?: boolean;
  supportsAudio?: boolean;
  reasoning?: {
    supported: boolean;
    levels?: string[];
  };
}

export interface AIProviderConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
}

export interface StreamChunk {
  text?: string;
  error?: string;
  finished?: boolean;
}

export interface AIProvider {
  name: string;
  streamChat(messages: Message[], config: Partial<AIProviderConfig>): Promise<ReadableStream<Uint8Array>>;
  getAvailableModels(): AIModel[];
}