// 📄 src/components/ChatArea.tsx

import { memo as ReactMemo, useMemo, forwardRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatMessage, LoadingIndicator, WelcomeScreen } from '../components';
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
}

const ChatAreaComponent = ReactMemo(
  forwardRef<HTMLDivElement, ChatAreaProps>(
    (
      {
        messages,
        pendingMessage,
        isLoading,
        error,
        currentConversationId,
        editingMessageId,
        onStartEdit,
        onCancelEdit,
        onSaveEdit,
      },
      ref
    ) => {
      const { t } = useTranslation();

      const displayMessages = useMemo(() => {
        const combined = [...messages];
        if (pendingMessage && pendingMessage.content && !messages.some((m) => m.id === pendingMessage.id)) {
          combined.push(pendingMessage);
        }
        return combined;
      }, [messages, pendingMessage]);

      const showLoading = isLoading || (pendingMessage && !pendingMessage.content);

      const handleMessageActions = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const button = target.closest('button[data-action]');
        
        if (!button) return;

        const messageDiv = target.closest('[data-message-id]');
        const messageId = messageDiv?.getAttribute('data-message-id');
        
        if (!messageId) return;

        const action = button.getAttribute('data-action');

        if (action === 'start-edit') {
          onStartEdit(messageId);
        }
      }, [onStartEdit]);

      // Функция для регенерации ответа - находит предыдущее сообщение пользователя
      const handleRegenerate = useCallback((assistantMessageId: string) => {
        // Находим индекс сообщения ассистента
        const assistantIndex = displayMessages.findIndex(m => m.id === assistantMessageId);
        if (assistantIndex === -1) return;
        
        // Ищем предыдущее сообщение пользователя
        for (let i = assistantIndex - 1; i >= 0; i--) {
          if (displayMessages[i].role === 'user') {
            // Вызываем редактирование с тем же содержимым
            onSaveEdit(displayMessages[i].id, displayMessages[i].content);
            break;
          }
        }
      }, [displayMessages, onSaveEdit]);

      return (
        <div ref={ref} className="w-full h-full p-4" onClick={handleMessageActions}>
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
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                    showRegenerateButton={message.role === 'assistant'} // Просто проверяем что это ассистент
                    onRegenerate={() => handleRegenerate(message.id)}
                    isLoading={isLoading}
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
  ),
  (prevProps, nextProps) => {
    // Быстрые проверки
    if (
      prevProps.messages.length !== nextProps.messages.length ||
      prevProps.currentConversationId !== nextProps.currentConversationId ||
      prevProps.editingMessageId !== nextProps.editingMessageId ||
      prevProps.isLoading !== nextProps.isLoading ||
      prevProps.error !== nextProps.error
    ) {
      return false;
    }

    const prevPending = prevProps.pendingMessage;
    const nextPending = nextProps.pendingMessage;

    if (prevPending?.id !== nextPending?.id) {
      return false;
    }

    if (prevPending?.content !== nextPending?.content) {
      return false;
    }

    return true;
  }
);

ChatAreaComponent.displayName = 'ChatArea';

export const ChatArea = ChatAreaComponent;