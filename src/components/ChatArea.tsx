// 📄 src/components/ChatArea.tsx

import { memo as ReactMemo, useMemo, forwardRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatMessage, LoadingIndicator, WelcomeScreen } from '../components';
import { StreamingMessage } from './StreamingMessage';
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

      // ✅ Мемоизируем сохранённые сообщения
      const savedMessages = useMemo(() => messages, [messages]);

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
                {/* ✅ Сохранённые сообщения - мемоизированы строго */}
                {savedMessages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isEditing={editingMessageId === message.id}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                  />
                ))}
                
                {/* ✅ Стримящееся сообщение - отдельный lightweight компонент */}
                {pendingMessage && pendingMessage.content && (
                  <StreamingMessage content={pendingMessage.content} />
                )}
                
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
  // ✅ Мемоизация: ре-рендерим только если изменились сохранённые сообщения
  (prevProps, nextProps) => {
    // Изменились сохранённые сообщения?
    if (
      prevProps.messages.length !== nextProps.messages.length ||
      prevProps.currentConversationId !== nextProps.currentConversationId ||
      prevProps.editingMessageId !== nextProps.editingMessageId ||
      prevProps.error !== nextProps.error
    ) {
      return false;
    }

    // Появилось/исчезло стримящееся сообщение?
    const hadPending = !!prevProps.pendingMessage?.content;
    const hasPending = !!nextProps.pendingMessage?.content;
    
    if (hadPending !== hasPending) {
      return false; // Нужно показать/скрыть StreamingMessage
    }

    // isLoading изменился?
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }

    // ✅ ВАЖНО: НЕ сравниваем pendingMessage.content!
    // Это позволяет StreamingMessage обновляться независимо
    
    return true; // Всё остальное одинаково - пропускаем ре-рендер
  }
);

ChatAreaComponent.displayName = 'ChatArea';

export const ChatArea = ChatAreaComponent;