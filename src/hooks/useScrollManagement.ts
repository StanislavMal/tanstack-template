// 📄 src/hooks/useScrollManagement.ts (Исправленная версия)

import { useRef, useState, useCallback, useLayoutEffect } from 'react';
// ИЗМЕНЕНИЕ: Убран неиспользуемый импорт `Message`

export function useScrollManagement(dependencies: any[] = []) {
  const scrollContainerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Ref для отслеживания, привязан ли скролл к низу.
  const isLockedToBottomRef = useRef(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);

  // --- Функция для немедленной прокрутки ---
  const forceScrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto') => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  }, []);

  // --- Эффект, который следит за всем ---
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // --- Обработчик скролла пользователем ---
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;
      
      // Обновляем состояние привязки
      isLockedToBottomRef.current = isAtBottom;

      // Управляем видимостью кнопки "Вниз"
      const shouldShowButton = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollDownButton(shouldShowButton && !isAtBottom);
    };

    // --- Observer'ы для автоматической прокрутки ---
    const observerCallback = () => {
      if (isLockedToBottomRef.current) {
        forceScrollToBottom('auto');
      }
    };
    
    // ResizeObserver следит за изменением размера, включая стриминг
    const resizeObserver = new ResizeObserver(observerCallback);
    resizeObserver.observe(content);
    
    // MutationObserver следит за добавлением/удалением сообщений
    const mutationObserver = new MutationObserver(observerCallback);
    mutationObserver.observe(content, { childList: true, subtree: true });

    // --- Добавляем слушатель ---
    container.addEventListener('scroll', handleScroll, { passive: true });

    // --- Начальная прокрутка при монтировании или смене зависимостей ---
    // Это сработает при загрузке новых чатов.
    forceScrollToBottom('auto');

    // --- Очистка ---
    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
    // Мы передаем `dependencies` (например, массив `messages`), чтобы этот
    // эффект перезапускался при смене чата, гарантируя начальную прокрутку.
  }, [dependencies, forceScrollToBottom]);


  // --- Публичные методы ---
  
  // Для кнопки "Вниз"
  const scrollToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    forceScrollToBottom('smooth');
  }, [forceScrollToBottom]);

  // Для отправки сообщения
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