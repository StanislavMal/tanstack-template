// 📄 src/components/ChatMessage.tsx

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { Pencil, Copy, Check, X, RefreshCw } from 'lucide-react';
import type { Message } from '../lib/ai/types';
import { CodeBlock } from './CodeBlock';

interface ChatMessageProps {
  message: Message;
  isEditing: boolean;
  onSaveEdit: (id: string, newContent: string) => void;
  onCancelEdit: () => void;
  showRegenerateButton?: boolean;
  onRegenerate?: () => void;
  isLoading?: boolean;
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'class'],
    code: [...(defaultSchema.attributes?.code || []), 'className', 'class', ['data*']],
    pre: [...(defaultSchema.attributes?.pre || []), 'className', 'class'],
    ol: [...(defaultSchema.attributes?.ol || []), 'start', 'type'],
    ul: [...(defaultSchema.attributes?.ul || []), 'type'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'blockquote',
    'code', 'pre',
    'strong', 'em', 'del', 'ins',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span',
  ],
};

function extractLanguageFromCode(codeElement: HTMLElement): string {
  const className = codeElement.className || '';
  const match = className.match(/(?:language|lang)-(\w+)/);
  return match ? match[1] : '';
}

function htmlToPlainText(element: HTMLElement): string {
  let result = '';
  
  function processNode(
    node: Node, 
    depth: number = 0, 
    orderedCounters: Map<number, number> = new Map()
  ): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        result += text;
      }
      return;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();
    
    if (tagName === 'ul' || tagName === 'ol') {
      if (tagName === 'ol') {
        const start = parseInt(el.getAttribute('start') || '1');
        orderedCounters.set(depth, start);
      }
      
      Array.from(el.children).forEach((child) => {
        if (child.tagName.toLowerCase() === 'li') {
          processNode(child, depth, orderedCounters);
        }
      });
      
      if (tagName === 'ol') {
        orderedCounters.delete(depth);
      }
      
      if (depth === 0) {
        result += '\n';
      }
      return;
    }
    
    if (tagName === 'li') {
      const indent = '  '.repeat(depth);
      const parent = el.parentElement;
      const isOrdered = parent?.tagName.toLowerCase() === 'ol';
      
      if (isOrdered) {
        const counter = orderedCounters.get(depth) || 1;
        result += `${indent}${counter}. `;
        orderedCounters.set(depth, counter + 1);
      } else {
        const bullets = ['•', '◦', '▪'];
        const bullet = bullets[Math.min(depth, bullets.length - 1)];
        result += `${indent}${bullet} `;
      }
      
      let hasNestedList = false;
      
      Array.from(el.childNodes).forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childEl = child as HTMLElement;
          const childTag = childEl.tagName.toLowerCase();
          
          if (childTag === 'ul' || childTag === 'ol') {
            hasNestedList = true;
            processNode(child, depth + 1, orderedCounters);
          } else {
            processNode(child, depth, orderedCounters);
          }
        } else {
          processNode(child, depth, orderedCounters);
        }
      });
      
      if (!hasNestedList) {
        result += '\n';
      }
      return;
    }
    
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      result += '\n\n';
      return;
    }
    
    if (['p', 'div', 'blockquote'].includes(tagName)) {
      if (tagName === 'div') {
        const directChildren = Array.from(el.children);
        const preChild = directChildren.find(child => child.tagName.toLowerCase() === 'pre');
        
        if (preChild) {
          let language = '';
          
          for (const child of directChildren) {
            if (child !== preChild) {
              const text = (child.textContent || '').trim();
              if (text.length > 0 && text.length < 20 && !text.toLowerCase().includes('cop')) {
                language = text;
                break;
              }
            }
          }
          
          if (!language) {
            const codeElement = preChild.querySelector('code');
            if (codeElement) {
              language = extractLanguageFromCode(codeElement);
            }
          }
          
          const codeElement = preChild.querySelector('code');
          const codeText = codeElement ? (codeElement.textContent || '').trim() : '';
          
          result += `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
          return;
        }
      }
      
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      
      if (depth === 0) {
        result += '\n\n';
      }
      return;
    }
    
    if (tagName === 'br') {
      result += '\n';
      return;
    }
    
    if (tagName === 'pre') {
      const codeElement = el.querySelector('code');
      
      if (codeElement) {
        const language = extractLanguageFromCode(codeElement);
        const codeText = (codeElement.textContent || '').trim();
        
        result += `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
      } else {
        result += el.textContent || '';
        result += '\n\n';
      }
      return;
    }
    
    if (tagName === 'code' && el.parentElement?.tagName.toLowerCase() !== 'pre') {
      result += el.textContent || '';
      return;
    }
    
    if (tagName === 'table') {
      result += '\n';
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      result += '\n';
      return;
    }
    
    if (tagName === 'tr') {
      Array.from(el.childNodes).forEach((child, index) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          processNode(child, depth, orderedCounters);
          if (index < el.childNodes.length - 1) {
            result += ' | ';
          }
        }
      });
      result += '\n';
      return;
    }
    
    if (tagName === 'th' || tagName === 'td') {
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      return;
    }
    
    if (tagName === 'strong' || tagName === 'b' || tagName === 'em' || tagName === 'i') {
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      return;
    }
    
    if (tagName === 'a') {
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      return;
    }
    
    if (tagName === 'hr') {
      result += '\n---\n\n';
      return;
    }
    
    Array.from(el.childNodes).forEach((child) => {
      processNode(child, depth, orderedCounters);
    });
  }
  
  processNode(element);
  
  return result
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n+$/g, '\n')
    .trim();
}

export function ChatMessage({ 
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
  const [isCopied, setIsCopied] = useState(false);
  
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // ✅ ИСПРАВЛЕНО: Не перехватываем копирование из блоков кода
  useEffect(() => {
    const contentElement = messageContentRef.current;
    if (!contentElement) return;

    const handleCopyEvent = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      
      if (!contentElement.contains(range.commonAncestorContainer)) return;
      
      // ✅ КРИТИЧНО: Проверяем, выделение внутри <pre>?
      let node: Node | null = range.commonAncestorContainer;
      while (node && node !== contentElement) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.tagName.toLowerCase() === 'pre') {
            // Выделение внутри блока кода - стандартное поведение
            return; // НЕ preventDefault - копируется обычный текст
          }
        }
        node = node.parentNode;
      }
      
      // Выделение НЕ внутри <pre> - наша обработка
      e.preventDefault();
      e.stopPropagation();
      
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      
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

  const handleSave = () => {
    const contentToSave = editedContent.trim() || message.content;
    onSaveEdit(message.id, contentToSave);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    
    copyTimeoutRef.current = setTimeout(() => {
      setIsCopied(false);
      copyTimeoutRef.current = null;
    }, 2000);
  };

  return (
    <div 
      className={`group relative flex flex-col w-full ${isAssistant ? 'items-start' : 'items-end'}`}
      data-message-id={message.id}
    >
      <div
        className={`isolate rounded-lg px-4 py-2 transition-colors duration-200 ${
          isAssistant
            ? 'w-full bg-gradient-to-r from-orange-500/5 to-red-600/5'
            : isEditing
              ? 'w-full bg-gray-600/50'
              : 'max-w-2xl bg-gray-700/50'
        }`}
      >
        {isEditing && !isAssistant ? (
          <div className="w-full">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full p-0 text-sm text-white bg-transparent border-0 resize-none focus:outline-none focus:ring-0"
              style={{ minHeight: '6rem' }} 
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelEdit();
                }
              }}
            />
          </div>
        ) : (
          <div ref={messageContentRef}>
            <ReactMarkdown
              className="prose dark:prose-invert max-w-none select-text"
              rehypePlugins={[
                rehypeRaw,
                [rehypeSanitize, sanitizeSchema],
                rehypeHighlight
              ]}
              components={{ pre: CodeBlock }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-1.5 px-2 h-6 transition-opacity md:opacity-0 group-hover:opacity-100">
        {isEditing ? (
          <>
            <button onClick={handleSave} className="p-1.5 rounded-full text-green-400 bg-gray-800/50 hover:bg-gray-700" title="Save changes" data-action="save-edit">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={onCancelEdit} className="p-1.5 rounded-full text-red-400 bg-gray-800/50 hover:bg-gray-700" title="Cancel editing" data-action="cancel-edit">
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            {!isAssistant && (
              <button data-action="start-edit" className="p-1.5 rounded-full text-gray-400 hover:text-white" title="Edit message">
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
            <button onClick={handleCopy} className="p-1.5 rounded-full text-gray-400 hover:text-white" title="Copy message" data-action="copy">
              {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}