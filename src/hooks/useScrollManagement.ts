// 📄 src/hooks/useScrollManagement.ts

import { useRef, useState, useCallback, useLayoutEffect } from 'react';

export function useScrollManagement(messageCount: number = 0) {
  const scrollContainerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isLockedToBottomRef = useRef(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  
  const prevMessageCountRef = useRef(messageCount);
  
  // ✅ НОВОЕ: Флаг программного скролла (вызванного из кода, а не пользователем)
  const isProgrammaticScrollRef = useRef(false);
  
  // ✅ НОВОЕ: Таймер для дебаунсинга (защита от частых срабатываний)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const forceScrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto') => {
    const container = scrollContainerRef.current;
    if (container) {
      // ✅ КРИТИЧНО: Помечаем что это программный скролл, не реакция пользователя
      isProgrammaticScrollRef.current = true;
      
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
      
      // ✅ Сбрасываем флаг через небольшую задержку
      // На мобильных scrollTo может выполняться до 150ms
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 150);
    }
  }, []);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // ✅ УЛУЧШЕНО: Обработчик с защитой от ложных срабатываний
    const handleScroll = () => {
      // ✅ КРИТИЧНО: Игнорируем события scroll, вызванные программно (из ResizeObserver)
      if (isProgrammaticScrollRef.current) {
        return;
      }
      
      // ✅ НОВОЕ: Дебаунсинг - обрабатываем только когда скролл остановился
      // Это защищает от "дрожания" на мобильных при быстром стриминге
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        
        // ✅ УЛУЧШЕНО: Увеличен порог для мобильных устройств
        // Было 5px → стало 20px (более мягкая проверка)
        const threshold = 20;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;
        
        // Обновляем состояние блокировки
        isLockedToBottomRef.current = isAtBottom;
        
        // Показываем кнопку "вниз" если далеко от низа
        const shouldShowButton = scrollHeight - scrollTop - clientHeight > 150;
        setShowScrollDownButton(shouldShowButton && !isAtBottom);
        
        scrollTimeoutRef.current = null;
      }, 50); // ✅ Дебаунс 50ms - обрабатываем после остановки скролла
    };

    // ResizeObserver следит за изменением размера контента (стриминг текста)
    const resizeObserver = new ResizeObserver(() => {
      if (isLockedToBottomRef.current) {
        forceScrollToBottom('auto');
      }
    });

    resizeObserver.observe(content);
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Прокручиваем вниз при добавлении новых сообщений
    if (messageCount > prevMessageCountRef.current) {
      isLockedToBottomRef.current = true;
      forceScrollToBottom('auto');
      prevMessageCountRef.current = messageCount;
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      
      // ✅ Очищаем таймер при размонтировании
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
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