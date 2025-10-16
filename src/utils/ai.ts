import { createServerFn } from '@tanstack/react-start'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

export interface Message {
  id: string // Возвращаем ID
  role: 'user' | 'assistant' | 'model' 
  content: string
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant using Markdown for clear and structured responses. Please format your responses using Markdown.`

export const genAIResponse = createServerFn({ method: 'GET', response: 'raw' })
  .validator(
    (d: {
      messages: Array<Message>
      systemPrompt?: { value: string; enabled: boolean }
    }) => d,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: GEMINI_API_KEY is not defined in the server environment.');
      return new Response(JSON.stringify({ error: 'Missing API key on the server.' }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // Используем самую последнюю flash-модель
    });
    
    const history = data.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
    
    const lastMessage = history.pop();
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response(JSON.stringify({ error: 'The last message must be from the user.' }), { status: 400 });
    }
    const prompt = lastMessage.parts[0].text;

    const systemInstruction = data.systemPrompt?.enabled
      ? `${DEFAULT_SYSTEM_PROMPT}\n\n${data.systemPrompt.value}`
      : DEFAULT_SYSTEM_PROMPT;
      
    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    try {
      const chat = model.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 4096,
        },
        safetySettings,
        systemInstruction: {
          role: 'system', 
          parts: [{ text: systemInstruction }]
        }
      });
      
      const result = await chat.sendMessageStream(prompt);

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              const jsonChunk = JSON.stringify({ text: text });
              controller.enqueue(encoder.encode(jsonChunk));
            }
          }
          controller.close();
        },
      });

      return new Response(stream);
    } catch (error) {
      console.error('--- GEMINI API ERROR ---');
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return new Response(JSON.stringify({ error: `Failed to get AI response: ${errorMessage}` }), { status: 500 });
    }
  });