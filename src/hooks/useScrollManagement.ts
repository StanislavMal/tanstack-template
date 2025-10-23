// 📄 src/hooks/useScrollManagement.ts (Улучшенная версия)

import { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';

// Порог в пикселях, определяющий, находится ли пользователь "у самого низа"
const SCROLL_NEAR_BOTTOM_THRESHOLD = 10;

export function useScrollManagement() {
  const scrollContainerRef = useRef<HTMLElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  
  // Ref для отслеживания, был ли скролл инициирован пользователем.
  // Это помогает отличить ручной скролл от программного.
  const userScrollRef = useRef(false);

  // Состояние, показывающее, должен ли скролл быть "приклеен" к низу.
  const [isLockedToBottom, setIsLockedToBottom] = useState(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);

  // --- Основная функция прокрутки ---
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto') => {
    const container = scrollContainerRef.current;
    if (container) {
      // Исполняем скролл в следующем кадре анимации, чтобы DOM успел обновиться.
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      });
    }
  }, []);

  // --- Эффект для отслеживания ручного скролла пользователем ---
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Если скролл был программным, игнорируем этот вызов.
      if (!userScrollRef.current) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < SCROLL_NEAR_BOTTOM_THRESHOLD;

      // Если пользователь доскроллил до низа, снова "приклеиваемся".
      // Если он отскроллил вверх, "отклеиваемся".
      setIsLockedToBottom(isAtBottom);
    };

    const handleTouchStart = () => { userScrollRef.current = true; };
    const handleWheel = () => { userScrollRef.current = true; };

    // Мы слушаем события, которые точно инициирует пользователь.
    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // --- Эффект для управления видимостью кнопки "Вниз" ---
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkButtonVisibility = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Показываем кнопку, если пользователь не приклеен к низу 
      // и отскроллил на значительное расстояние (например, > 150px)
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollDownButton(isScrolledUp && !isLockedToBottom);
    };

    // Проверяем видимость при любом скролле и изменении состояния привязки.
    container.addEventListener('scroll', checkButtonVisibility, { passive: true });
    checkButtonVisibility(); // Начальная проверка

    return () => {
      container.removeEventListener('scroll', checkButtonVisibility);
    };
  }, [isLockedToBottom]);

  // --- Главный эффект, который реагирует на изменение контента и состояние привязки ---
  useLayoutEffect(() => {
    const content = contentWrapperRef.current;
    if (!content) return;

    // Этот ResizeObserver будет следить за высотой блока с сообщениями.
    const resizeObserver = new ResizeObserver(() => {
      // Если мы "приклеены" к низу, то при любом изменении размера контента
      // (например, при добавлении нового сообщения или стриминге),
      // мы прокручиваемся вниз.
      if (isLockedToBottom) {
        // Устанавливаем флаг, что это не пользовательский скролл.
        userScrollRef.current = false;
        scrollToBottom('auto');
      }
    });

    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, [isLockedToBottom, scrollToBottom]);

  // --- Публичные методы для управления скроллом извне ---

  // Используется при отправке нового сообщения, чтобы принудительно "приклеиться" к низу.
  const lockToBottomAndScroll = useCallback(() => {
    setIsLockedToBottom(true);
    setShowScrollDownButton(false);
    userScrollRef.current = false;
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  // Используется при нажатии на кнопку "Вниз".
  const forceScrollToBottom = useCallback(() => {
    setIsLockedToBottom(true);
    setShowScrollDownButton(false);
    userScrollRef.current = false;
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  // Используется после первоначальной загрузки чатов для установки правильной позиции.
  const checkAndRestoreScroll = useCallback(() => {
    if (isLockedToBottom) {
      scrollToBottom('auto');
    }
  }, [isLockedToBottom, scrollToBottom]);

  return {
    // Переименовываем ref'ы для большей ясности
    messagesContainerRef: scrollContainerRef,
    contentRef: contentWrapperRef,
    
    showScrollDownButton,
    
    // Переименовываем методы для ясности их назначения
    forceScrollToBottom, // для кнопки "Вниз"
    lockToBottom: lockToBottomAndScroll, // для отправки сообщения
    checkAndRestoreScroll,
  };
}