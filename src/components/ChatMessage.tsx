// 📄 src/components/ChatMessage.tsx

import { useState, useEffect, useRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { Pencil, Copy, Check, X, RefreshCw } from 'lucide-react';

import type { Message } from '../lib/ai/types';
import { CodeBlock } from './CodeBlock';
import { TableBlock } from './TableBlock';
import { useCopyToClipboard } from '../hooks';
import { 
  htmlToPlainText, 
  extractLatexFromKatex, 
  extractTableAsPlainText 
} from '../utils/markdown';
import { markdownSanitizeSchema } from '../utils/markdown-sanitize';

interface ChatMessageProps {
  message: Message;
  isEditing: boolean;
  onSaveEdit: (id: string, newContent: string) => void;
  onCancelEdit: () => void;
  showRegenerateButton?: boolean;
  onRegenerate?: () => void;
  isLoading?: boolean;
}

/**
 * Компонент отображения одного сообщения в чате
 * Поддерживает: Markdown, таблицы (GFM), математику (LaTeX), редактирование, копирование, регенерацию
 */
export const ChatMessage = memo(function ChatMessage({ 
  message,
  isEditing,
  onSaveEdit,
  onCancelEdit,
  showRegenerateButton = false,
  onRegenerate,
  isLoading = false
}: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const [editedContent, setEditedContent] = useState(message.content);
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 });
  
  const messageContentRef = useRef<HTMLDivElement>(null);

  // Обновляем editedContent при изменении message.content
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(message.content);
    }
  }, [message.content, isEditing]);

  // === Умная обработка копирования ===
  useEffect(() => {
    const contentElement = messageContentRef.current;
    if (!contentElement) return;

    const handleCopyEvent = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      
      // Проверяем, что выделение внутри нашего контента
      if (!contentElement.contains(range.commonAncestorContainer)) return;
      
      // Создаём контейнер с выделенным содержимым
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      
      // === ПРИОРИТЕТ 1: ТАБЛИЦЫ ===
      const hasTable = container.querySelector('table');
      if (hasTable) {
        e.preventDefault();
        e.stopPropagation();
        
        // Копируем как HTML для вставки в Word/Google Docs
        const tableHTML = container.innerHTML;
        if (e.clipboardData) {
          e.clipboardData.setData('text/html', tableHTML);
          
          // И как plain text с границами для других приложений
          const plainText = extractTableAsPlainText(container);
          e.clipboardData.setData('text/plain', plainText);
        }
        return;
      }
      
      // === ПРИОРИТЕТ 2: МАТЕМАТИЧЕСКИЕ ФОРМУЛЫ ===
      const hasFormula = container.querySelector('.katex');
      if (hasFormula) {
        e.preventDefault();
        e.stopPropagation();
        
        // Копируем LaTeX код
        const latex = extractLatexFromKatex(container);
        if (e.clipboardData && latex) {
          e.clipboardData.setData('text/plain', latex);
        }
        return;
      }
      
      // === ПРИОРИТЕТ 3: БЛОКИ КОДА ===
      // Для блоков кода оставляем стандартное поведение (plain text)
      let node: Node | null = range.commonAncestorContainer;
      while (node && node !== contentElement) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.tagName.toLowerCase() === 'pre') {
            return; // Стандартное копирование
          }
        }
        node = node.parentNode;
      }
      
      // === ПРИОРИТЕТ 4: ОБЫЧНЫЙ ТЕКСТ ===
      // Конвертируем HTML в Markdown
      e.preventDefault();
      e.stopPropagation();
      
      const plainText = htmlToPlainText(container);
      
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', plainText);
      } else {
        // Fallback для старых браузеров
        try {
          navigator.clipboard.writeText(plainText);
        } catch (err) {
          console.warn('Failed to copy text:', err);
        }
      }
    };

    contentElement.addEventListener('copy', handleCopyEvent);
    
    return () => {
      contentElement.removeEventListener('copy', handleCopyEvent);
    };
  }, []);

  // === Обработчики событий ===
  const handleSave = () => {
    const contentToSave = editedContent.trim() || message.content;
    onSaveEdit(message.id, contentToSave);
  };

  const handleCopy = () => {
    copyToClipboard(message.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  return (
    <div 
      className={`group relative flex flex-col w-full ${isAssistant ? 'items-start' : 'items-end'}`}
      data-message-id={message.id}
    >
      {/* === Контейнер сообщения === */}
      <div
        className={`isolate rounded-lg px-4 py-2 transition-colors duration-200 ${
          isAssistant
            ? 'w-full bg-gradient-to-r from-orange-500/5 to-red-600/5'
            : isEditing
              ? 'w-full bg-gray-600/50'
              : 'max-w-2xl bg-gray-700/50'
        }`}
      >
        {/* === Режим редактирования === */}
        {isEditing && !isAssistant ? (
          <div className="w-full">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-0 text-sm text-white bg-transparent border-0 resize-none focus:outline-none focus:ring-0"
              style={{ minHeight: '6rem' }} 
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        ) : (
          /* === Режим просмотра === */
          <div ref={messageContentRef}>
            <ReactMarkdown
              className="prose dark:prose-invert max-w-none select-text"
              remarkPlugins={[
                remarkGfm,      // ✅ Поддержка таблиц, зачёркивания, списков задач
                remarkMath      // ✅ Поддержка математики: $inline$ и $$block$$
              ]}
              rehypePlugins={[
                rehypeRaw,
                [rehypeSanitize, markdownSanitizeSchema],
                rehypeHighlight,
                rehypeKatex     // ✅ Рендеринг LaTeX формул через KaTeX
              ]}
              components={{ 
                pre: CodeBlock,
                table: TableBlock  // ✅ Используем TableBlock для таблиц
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* === Панель действий === */}
      <div className="flex items-center justify-end gap-1.5 mt-1.5 px-2 h-6 transition-opacity md:opacity-0 group-hover:opacity-100">
        {isEditing ? (
          <>
            {/* Кнопки сохранения/отмены редактирования */}
            <button 
              onClick={handleSave} 
              className="p-1.5 rounded-full text-green-400 bg-gray-800/50 hover:bg-gray-700" 
              title="Save changes"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={onCancelEdit} 
              className="p-1.5 rounded-full text-red-400 bg-gray-800/50 hover:bg-gray-700" 
              title="Cancel editing"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            {/* Кнопка редактирования (только для пользователя) */}
            {!isAssistant && (
              <button 
                data-action="start-edit"
                className="p-1.5 rounded-full text-gray-400 hover:text-white" 
                title="Edit message"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            
            {/* Кнопка регенерации (только для ассистента) */}
            {isAssistant && showRegenerateButton && onRegenerate && (
              <button 
                onClick={onRegenerate}
                className="p-1.5 rounded-full text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                title="Regenerate response"
                disabled={isLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            {/* Кнопка копирования */}
            <button 
              onClick={handleCopy} 
              className="p-1.5 rounded-full text-gray-400 hover:text-white" 
              title="Copy message"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Оптимизация ре-рендеров: сравниваем только важные props
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.showRegenerateButton === nextProps.showRegenerateButton
  );
});