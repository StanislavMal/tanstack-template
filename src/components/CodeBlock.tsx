// 📄 src/components/CodeBlock.tsx (Новая, правильная версия)

import { useState, type ReactNode, type HTMLAttributes } from 'react';
import { Copy, Check } from 'lucide-react';

// Пропсы, которые ReactMarkdown передает в компонент для <pre>
interface CodeBlockProps extends HTMLAttributes<HTMLPreElement> {
  children?: ReactNode;
  // node?: any; // node нам не нужен
}

export const CodeBlock = ({ children, ...props }: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);
  
  // `children` для <pre> - это обычно один элемент `<code>`
  // Мы заглядываем в его props, чтобы найти className
  let language = 'text';
  let codeContent = '';

  if (children && typeof children === 'object' && 'props' in children) {
    const codeProps = (children as { props: { className?: string; children?: ReactNode } }).props;
    const langMatch = /language-(\w+)/.exec(codeProps.className || '');
    if (langMatch) {
      language = langMatch[1];
    }
    // Сам код находится внутри children тега <code>
    if (codeProps.children) {
      codeContent = String(codeProps.children).replace(/\n$/, '');
    }
  }

  const handleCopy = () => {
    if (codeContent) {
      navigator.clipboard.writeText(codeContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    // -> ИЗМЕНЕНИЕ: Внешний `div` для `sticky`, а `<pre>` внутри.
    // `my-4` - стандартный отступ для блоков <pre> в prose.
    <div className="relative my-4 bg-gray-800/50 rounded-md">
      {/* Шапка прилипает к верху этого div */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-1 border-b border-gray-700/50 bg-gray-800 rounded-t-md">
        <span className="font-sans text-xs font-semibold text-gray-400 uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className="p-1 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre {...props} className="overflow-x-auto p-4 text-sm">
        {children}
      </pre>
    </div>
  );
};