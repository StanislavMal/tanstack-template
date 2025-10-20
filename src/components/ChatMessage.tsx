// 📄 src/components/ChatMessage.tsx

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { Pencil, Copy, Check, X } from 'lucide-react';
import type { Message } from '../utils/ai';
import { CodeBlock } from './CodeBlock';
// -> ИЗМЕНЕНИЕ: Импортируем новый компонент
import { StreamableCodeBlock } from './StreamableCodeBlock';
import { useAppState } from '../store';

interface ChatMessageProps {
  message: Message;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (newContent: string) => void;
  onCopyMessage: () => void;
}

export const ChatMessage = ({ 
  message,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onCopyMessage
}: ChatMessageProps) => {
  const isAssistant = message.role === 'assistant';
  const [editedContent, setEditedContent] = useState(message.content);
  const [isCopied, setIsCopied] = useState(false);

  // -> ИЗМЕНЕНИЕ: Получаем глобальное состояние isLoading
  const { isLoading } = useAppState();
  // -> ИЗМЕНЕНИЕ: Определяем, является ли это сообщение стримящимся
  const isStreamingMessage = isAssistant && isLoading && message.content.length > 0;

  const handleSave = () => {
    if (editedContent.trim() !== message.content.trim() && editedContent.trim()) {
      onSaveEdit(editedContent.trim());
    } else {
      onCancelEdit();
    }
  };

  const handleCopyMessage = () => {
    onCopyMessage();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // -> ИЗМЕНЕНИЕ: Определяем, какой компонент кода использовать
  const CodeComponent = (props: any) => {
    if (isStreamingMessage) {
      return <StreamableCodeBlock {...props} isStreaming={true} />;
    }
    return <CodeBlock {...props} />;
  };


  return (
    <div className={`group relative flex flex-col w-full ${isAssistant ? 'items-start' : 'items-end'}`}>
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
            />
          </div>
        ) : (
          <ReactMarkdown
            className="prose dark:prose-invert max-w-none"
            rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
            components={{
              // -> ИЗМЕНЕНИЕ: Используем наш условный компонент
              pre: CodeComponent,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-1.5 px-2 h-6 transition-opacity md:opacity-0 group-hover:opacity-100">
          {isEditing ? (
          <>
            <button onClick={handleSave} className="p-1.5 rounded-full text-green-400 bg-gray-800/50 hover:bg-gray-700" title="Save changes">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setEditedContent(message.content); onCancelEdit(); }} className="p-1.5 rounded-full text-red-400 bg-gray-800/50 hover:bg-gray-700" title="Cancel editing">
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            {!isAssistant && (
              <button onClick={onStartEdit} className="p-1.5 rounded-full text-gray-400 hover:text-white" title="Edit message">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={handleCopyMessage} className="p-1.5 rounded-full text-gray-400 hover:text-white" title="Copy message">
              {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
};