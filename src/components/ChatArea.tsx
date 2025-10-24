// 📄 src/components/ChatArea.tsx

import { memo as ReactMemo, useMemo, forwardRef } from 'react';
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

      const handleMessageActions = useMemo(() => (e: React.MouseEvent<HTMLDivElement>) => {
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
  // ✅ ИСПРАВЛЕНИЕ: сравниваем СОДЕРЖИМОЕ pendingMessage
  (prevProps, nextProps) => {
    // Быстрая проверка: если разные ID или длина - точно изменилось
    if (
      prevProps.messages.length !== nextProps.messages.length ||
      prevProps.currentConversationId !== nextProps.currentConversationId ||
      prevProps.editingMessageId !== nextProps.editingMessageId ||
      prevProps.isLoading !== nextProps.isLoading ||
      prevProps.error !== nextProps.error
    ) {
      return false; // Нужен ре-рендер
    }

    // ✅ КРИТИЧНО: сравниваем содержимое pendingMessage
    const prevPending = prevProps.pendingMessage;
    const nextPending = nextProps.pendingMessage;

    if (prevPending?.id !== nextPending?.id) {
      return false; // ID изменился
    }

    if (prevPending?.content !== nextPending?.content) {
      return false; // ← ВОТ ЭТО КЛЮЧЕВОЕ! Контент изменился - рендерим!
    }

    // Всё одинаково - можно пропустить ре-рендер
    return true;
  }
);

ChatAreaComponent.displayName = 'ChatArea';

export const ChatArea = ChatAreaComponent;