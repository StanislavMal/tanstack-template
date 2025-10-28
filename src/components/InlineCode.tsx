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
      // ✅ ИСПРАВЛЕНИЕ: Добавляем маркер-класс для CSS
      className={`custom-inline-code ${
        isCopied 
          ? 'copied' 
          : ''
      }`}
      // ✅ Все стили теперь в CSS для лучшей производительности
    >
      {children}
    </code>
  );
};