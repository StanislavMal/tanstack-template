// 📄 src/hooks/useScrollManagement.ts

import { useRef, useState, useCallback, useLayoutEffect } from 'react';

export function useScrollManagement(messageCount: number = 0) {
  const scrollContainerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isLockedToBottomRef = useRef(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  
  const prevMessageCountRef = useRef(messageCount);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTopRef = useRef(0);
  
  // 🔥 Отслеживаем намерение вернуться вниз
  const isScrollingDownRef = useRef(false);

  const forceScrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto') => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  }, []);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Определяем направление скролла
      const scrollDelta = scrollTop - lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;
      
      // 🔥 Отслеживаем направление движения
      if (scrollDelta < -5) {  
        // Скроллим вверх - разблокируем
        isLockedToBottomRef.current = false;
        isScrollingDownRef.current = false;
      } else if (scrollDelta > 5) {
        // Скроллим вниз - запоминаем намерение
        isScrollingDownRef.current = true;
      }
      
      // 🔥 Адаптивный порог для захвата
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Разные пороги для разных ситуаций:
      // - Если скроллим вниз намеренно - большой порог (150px)
      // - Если просто находимся внизу - маленький порог (30px)
      const captureThreshold = isScrollingDownRef.current ? 150 : 30;
      const isAtBottom = distanceFromBottom < captureThreshold;
      
      // 🔥 Дополнительная проверка: если почти внизу И скроллим вниз - захватываем
      if (isAtBottom && isScrollingDownRef.current) {
        isLockedToBottomRef.current = true;
        isScrollingDownRef.current = false; // Сбрасываем флаг
        // Сразу доскролливаем до конца для лучшего UX
        if (distanceFromBottom > 30) {
          forceScrollToBottom('smooth');
        }
      } else if (distanceFromBottom < 30) {
        // Очень близко к низу - всегда блокируем
        isLockedToBottomRef.current = true;
      }
      
      // Debounce только для кнопки
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        // 🔥 Показываем кнопку только если далеко от низа
        const shouldShowButton = distanceFromBottom > 200;
        setShowScrollDownButton(shouldShowButton && !isLockedToBottomRef.current);
        scrollTimeoutRef.current = null;
      }, 50);
    };

    const resizeObserver = new ResizeObserver(() => {
      if (isLockedToBottomRef.current) {
        forceScrollToBottom('auto');
      }
    });

    resizeObserver.observe(content);
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Инициализация последней позиции
    lastScrollTopRef.current = container.scrollTop;

    if (messageCount > prevMessageCountRef.current && isLockedToBottomRef.current) {
      forceScrollToBottom('auto');
    }
    prevMessageCountRef.current = messageCount;

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
    
  }, [messageCount, forceScrollToBottom]);

  const scrollToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    isScrollingDownRef.current = false;
    forceScrollToBottom('smooth');
  }, [forceScrollToBottom]);

  const lockToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    isScrollingDownRef.current = false;
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