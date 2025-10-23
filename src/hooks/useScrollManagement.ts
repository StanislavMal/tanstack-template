// 📄 src/hooks/useScrollManagement.ts

import { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';

export function useScrollManagement() {
  const messagesContainerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isLockedToBottomRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);

  // -> ЛОГ: Инициализация хука
  console.log('[useScrollManagement] Hook initialized. Initial lock:', isLockedToBottomRef.current);


  const forceScrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    const container = messagesContainerRef.current;
    if (container) {
      // -> ЛОГ: Вызов принудительной прокрутки
      console.log(`[useScrollManagement] Forcing scroll to bottom (scrollHeight: ${container.scrollHeight}, behavior: ${behavior})`);
      container.scrollTo({ top: container.scrollHeight, behavior });
    } else {
      console.warn('[useScrollManagement] forceScrollToBottom called but container is null.');
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    // -> ЛОГ: Пользователь нажал кнопку "вниз"
    console.log('[useScrollManagement] scrollToBottom clicked. Locking to bottom.');
    isLockedToBottomRef.current = true;
    forceScrollToBottom('smooth');
  }, [forceScrollToBottom]);

  // Автоматическая прокрутка при изменении контента
  useLayoutEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    // -> ЛОГ: Подключение ResizeObserver
    console.log('[useScrollManagement] ResizeObserver attached.');

    const observer = new ResizeObserver(() => {
      // -> ЛОГ: ResizeObserver сработал
      console.log(`[useScrollManagement] ResizeObserver fired. isLocked: ${isLockedToBottomRef.current}`);
      if (isLockedToBottomRef.current) {
        forceScrollToBottom('auto');
      }
    });

    observer.observe(contentElement);
    return () => {
      // -> ЛОГ: Отключение ResizeObserver
      console.log('[useScrollManagement] ResizeObserver disconnected.');
      observer.disconnect();
    }
  }, [forceScrollToBottom]);

  // Отслеживание скролла пользователя
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // -> ЛОГ: Подключение слушателя скролла
    console.log('[useScrollManagement] Scroll listener attached.');

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const oldLockState = isLockedToBottomRef.current;
      
      // Пользователь скроллит вверх
      if (scrollTop < lastScrollTopRef.current) {
        isLockedToBottomRef.current = false;
      }
      
      // Проверяем, достигли ли мы низа
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 1;
      if (isAtBottom) {
        isLockedToBottomRef.current = true;
      }
      
      if (oldLockState !== isLockedToBottomRef.current) {
        // -> ЛОГ: Изменение состояния "замка"
        console.log(`[useScrollManagement] Lock state changed to: ${isLockedToBottomRef.current}`);
      }

      lastScrollTopRef.current = scrollTop;
      
      // Показываем кнопку прокрутки вниз
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollDownButton(isScrolledUp);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      // -> ЛОГ: Отключение слушателя скролла
      console.log('[useScrollManagement] Scroll listener removed.');
      container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const lockToBottom = useCallback(() => {
    // -> ЛОГ: Вызов функции блокировки
    console.log('[useScrollManagement] lockToBottom called.');
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