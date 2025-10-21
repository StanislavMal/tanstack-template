// 📄 src/utils/ai.ts

import { createServerFn } from '@tanstack/react-start'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'model' 
  content: string
}

// Helper function for our debug stream
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    const lastUserMessage = data.messages.at(-1);
    const prompt = lastUserMessage?.content || '';

    // --- ШАГ 2: РЕАЛИЗАЦИЯ ОТЛАДОЧНОГО РЕЖИМА ---
    if (prompt.trim() === '__debug_long_stream') {
      console.log('>>> INITIATING DEBUG LONG STREAM <<<');
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for (let i = 0; i < 240; i++) { // Генерируем стрим в течение 120 секунд
              await sleep(1000); // Пауза 1 секунда
              const text = `[DEBUG] Chunk ${i + 1}/120. Server time: ${new Date().toISOString()}\n`;
              const jsonChunk = JSON.stringify({ text });
              controller.enqueue(encoder.encode(jsonChunk));
              console.log(`Sent debug chunk ${i + 1}`);
            }
            console.log('>>> DEBUG STREAM COMPLETED SUCCESSFULLY <<<');
          } catch (error) {
            console.error('--- DEBUG STREAM FAILED ---', error);
          } finally {
            try {
              controller.close();
            } catch (e) {
              // Ignore if already closed
            }
          }
        }
      });
      return new Response(stream);
    }
    // --- КОНЕЦ ОТЛАДОЧНОГО РЕЖИМА ---


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
          console.log('>>> GEMINI STREAM STARTED <<<');
          try {
            for await (const chunk of result.stream) {
              if (chunk.promptFeedback?.blockReason) {
                console.error('--- GEMINI RESPONSE BLOCKED ---');
                console.error('Block Reason:', chunk.promptFeedback.blockReason);
                console.error('Safety Ratings:', chunk.promptFeedback.safetyRatings);
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
            console.log('>>> GEMINI STREAM FINISHED GRACEFULLY (for-await loop ended) <<<');
          } catch (error) {
            // --- ШАГ 1: РАСШИРЕННАЯ ДИАГНОСТИКА ОШИБКИ ---
            console.error('--- ERROR DURING GEMINI STREAM PROCESSING ---');
            // Логируем всю доступную информацию об ошибке
            if (error instanceof Error) {
                console.error(`Error Type: ${error.name}`);
                console.error(`Error Message: ${error.message}`);
                console.error(`Error Stack: ${error.stack}`);
            } else {
                console.error('Caught a non-Error object:', error);
            }
          } finally {
            console.log('>>> GEMINI STREAM "finally" BLOCK REACHED <<<');
            try {
              controller.close();
            } catch (e) {
              // Игнорируем ошибку - поток уже закрыт, и это нормально.
            }
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