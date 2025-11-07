// 📄 src/components/Footer.tsx

import { useState, memo, forwardRef, useImperativeHandle, useRef } from 'react';
import { ChatInput } from './ChatInput';

interface FooterProps {
  onSend: (message: string) => Promise<void>;
  isLoading: boolean;
}

export interface FooterRef {
  resetInput: () => void;
}

export const Footer = memo(forwardRef<FooterRef, FooterProps>(
  ({ onSend, isLoading }, ref) => {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ✅ Этот хук "пробрасывает" функцию resetInput наружу,
    // чтобы родительский компонент (Home) мог ее вызвать.
    useImperativeHandle(ref, () => ({
      resetInput: () => {
        setInput('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'; // Сбрасываем высоту textarea
        }
      }
    }));

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const messageToSend = input.trim();
      if (!messageToSend || isLoading) return;
      
      // Мы не сбрасываем инпут здесь, так как родительский компонент
      // вызовет `resetInput` сразу после клика. Это дает лучший UX.
      await onSend(messageToSend);
    };

    return (
      <footer className="w-full max-w-5xl mx-auto">
        <ChatInput 
          ref={textareaRef}
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </footer>
    );
  }
));

Footer.displayName = 'Footer';