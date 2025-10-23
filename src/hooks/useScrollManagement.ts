// 📄 src/hooks/useScrollManagement.ts

import { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';

export function useScrollManagement() {
  const messagesContainerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isLockedToBottomRef = useRef(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);

  const forceScrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    // Эта функция вызывается кнопкой "вниз" или при отправке сообщения
    isLockedToBottomRef.current = true;
    setShowScrollDownButton(false);
    forceScrollToBottom('smooth');
  }, [forceScrollToBottom]);

  // Следим за ростом контента (стриминг)
  useLayoutEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const observer = new ResizeObserver(() => {
      if (isLockedToBottomRef.current) {
        forceScrollToBottom('auto');
      }
    });

    observer.observe(contentElement);
    return () => observer.disconnect();
  }, [forceScrollToBottom]);

  // Следим за скроллом пользователя
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Простой порог в 10 пикселей, чтобы избежать ложных срабатываний
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      isLockedToBottomRef.current = isAtBottom;

      // Показываем кнопку, если пользователь прокрутил значительно вверх
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollDownButton(isScrolledUp);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Первичная проверка при монтировании
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const lockToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    setShowScrollDownButton(false);
  }, []);

  return {
    messagesContainerRef,
    contentRef,
    showScrollDownButton,
    scrollToBottom,
    forceScrollToBottom,
    lockToBottom,
  };
}