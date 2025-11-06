// 📄 src/components/ChatMessage.tsx

import { useState, useEffect, useRef, memo, useMemo } from 'react';
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
import { InlineCode } from './InlineCode';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedContent(message.content);
  }, [message.content]);
  
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const ta = textareaRef.current;
      
      const setHeight = () => {
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`; 
      };
      
      setHeight();
      ta.addEventListener('input', setHeight);
      
      return () => {
        ta.removeEventListener('input', setHeight);
      };
    }
  }, [isEditing]);

  // === Умная обработка копирования ===
  useEffect(() => {
    const contentElement = messageContentRef.current;
    if (!contentElement) return;

    const handleCopyEvent = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      
      if (!contentElement.contains(range.commonAncestorContainer)) return;
      
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      
      const hasTable = container.querySelector('table');
      if (hasTable) {
        e.preventDefault();
        e.stopPropagation();
        const tableHTML = container.innerHTML;
        if (e.clipboardData) {
          e.clipboardData.setData('text/html', tableHTML);
          const plainText = extractTableAsPlainText(container);
          e.clipboardData.setData('text/plain', plainText);
        }
        return;
      }
      
      const hasFormula = container.querySelector('.katex');
      if (hasFormula) {
        e.preventDefault();
        e.stopPropagation();
        const latex = extractLatexFromKatex(container);
        if (e.clipboardData && latex) {
          e.clipboardData.setData('text/plain', latex);
        }
        return;
      }
      
      let node: Node | null = range.commonAncestorContainer;
      while (node && node !== contentElement) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.tagName.toLowerCase() === 'pre') {
            return; 
          }
        }
        node = node.parentNode;
      }
      
      e.preventDefault();
      e.stopPropagation();
      const plainText = htmlToPlainText(container);
      
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', plainText);
      } else {
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

  const [remarkPluginsList, rehypePluginsList] = useMemo(() => {
    const remarkPlugins = [
      remarkGfm,
      remarkMath
    ];

    let rehypePlugins: any[] = [];

    if (isAssistant) {
      rehypePlugins = [
        rehypeRaw,
        [rehypeSanitize, markdownSanitizeSchema],
        rehypeHighlight,
        rehypeKatex
      ];
    } else {
      rehypePlugins = [
        rehypeHighlight,
        rehypeKatex
      ];
    }

    return [remarkPlugins, rehypePlugins];
  }, [isAssistant]);


  return (
    <div 
      className={`group relative flex flex-col w-full ${isAssistant ? 'items-start' : 'items-end'}`}
      data-message-id={message.id}
    >
      {/* === ✅ ИЗМЕНЕНИЕ: Возвращаем логику классов в один контейнер === */}
      <div
        className={`isolate rounded-lg px-4 py-2 transition-colors duration-200 ${
          isAssistant
            ? 'w-full bg-gradient-to-r from-orange-500/5 to-red-600/5'
            : isEditing
              // В режиме редактирования занимает всю доступную ширину родителя (который items-end)
              ? 'w-full max-w-2xl bg-gray-600/50'
              // В обычном режиме - максимальная ширина, что позволяет ему прижиматься вправо
              : 'max-w-2xl bg-gray-700/50'
        }`}
      >
        {isEditing && !isAssistant ? (
          <div className="w-full">
            <textarea
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-0 text-sm text-white bg-transparent border-0 resize-none focus:outline-none focus:ring-0 overflow-y-auto"
              style={{ maxHeight: '400px' }} 
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        ) : (
          <div ref={messageContentRef}>
            <ReactMarkdown
              className="prose dark:prose-invert max-w-none select-text"
              remarkPlugins={remarkPluginsList}
              rehypePlugins={rehypePluginsList}
              components={{ 
                pre: CodeBlock,
                table: TableBlock,
                code: InlineCode
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-1.5 px-2 h-6 transition-opacity md:opacity-0 group-hover:opacity-100">
        {isEditing ? (
          <>
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
            {!isAssistant && (
              <button 
                data-action="start-edit"
                className="p-1.5 rounded-full text-gray-400 hover:text-white" 
                title="Edit message"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            
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
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.showRegenerateButton === nextProps.showRegenerateButton
  );
});
