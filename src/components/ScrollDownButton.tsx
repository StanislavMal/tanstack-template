// 📄 src/components/ScrollDownButton.tsx

import { ArrowDown } from 'lucide-react';
import type { FC } from 'react';

interface ScrollDownButtonProps {
  onClick: () => void;
  className?: string; // Позволяет передавать классы для позиционирования
}

export const ScrollDownButton: FC<ScrollDownButtonProps> = ({ onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={`absolute z-10 w-10 h-10 rounded-full bg-gray-700/80 backdrop-blur-sm text-white flex items-center justify-center shadow-lg hover:bg-gray-600 ${className}`}
    >
      <ArrowDown className="w-5 h-5" />
    </button>
  );
};