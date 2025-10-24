// 📄 src/components/StreamingMessage.tsx

import { memo } from 'react';

interface StreamingMessageProps {
  content: string;
}

// ✅ Простой компонент без тяжёлого Markdown парсинга
export const StreamingMessage = memo(({ content }: StreamingMessageProps) => {
  return (
    <div className="group relative flex flex-col w-full items-start">
      <div className="isolate rounded-lg px-4 py-2 transition-colors duration-200 w-full bg-gradient-to-r from-orange-500/5 to-red-600/5">
        {/* ✅ Простой текст - ОЧЕНЬ быстрый рендеринг */}
        <div className="text-sm text-gray-200 whitespace-pre-wrap font-mono">
          {content}
          {/* Мигающий курсор */}
          <span className="inline-block w-2 h-4 ml-1 bg-orange-500 animate-pulse" />
        </div>
      </div>
      <div className="h-6 mt-1.5 px-2"></div>
    </div>
  );
}, (prev, next) => prev.content === next.content); // Мемоизация по content

StreamingMessage.displayName = 'StreamingMessage';