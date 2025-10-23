// 📄 src/hooks/useScrollManagement.ts

import { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';

export function useScrollManagement() {
  const messagesContainerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isLockedToBottomRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);

  const forceScrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    const container = messagesContainerRef.current;
    if (container) {
      // Используем requestAnimationFrame для гарантии, что DOM обновлен
      requestAnimationFrame(() => {
        container.scrollTo({ 
          top: container.scrollHeight, 
          behavior,
          // Добавляем небольшую задержку для Safari
          ...(behavior === 'auto' && { behavior: 'instant' as any })
        });
      });
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    forceScrollToBottom('smooth');
    setShowScrollDownButton(false);
  }, [forceScrollToBottom]);

  // Инициализация и переподключение ResizeObserver
  useLayoutEffect(() => {
    const setupResizeObserver = () => {
      // Очищаем предыдущий observer
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      const contentElement = contentRef.current;
      if (!contentElement) {
        // Если элемент еще не готов, попробуем снова через короткий промежуток
        const retryTimeout = setTimeout(setupResizeObserver, 100);
        return () => clearTimeout(retryTimeout);
      }

      // Создаем новый ResizeObserver
      resizeObserverRef.current = new ResizeObserver((entries) => {
        // Проверяем, что это действительно изменение размера контента
        for (const entry of entries) {
          if (entry.target === contentElement) {
            // Прокручиваем вниз только если заблокированы к низу
            if (isLockedToBottomRef.current) {
              forceScrollToBottom('auto');
            }
          }
        }
      });

      // Начинаем наблюдение
      resizeObserverRef.current.observe(contentElement);

      // Делаем начальную прокрутку вниз
      if (isLockedToBottomRef.current) {
        forceScrollToBottom('auto');
      }
    };

    setupResizeObserver();

    // Cleanup
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [forceScrollToBottom]);

  // Отслеживание скролла пользователя
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      // Если контейнер еще не готов, пробуем позже
      const retryTimeout = setTimeout(() => {
        const retryContainer = messagesContainerRef.current;
        if (retryContainer && isLockedToBottomRef.current) {
          forceScrollToBottom('auto');
        }
      }, 100);
      return () => clearTimeout(retryTimeout);
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Определяем направление скролла
      const isScrollingUp = scrollTop < lastScrollTopRef.current;
      const isScrollingDown = scrollTop > lastScrollTopRef.current;
      
      // Пользователь скроллит вверх - отключаем автоскролл
      if (isScrollingUp && scrollTop > 0) {
        isLockedToBottomRef.current = false;
      }
      
      // Проверяем, достигли ли мы низа (с небольшим допуском в 5px для погрешности)
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;
      
      // Если скроллим вниз и достигли низа - включаем автоскролл
      if (isScrollingDown && isAtBottom) {
        isLockedToBottomRef.current = true;
      }
      
      lastScrollTopRef.current = scrollTop;
      
      // Показываем кнопку прокрутки вниз если отскроллили больше чем на 150px
      const shouldShowButton = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollDownButton(shouldShowButton && !isLockedToBottomRef.current);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Делаем начальную прокрутку если нужно
    if (isLockedToBottomRef.current) {
      forceScrollToBottom('auto');
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [forceScrollToBottom]);

  // Функция для принудительной блокировки к низу (используется при отправке сообщения)
  const lockToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    setShowScrollDownButton(false);
    // Немедленно прокручиваем вниз
    forceScrollToBottom('auto');
  }, [forceScrollToBottom]);

  // Функция для проверки и восстановления автоскролла после загрузки данных
  const checkAndRestoreScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container && isLockedToBottomRef.current) {
      // Используем setTimeout чтобы дать время DOM обновиться
      setTimeout(() => {
        forceScrollToBottom('auto');
      }, 0);
    }
  }, [forceScrollToBottom]);

  return {
    messagesContainerRef,
    contentRef,
    showScrollDownButton,
    scrollToBottom,
    forceScrollToBottom,
    lockToBottom,
    checkAndRestoreScroll, // Новая функция
  };
}