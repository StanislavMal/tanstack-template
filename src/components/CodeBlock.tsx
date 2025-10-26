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
    <div className="relative my-4 bg-gray-800/50 rounded-md">
      {/* 
        ✅ ИЗМЕНЕНИЯ ЗДЕСЬ: БОЛЬШЕ ОРАНЖЕВОГО, НЕТ ГРАНИЦЫ
        - bg-orange-400/[.15]: Непрозрачность увеличена с 10% до 15% для чуть более заметного оранжевого оттенка.
        - Удалены классы `border-b` и `border-orange-500/25` для устранения нижней линии.
      */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 rounded-t-md bg-orange-400/[.15] backdrop-blur">
        <span className="font-sans text-sm font-semibold uppercase text-amber-400">{language}</span>
        <button
          onClick={handleCopy}
          className="p-1 rounded-md text-amber-400 transition-colors hover:bg-gray-700 hover:text-amber-300"
          title={isCopied ? 'Copied!' : 'Copy code'}
        >
          {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre {...props} className="overflow-x-auto p-4 text-sm">
        <code ref={codeRef}>
          {children}
        </code>
      </pre>
    </div>
  );
};