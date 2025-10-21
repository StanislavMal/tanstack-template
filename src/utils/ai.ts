// 📄 src/utils/ai.ts

import { createServerFn } from '@tanstack/react-start'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'model' 
  content: string
}

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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: GEMINI_API_KEY is not defined in the server environment.');
      return new Response(JSON.stringify({ error: 'Missing API key on the server.' }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
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
    const prompt = lastMessage.parts[0].text;

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
      
      const result = await chat.sendMessageStream(prompt);

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try { // ИЗМЕНЕНИЕ: Добавляем try/catch вокруг всего цикла
            for await (const chunk of result.stream) {
              // ИЗМЕНЕНИЕ: Проверка на блокировку ответа по соображениям безопасности
              if (chunk.promptFeedback?.blockReason) {
                console.error('--- GEMINI RESPONSE BLOCKED ---');
                console.error('Block Reason:', chunk.promptFeedback.blockReason);
                console.error('Safety Ratings:', chunk.promptFeedback.safetyRatings);
                const errorJson = JSON.stringify({ error: `Response was blocked due to: ${chunk.promptFeedback.blockReason}` });
                controller.enqueue(encoder.encode(errorJson));
                break; // Прерываем стрим
              }

              const text = chunk.text();
              if (text) {
                const jsonChunk = JSON.stringify({ text: text });
                controller.enqueue(encoder.encode(jsonChunk));
              }
            }
          } catch (error) { // ИЗМЕНЕНИЕ: Отлавливаем ошибку прямо во время обработки потока
            console.error('--- ERROR DURING STREAM PROCESSING ---');
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during stream processing';
            const errorJson = JSON.stringify({ error: `Stream processing failed: ${errorMessage}` });
            controller.enqueue(encoder.encode(errorJson));
          } finally {
            controller.close();
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