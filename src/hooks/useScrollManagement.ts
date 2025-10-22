// 📄 src/hooks/useScrollManagement.ts

import { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';

export function useScrollManagement() {
  const messagesContainerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isLockedToBottomRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);

  const forceScrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    forceScrollToBottom('smooth');
  }, [forceScrollToBottom]);

  // -> ИЗМЕНЕНИЕ: Добавлен немедленный скролл после монтирования контента
  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    const content = contentRef.current;
    
    if (container && content && isLockedToBottomRef.current) {
      // Немедленно прокручиваем вниз при первом рендере или обновлении контента
      forceScrollToBottom('auto');
    }
  }, [forceScrollToBottom]);

  // Автоматическая прокрутка при изменении контента
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

  // Отслеживание скролла пользователя
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Пользователь скроллит вверх
      if (scrollTop < lastScrollTopRef.current) {
        isLockedToBottomRef.current = false;
      }
      
      // Проверяем, достигли ли мы низа
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 1;
      if (isAtBottom) {
        isLockedToBottomRef.current = true;
      }
      
      lastScrollTopRef.current = scrollTop;
      
      // Показываем кнопку прокрутки вниз
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollDownButton(isScrolledUp);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
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