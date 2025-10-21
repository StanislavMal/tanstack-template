// 📄 src/components/Footer.tsx

import { memo, forwardRef } from 'react';
import { ChatInput } from './ChatInput';

interface FooterProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}

export const Footer = memo(forwardRef<HTMLTextAreaElement, FooterProps>(
  ({ input, setInput, handleSubmit, isLoading }, ref) => {
    return (
      <footer className="w-full max-w-5xl mx-auto">
        <ChatInput 
          ref={ref}
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