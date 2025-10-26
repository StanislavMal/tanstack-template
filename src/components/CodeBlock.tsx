// 📄 src/components/CodeBlock.tsx

import { useState, useRef, type ReactNode, type HTMLAttributes } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps extends HTMLAttributes<HTMLPreElement> {
  children?: ReactNode;
}

export const CodeBlock = ({ children, ...props }: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  
  let language = 'text';

  // Извлекаем язык программирования из className
  if (children && typeof children === 'object' && 'props' in children) {
    const codeProps = (children as { props: { className?: string; children?: ReactNode } }).props;
    const langMatch = /language-(\w+)/.exec(codeProps.className || '');
    if (langMatch) {
      language = langMatch[1];
    }
  }

  const handleCopy = () => {
    // Получаем текст напрямую из DOM элемента
    if (codeRef.current) {
      const codeText = codeRef.current.textContent || '';
      navigator.clipboard.writeText(codeText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    // -> ИЗМЕНЕНИЕ: Контейнер теперь имеет только отступы, основной стиль у <pre>
    <div className="relative my-4">
      {/* -> ИЗМЕНЕНИЕ: Шапка блока стилизована как заголовок таблицы */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-1.5 bg-orange-500/10 border-b border-orange-500/25 rounded-t-md">
        <span className="font-sans text-xs font-semibold text-amber-400 uppercase">
          {language}
        </span>
        <button
          onClick={handleCopy}
          // -> ИЗМЕНЕНИЕ: Кнопка теперь в оранжевой гамме
          className="p-1.5 rounded-md text-amber-400 hover:bg-orange-500/20 hover:text-amber-300 transition-colors"
          title={isCopied ? 'Copied!' : 'Copy code'}
        >
          {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      {/* -> ИЗМЕНЕНИЕ: <pre> теперь имеет фон и скруглённые углы снизу */}
      <pre {...props} className="overflow-x-auto p-4 text-sm bg-gray-900 rounded-b-md">
        <code ref={codeRef}>
          {children}
        </code>
      </pre>
    </div>
  );
};