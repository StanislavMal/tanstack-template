// 📄 src/components/ChatMessage.tsx

import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import type { Message } from '../utils/ai'

export const ChatMessage = ({ message }: { message: Message }) => {
  const isAssistant = message.role === 'assistant';

  return (
    // -> ИЗМЕНЕНИЕ: Внешний div-обертка для выравнивания пузыря влево или вправо
    <div className={`flex w-full ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      
      {/* -> ИЗМЕНЕНИЕ: Сам "пузырь" сообщения */}
      <div
        className={`rounded-lg px-4 py-2 ${
          // -> ИЗМЕНЕНИЕ: Правильные цвета и ширина
          isAssistant
            ? 'bg-gradient-to-r from-orange-500/5 to-red-600/5' // AI: Оригинальный градиент, вся доступная ширина
            : 'bg-gray-700/50 max-w-2xl'                          // User: Серый, ограниченная ширина
        }`}
        // -> ИЗМЕНЕНИЕ: Добавляем overflow: 'hidden', чтобы скругленные углы обрезали внутренний контент, например, таблицы
        style={{ overflow: 'hidden' }}
      >
        <ReactMarkdown
          className="prose dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-pre:bg-gray-800/50 prose-pre:overflow-x-auto prose-pre:p-4 prose-pre:rounded-md"
          rehypePlugins={[
            rehypeRaw,
            rehypeSanitize,
            rehypeHighlight,
          ]}
        >
          {message.content}
        </ReactMarkdown>
      </div>

    </div>
  );
};