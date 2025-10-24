// 📄 src/components/StreamingMessage.tsx

import { memo } from 'react';

interface StreamingMessageProps {
  content: string;
}

/**
 * Легковесный компонент для отображения стримящегося текста.
 * Использует простой whitespace-pre-wrap вместо тяжёлого Markdown парсинга.
 * После завершения стриминга заменяется на полноценный ChatMessage.
 */
export const StreamingMessage = memo(({ content }: StreamingMessageProps) => {
  return (
    <div className="group relative flex flex-col w-full items-start">
      <div className="isolate rounded-lg px-4 py-2 transition-colors duration-200 w-full bg-gradient-to-r from-orange-500/5 to-red-600/5">
        <div className="prose dark:prose-invert max-w-none">
          {/* ✅ Простой текст с сохранением переносов */}
          <div className="text-sm text-gray-200 whitespace-pre-wrap">
            {content}
            {/* Мигающий курсор */}
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-orange-500 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="h-6 mt-1.5 px-2"></div>
    </div>
  );
}, (prev, next) => prev.content === next.content);

StreamingMessage.displayName = 'StreamingMessage';