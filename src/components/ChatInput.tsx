// 📄 src/components/ChatInput.tsx

import { forwardRef, type Ref } from 'react';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const ChatInput = forwardRef((
  { input, setInput, handleSubmit, isLoading, onFocus, onBlur }: ChatInputProps,
  ref: Ref<HTMLTextAreaElement>
) => {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isDesktop && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any); 
    }
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm border-t border-orange-500/10 p-4">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <textarea
            ref={ref}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={t('chatInputPlaceholder')}
            className="w-full pl-4 pr-12 py-2.5 overflow-y-auto text-sm text-white placeholder-gray-400 border rounded-lg shadow-lg resize-none border-orange-500/20 bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent max-h-[200px]"
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = (target.scrollHeight) + 'px'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute p-2 text-orange-500 transition-colors right-3 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
            aria-label={t('sendMessage') || 'Send message'}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
