// 📄 src/components/ChatMessage.tsx

import { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { Pencil, Copy, Check, X } from 'lucide-react';
import type { Message } from '../lib/ai/types';
import { CodeBlock } from './CodeBlock';

interface ChatMessageProps {
  message: Message;
  isEditing: boolean;
  onSaveEdit: (id: string, newContent: string) => void;
  onCancelEdit: () => void;
}

export const ChatMessage = memo(({ 
  message,
  isEditing,
  onSaveEdit,
  onCancelEdit
}: ChatMessageProps) => {
  const isAssistant = message.role === 'assistant';
  const [editedContent, setEditedContent] = useState(message.content);
  const [isCopied, setIsCopied] = useState(false);

  const handleSave = () => {
    if (editedContent.trim() !== message.content.trim() && editedContent.trim()) {
      onSaveEdit(message.id, editedContent.trim());
    } else {
      onCancelEdit();
    }
  };

  // ИЗМЕНЕНИЕ: Убираем неиспользуемый аргумент `e`
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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
          <ReactMarkdown
            className="prose dark:prose-invert max-w-none"
            rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
            components={{ pre: CodeBlock }}
          >
            {message.content}
          </ReactMarkdown>
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
            <button onClick={handleCopy} className="p-1.5 rounded-full text-gray-400 hover:text-white" title="Copy message" data-action="copy">
              {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';