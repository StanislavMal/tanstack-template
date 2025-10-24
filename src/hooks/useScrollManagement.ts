// 📄 src/hooks/useScrollManagement.ts

import { useRef, useState, useCallback, useLayoutEffect } from 'react';

export function useScrollManagement(messageCount: number = 0) {
  const scrollContainerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isLockedToBottomRef = useRef(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  
  // ✅ ИСПРАВЛЕНИЕ: Используем количество сообщений вместо массива
  const prevMessageCountRef = useRef(messageCount);

  const forceScrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto') => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  }, []);

  // ✅ ИСПРАВЛЕНИЕ: Объединяем всю логику в один эффект
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // Обработчик прокрутки пользователем
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;
      
      isLockedToBottomRef.current = isAtBottom;
      
      const shouldShowButton = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollDownButton(shouldShowButton && !isAtBottom);
    };

    // ✅ ИСПРАВЛЕНИЕ: Используем только ResizeObserver для отслеживания изменений
    // Он покрывает и добавление сообщений, и стриминг текста
    const resizeObserver = new ResizeObserver(() => {
      if (isLockedToBottomRef.current) {
        forceScrollToBottom('auto');
      }
    });

    resizeObserver.observe(content);
    container.addEventListener('scroll', handleScroll, { passive: true });

    // ✅ ИСПРАВЛЕНИЕ: Прокручиваем вниз только при добавлении НОВЫХ сообщений
    if (messageCount > prevMessageCountRef.current) {
      isLockedToBottomRef.current = true;
      forceScrollToBottom('auto');
      prevMessageCountRef.current = messageCount;
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [messageCount, forceScrollToBottom]);

  const scrollToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    forceScrollToBottom('smooth');
  }, [forceScrollToBottom]);

  const lockToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    forceScrollToBottom('auto');
  }, [forceScrollToBottom]);

  return {
    messagesContainerRef: scrollContainerRef,
    contentRef,
    showScrollDownButton,
    scrollToBottom,
    lockToBottom,
  };
}