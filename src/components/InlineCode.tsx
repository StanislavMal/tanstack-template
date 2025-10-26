// 📄 src/components/InlineCode.tsx

import { useState, useRef, useEffect, type ReactNode, type HTMLAttributes } from 'react';

interface InlineCodeProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  node?: any; // ReactMarkdown передаёт node
}

/**
 * Inline код с копированием по клику
 * Используется ТОЛЬКО для одиночных элементов кода в тексте
 * Для блоков кода (внутри <pre>) рендерит обычный <code>
 */
export const InlineCode = ({ children, node, ...props }: InlineCodeProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ✅ КРИТИЧНО: Проверяем, находится ли code внутри pre
  // Если да - рендерим обычный <code> без кастомизации
  const isInsidePre = node?.position?.start?.column !== undefined && 
                      props.className?.includes('language-');

  // Если это блок кода - рендерим обычный элемент
  if (isInsidePre || props.className?.startsWith('language-')) {
    return <code {...props}>{children}</code>;
  }

  const handleCopy = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const codeText = e.currentTarget.textContent || '';
    
    navigator.clipboard.writeText(codeText)
      .then(() => {
        setIsCopied(true);
        
        timeoutRef.current = setTimeout(() => {
          setIsCopied(false);
          timeoutRef.current = null;
        }, 1200);
      })
      .catch(err => {
        console.error('Failed to copy inline code:', err);
      });
  };

  return (
    <code
      {...props}
      onClick={handleCopy}
      className={`
        inline-flex items-center gap-1
        font-mono text-[0.85em] 
        px-1.5 py-0.5 
        rounded 
        cursor-pointer 
        select-none
        transition-all duration-200
        ${isCopied 
          ? 'bg-green-500/20 text-green-300 border border-green-400/40 shadow-sm shadow-green-500/20' 
          : 'bg-amber-500/10 text-amber-300 border border-amber-400/30 hover:bg-amber-500/20 hover:border-amber-400/50 hover:shadow-sm'
        }
      `}
    >
      {children}
    </code>
  );
};