// 📄 src/hooks/useCopyToClipboard.ts

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCopyToClipboardOptions {
  /**
   * Время (мс), в течение которого показывается статус "Скопировано"
   * @default 2000
   */
  timeout?: number;
}

interface UseCopyToClipboardReturn {
  /** Текущий статус копирования */
  isCopied: boolean;
  /** Функция для копирования текста */
  copyToClipboard: (text: string) => void;
}

/**
 * Хук для копирования текста в буфер обмена
 * Автоматически сбрасывает статус через заданное время
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn {
  const { timeout = 2000 } = options;
  
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    
    // Очищаем предыдущий таймер
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Устанавливаем новый таймер
    timeoutRef.current = setTimeout(() => {
      setIsCopied(false);
      timeoutRef.current = null;
    }, timeout);
  }, [timeout]);

  return { isCopied, copyToClipboard };
}