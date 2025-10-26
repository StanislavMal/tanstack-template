// src/components/InlineCode.tsx

import { useState, useRef, type ReactNode, type HTMLAttributes } from 'react';

interface InlineCodeProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

export const InlineCode = ({ children, ...props }: InlineCodeProps) => {
  const [title, setTitle] = useState('Click to copy');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const codeText = e.currentTarget.textContent || '';
    navigator.clipboard.writeText(codeText);
    setTitle('Copied!');

    timeoutRef.current = setTimeout(() => {
      setTitle('Click to copy');
      timeoutRef.current = null;
    }, 1500);
  };

  // ✅ ИЗМЕНЕНИЕ: Стили теперь здесь, они переопределят базовые стили из styles.css
  // Убрана иконка, добавлена смена title
  return (
    <code
      {...props}
      onClick={handleCopy}
      className="font-mono text-sm text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-md py-0.5 px-1.5 cursor-pointer transition-all hover:bg-orange-500/20 hover:text-orange-200"
      title={title}
    >
      {children}
    </code>
  );
};
