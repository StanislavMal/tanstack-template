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
  }, ref) => {
    const { t } = useTranslation();

    // ИЗМЕНЕНИЕ: Показываем pendingMessage только если есть контент
    const displayMessages = useMemo(() => {
      const combined = [...messages];
      if (pendingMessage && pendingMessage.content && !messages.some(m => m.id === pendingMessage.id)) {
        combined.push(pendingMessage);
      }
      return combined;
    }, [messages, pendingMessage]);

    // ИЗМЕНЕНИЕ: Показываем LoadingIndicator если isLoading ИЛИ есть pendingMessage без контента
    const showLoading = isLoading || (pendingMessage && !pendingMessage.content);

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
              {displayMessages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  isEditing={editingMessageId === message.id}
                  onStartEdit={() => onStartEdit(message.id)}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={(newContent) => onSaveEdit(message.id, newContent)}
                  onCopyMessage={() => onCopyMessage(message.content)}
                />
              ))}
              {showLoading && <LoadingIndicator />}
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