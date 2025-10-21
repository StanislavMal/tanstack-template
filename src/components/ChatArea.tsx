// 📄 src/components/ChatArea.tsx

import { memo, useMemo, forwardRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatMessage, LoadingIndicator, WelcomeScreen } from './';
import type { Message } from '../lib/ai/types';

interface ChatAreaProps {
  messages: Message[];
  pendingMessage: Message | null;
  isLoading: boolean;
  error: string | null;
  currentConversationId: string | null;
  editingMessageId: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, content: string) => void;
  onCopyMessage: (content: string) => void;
  reasoningContent?: string;
  isThinking?: boolean;
  model?: string;
  reasoningEffort?: string;
}

export const ChatArea = memo(forwardRef<HTMLDivElement, ChatAreaProps>(
  ({ 
    messages, 
    pendingMessage, 
    isLoading, 
    error, 
    currentConversationId,
    editingMessageId,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onCopyMessage,
    reasoningContent,
    isThinking = false,
    model = 'gemini-2.5-flash',
    reasoningEffort = 'none',
  }, ref) => {
    const { t } = useTranslation();

    const displayMessages = useMemo(() => {
      const combined = [...messages];
      if (pendingMessage && !messages.some(m => m.id === pendingMessage.id)) {
        combined.push(pendingMessage);
      }
      return combined;
    }, [messages, pendingMessage]);

    return (
      <div ref={ref} className="w-full h-full p-4">
        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 text-red-300 p-4 mb-4 rounded-r-lg" role="alert">
            <div className="flex">
              <div className="py-1">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
              </div>
              <div>
                <p className="font-bold">{t('errorOccurred')}</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {currentConversationId ? (
            <>
              {displayMessages.map((message, index) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  isEditing={editingMessageId === message.id}
                  onStartEdit={() => onStartEdit(message.id)}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={(newContent) => onSaveEdit(message.id, newContent)}
                  onCopyMessage={() => onCopyMessage(message.content)}
                  // Передаем reasoning только для последнего сообщения ассистента
                  reasoningContent={
                    message.role === 'assistant' && 
                    index === displayMessages.length - 1 && 
                    !pendingMessage
                      ? reasoningContent
                      : undefined
                  }
                  isThinking={
                    message.role === 'assistant' && 
                    index === displayMessages.length - 1 && 
                    isThinking
                  }
                  model={model}
                  reasoningEffort={reasoningEffort}
                />
              ))}
              {isLoading && <LoadingIndicator />}
            </>
          ) : (
            <WelcomeScreen />
          )}
        </div>
      </div>
    );
  }
));

ChatArea.displayName = 'ChatArea';