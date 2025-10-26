// 📄 src/components/TableBlock.tsx

import { useState, useRef, useEffect, type ReactNode, type HTMLAttributes } from 'react';
import { Copy, Check } from 'lucide-react';

interface TableBlockProps extends HTMLAttributes<HTMLTableElement> {
  children?: ReactNode;
}

/**
 * Обертка для таблиц с кнопкой копирования и горизонтальной прокруткой
 */
export const TableBlock = ({ children, ...props }: TableBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyTable = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[TableBlock] Copy button clicked');
    
    if (!containerRef.current) {
      console.error('[TableBlock] containerRef is null');
      return;
    }

    const table = containerRef.current.querySelector('table');
    if (!table) {
      console.error('[TableBlock] No table found');
      return;
    }

    console.log('[TableBlock] Table found, starting copy process');

    // Создаем временный элемент для копирования
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.contentEditable = 'true';
    
    // Клонируем таблицу
    const clonedTable = table.cloneNode(true) as HTMLTableElement;
    
    // Применяем inline стили для Word
    clonedTable.style.borderCollapse = 'collapse';
    clonedTable.style.width = 'auto';
    clonedTable.style.fontFamily = 'Arial, sans-serif';
    clonedTable.style.fontSize = '11pt';
    clonedTable.style.border = '1px solid #000000';
    
    // Стилизуем все ячейки
    const allCells = clonedTable.querySelectorAll('th, td');
    allCells.forEach(cell => {
      const htmlCell = cell as HTMLElement;
      htmlCell.style.border = '1px solid #000000';
      htmlCell.style.padding = '6px 8px';
      htmlCell.style.textAlign = cell.getAttribute('align') || 'left';
      htmlCell.style.verticalAlign = 'middle';
    });
    
    // Стилизуем заголовки
    const headers = clonedTable.querySelectorAll('th');
    headers.forEach(header => {
      const htmlHeader = header as HTMLElement;
      htmlHeader.style.backgroundColor = '#f0f0f0';
      htmlHeader.style.fontWeight = 'bold';
    });

    // Чередующиеся строки
    const rows = clonedTable.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
      if (index % 2 === 1) {
        (row as HTMLElement).style.backgroundColor = '#fafafa';
      }
    });

    tempDiv.appendChild(clonedTable);
    document.body.appendChild(tempDiv);

    try {
      // Выделяем содержимое
      const range = document.createRange();
      range.selectNodeContents(tempDiv);
      
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        
        console.log('[TableBlock] Content selected, attempting copy...');
        
        // Пытаемся скопировать
        let success = false;
        
        try {
          success = document.execCommand('copy');
          console.log('[TableBlock] execCommand result:', success);
        } catch (err) {
          console.error('[TableBlock] execCommand failed:', err);
        }
        
        // Очищаем выделение
        selection.removeAllRanges();
        
        if (success) {
          console.log('[TableBlock] Copy successful!');
          setIsCopied(true);
          
          if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
          }
          
          copyTimeoutRef.current = setTimeout(() => {
            setIsCopied(false);
            console.log('[TableBlock] Copy indicator reset');
          }, 2000);
        } else {
          console.warn('[TableBlock] execCommand returned false, trying Clipboard API');
          
          // Fallback на Clipboard API
          const htmlContent = tempDiv.innerHTML;
          
          // Пробуем современный API
          if (navigator.clipboard && navigator.clipboard.write) {
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({ 'text/html': blob });
            
            navigator.clipboard.write([clipboardItem])
              .then(() => {
                console.log('[TableBlock] Clipboard API success');
                setIsCopied(true);
                
                if (copyTimeoutRef.current) {
                  clearTimeout(copyTimeoutRef.current);
                }
                
                copyTimeoutRef.current = setTimeout(() => {
                  setIsCopied(false);
                }, 2000);
              })
              .catch(err => {
                console.error('[TableBlock] Clipboard API failed:', err);
                
                // Последний fallback - копируем как plain text
                const plainText = Array.from(table.querySelectorAll('tr'))
                  .map(row => {
                    return Array.from(row.querySelectorAll('th, td'))
                      .map(cell => (cell.textContent || '').trim())
                      .join('\t');
                  })
                  .join('\n');
                
                navigator.clipboard.writeText(plainText)
                  .then(() => {
                    console.log('[TableBlock] Plain text fallback success');
                    setIsCopied(true);
                    
                    if (copyTimeoutRef.current) {
                      clearTimeout(copyTimeoutRef.current);
                    }
                    
                    copyTimeoutRef.current = setTimeout(() => {
                      setIsCopied(false);
                    }, 2000);
                  })
                  .catch(err => console.error('[TableBlock] All methods failed:', err));
              });
          } else {
            console.error('[TableBlock] Clipboard API not supported');
          }
        }
      }
    } catch (error) {
      console.error('[TableBlock] Error during copy:', error);
    } finally {
      // Удаляем временный элемент
      document.body.removeChild(tempDiv);
    }
  };

  return (
    <div 
      className="relative my-4 inline-block max-w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Иконка копирования */}
      <button
        onClick={handleCopyTable}
        className={`absolute -top-3 -right-3 z-10 p-1.5 rounded-full transition-all duration-200 ${
          isHovered || isCopied
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-75 pointer-events-none'
        } ${
          isCopied 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-gray-800/90 text-gray-400 hover:text-orange-400 hover:bg-gray-700/90'
        }`}
        title={isCopied ? 'Copied!' : 'Copy table to clipboard'}
        type="button"
      >
        {isCopied ? (
          <Check className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>

      {/* Контейнер с горизонтальной прокруткой */}
      <div 
        ref={containerRef}
        className="overflow-x-auto rounded-lg border border-orange-500/20 bg-gray-800/30"
      >
        {/* ✅ Рендерим <table> элемент напрямую */}
        <table {...props}>
          {children}
        </table>
      </div>
    </div>
  );
};