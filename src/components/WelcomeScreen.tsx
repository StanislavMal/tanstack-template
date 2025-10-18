// 📄 src/components/WelcomeScreen.tsx

import { Send } from 'lucide-react';

interface WelcomeScreenProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}

export const WelcomeScreen = ({ 
  input, 
  setInput, 
  handleSubmit, 
  isLoading 
}: WelcomeScreenProps) => (
  // -> ИЗМЕНЕНИЕ: Убираем лишний родительский div, так как центрирование
  //    теперь происходит в `index.tsx`.
  <div className="w-full max-w-3xl mx-auto text-center">
    <h1 className="mb-4 text-6xl font-bold text-transparent uppercase bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text">
      <span className="text-white">AI</span> Chat
    </h1>
    <p className="w-2/3 mx-auto mb-6 text-lg text-gray-400">
      Вы можете спросить меня о чем угодно, у меня может быть хороший ответ,
       а может и не быть, но вы все равно можете спросить.
    </p>
    <form onSubmit={handleSubmit}>
      <div className="relative max-w-xl mx-auto">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="Напишите что-нибудь умное (или не пишите, мы не будем судить)..."
          className="w-full py-3 pl-4 pr-12 overflow-hidden text-sm text-white placeholder-gray-400 border rounded-lg resize-none border-orange-500/20 bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
          rows={1}
          style={{ minHeight: '88px' }}
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
);