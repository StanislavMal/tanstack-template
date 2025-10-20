// 📄 src/components/StreamableCodeBlock.tsx

import { useState, useRef, useEffect, useLayoutEffect, type ReactNode, type HTMLAttributes } from 'react';
import { createRoot } from 'react-dom/client';
import { Copy, Check } from 'lucide-react';

interface StreamableCodeBlockProps extends HTMLAttributes<HTMLPreElement> {
  children?: ReactNode;
  isStreaming: boolean;
}

export const StreamableCodeBlock = ({ children, isStreaming, ...props }: StreamableCodeBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);
  
  const rawContentRef = useRef<string>('');
  const languageRef = useRef<string>('text');
  
  const preRef = useRef<HTMLPreElement>(null);
  const hiddenRenderRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);

  // Этот эффект инициализирует "скрытый" React-корень
  useEffect(() => {
    if (hiddenRenderRef.current && !rootRef.current) {
      rootRef.current = createRoot(hiddenRenderRef.current);
    }
  }, []);

  // Этот эффект выполняет "скрытый" рендеринг и прямое обновление DOM
  useLayoutEffect(() => {
    if (!isStreaming) {
      // Если стриминг не идет, просто рендерим как обычно
      if (rootRef.current) {
        rootRef.current.render(children);
      }
      return;
    }
    
    // Во время стриминга...
    if (rootRef.current && preRef.current) {
      // 1. Рендерим Markdown в скрытый div
      rootRef.current.render(children);
      
      // 2. Получаем результат рендеринга
      const renderedHTML = hiddenRenderRef.current?.innerHTML || '';

      // 3. Напрямую вставляем HTML в видимый <pre>
      // Это предотвращает полный re-render React-компонента и "размораживает" скролл
      preRef.current.innerHTML = renderedHTML;
    }
  }, [children, isStreaming]);

  // Этот эффект извлекает язык и контент для кнопки "Копировать"
  useLayoutEffect(() => {
    let lang = 'text';
    let content = '';
    if (children && typeof children === 'object' && 'props' in children) {
      const codeProps = (children as { props: { className?: string; children?: ReactNode } }).props;
      const langMatch = /language-(\w+)/.exec(codeProps.className || '');
      if (langMatch) lang = langMatch[1];
      if (codeProps.children) content = String(codeProps.children).replace(/\n$/, '');
    }
    languageRef.current = lang;
    rawContentRef.current = content;
  }, [children]);


  const handleCopy = () => {
    if (rawContentRef.current) {
      navigator.clipboard.writeText(rawContentRef.current);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="relative my-4 bg-gray-800/50 rounded-md">
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-1 border-b border-gray-700/50 bg-gray-800 rounded-t-md">
        {/* Используем ref для языка, чтобы избежать re-render'а */}
        <span className="font-sans text-xs font-semibold text-gray-400 uppercase">{languageRef.current}</span>
        <button
          onClick={handleCopy}
          className="p-1 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      
      {/* Видимый пользователю элемент, который мы обновляем напрямую */}
      <pre
        ref={preRef}
        {...props}
        className="overflow-x-auto p-4 text-sm"
      >
        {/* На первом рендере (когда не стриминг), просто показываем children */}
        {!isStreaming && children}
      </pre>

      {/* Скрытый div для рендеринга react-markdown */}
      <div ref={hiddenRenderRef} style={{ display: 'none' }} />
    </div>
  );
};