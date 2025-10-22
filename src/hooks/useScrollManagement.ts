// 📄 src/hooks/useScrollManagement.ts

import { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';

export function useScrollManagement() {
  const messagesContainerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isLockedToBottomRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  
  // -> КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Флаг для отличия программного скролла от пользовательского
  const isProgrammaticScrollRef = useRef(false);

  const forceScrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    const container = messagesContainerRef.current;
    if (container) {
      // -> Помечаем что это программный скролл
      isProgrammaticScrollRef.current = true;
      container.scrollTo({ top: container.scrollHeight, behavior });
      
      // -> Сбрасываем флаг после завершения скролла
      // Для 'auto' - сразу, для 'smooth' - через время анимации
      if (behavior === 'auto') {
        // requestAnimationFrame гарантирует что DOM обновился
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false;
        });
      } else {
        // Smooth scroll занимает ~300-500ms
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 500);
      }
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    forceScrollToBottom('smooth');
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
      // -> КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Игнорируем программный скролл
      if (isProgrammaticScrollRef.current) {
        return;
      }

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