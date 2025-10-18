// 📄 src/components/ChatInput.tsx

import { Send } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}

export const ChatInput = ({ 
  input, 
  setInput, 
  handleSubmit, 
  isLoading 
}: ChatInputProps) => (
  // -> ИЗМЕНЕНИЕ: Возвращаемся к логике `left-64` для десктопа.
  //    НО! Мы помещаем поле ввода в `div` с `flex-1`, который занимает
  //    всю доступную ширину. Это позволит нам центрировать внутренний блок.
  <div className="absolute bottom-0 right-0 left-0 md:left-64 bg-gray-900/80 backdrop-blur-sm border-t border-orange-500/10">
    {/* Этот `div` с `mx-auto` как раз и отвечает за центрирование */}
    <div className="w-full max-w-3xl px-4 py-3 mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Type something clever (or don't, we won't judge)..."
            className="w-full py-3 pl-4 pr-12 overflow-hidden text-sm text-white placeholder-gray-400 border rounded-lg shadow-lg resize-none border-orange-500/20 bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '200px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height =
                Math.min(target.scrollHeight, 200) + 'px'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute p-2 text-orange-500 transition-colors -translate-y-1/2 right-2 top-1/2 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  </div>
);