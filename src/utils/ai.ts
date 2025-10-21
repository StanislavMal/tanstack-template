// 📄 src/utils/ai.ts

import { createServerFn } from '@tanstack/react-start'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'model' 
  content: string
}

// Функция для создания промиса с тайм-аутом
const createTimeout = (ms: number, message: string) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });
};

export const genAIResponse = createServerFn({
  method: 'POST',
  response: 'raw'
})
  .validator(
    (d: {
      messages: Array<Message>
      model: string 
      mainSystemInstruction: string
      activePromptContent?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    
    // --- ИЗМЕНЕНИЕ: ЛОГИКА РОТАЦИИ API-КЛЮЧЕЙ ---
    // 1. Собираем все определенные ключи Gemini из переменных окружения.
    const apiKeys = Object.keys(process.env)
      .filter(key => key.startsWith('GEMINI_API_KEY_') && process.env[key])
      .map(key => process.env[key] as string);

    // 2. Проверяем, найден ли хотя бы один ключ.
    if (apiKeys.length === 0) {
      console.error('CRITICAL ERROR: No GEMINI_API_KEY_... variables found in the server environment.');
      return new Response(JSON.stringify({ error: 'Server is missing API key configuration.' }), { status: 500 });
    }

    // 3. Выбираем случайный ключ из пула.
    const selectedKeyIndex = Math.floor(Math.random() * apiKeys.length);
    const selectedApiKey = apiKeys[selectedKeyIndex];
    console.log(`Using Gemini API Key at index ${selectedKeyIndex}. Total keys found: ${apiKeys.length}`);
    // --- КОНЕЦ ЛОГИКИ РОТАЦИИ ---


    const genAI = new GoogleGenerativeAI(selectedApiKey); // Используем выбранный ключ
    const model = genAI.getGenerativeModel({ 
      model: data.model || "gemini-1.5-flash",
    });
    
    const history = data.messages.map((msg: Message) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
    
    const lastMessage = history.pop();
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response(JSON.stringify({ error: 'The last message must be from the user.' }), { status: 400 });
    }
    const finalPrompt = lastMessage.parts[0].text;

    const finalSystemInstruction = [
      data.mainSystemInstruction,
      data.activePromptContent
    ].filter(Boolean).join('\n\n');
      
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
          maxOutputTokens: 8192,
        },
        safetySettings,
        systemInstruction: {
          role: 'system', 
          parts: [{ text: finalSystemInstruction }]
        }
      });
      
      const result = await chat.sendMessageStream(finalPrompt);

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const iterator = result.stream[Symbol.asyncIterator]();
          console.log('>>> GEMINI STREAM STARTED (with timeout) <<<');
          
          try {
            while (true) {
              // Ждем 20 секунд. Если за это время от Gemini ничего не пришло, считаем, что соединение "умерло".
              const { value, done } = await Promise.race([
                iterator.next(),
                createTimeout(20000, 'Gemini API timed out. No data received for 20 seconds.'),
              ]) as IteratorResult<any, any>;

              if (done) {
                console.log('>>> GEMINI STREAM FINISHED GRACEFULLY (iterator.done is true) <<<');
                break;
              }

              const chunk = value;

              if (chunk.promptFeedback?.blockReason) {
                console.error('--- GEMINI RESPONSE BLOCKED ---');
                console.error('Block Reason:', chunk.promptFeedback.blockReason);
                const errorJson = JSON.stringify({ error: `Response was blocked due to: ${chunk.promptFeedback.blockReason}` });
                controller.enqueue(encoder.encode(errorJson));
                break; 
              }

              const text = chunk.text();
              if (text) {
                const jsonChunk = JSON.stringify({ text: text });
                controller.enqueue(encoder.encode(jsonChunk));
              }
            }
          } catch (error) {
            console.error('--- ERROR DURING GEMINI STREAM PROCESSING (or TIMEOUT) ---');
             if (error instanceof Error) {
                console.error(`Error Type: ${error.name}`);
                console.error(`Error Message: ${error.message}`);
                // Отправляем ошибку тайм-аута на клиент
                const errorJson = JSON.stringify({ error: `AI response failed: ${error.message}` });
                controller.enqueue(encoder.encode(errorJson));
            } else {
                console.error('Caught a non-Error object:', error);
            }
          } finally {
            console.log('>>> GEMINI STREAM "finally" BLOCK REACHED <<<');
            try { controller.close(); } catch (e) { /* ignore */ }
          }
        },
      });

      return new Response(stream);
    } catch (error) {
      console.error('--- GEMINI API ERROR (sendMessageStream call) ---');
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return new Response(JSON.stringify({ error: `Failed to get AI response: ${errorMessage}` }), { status: 500 });
    }
  });