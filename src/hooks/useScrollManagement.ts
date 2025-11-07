// 📄 src/hooks/useScrollManagement.ts

import { useRef, useState, useCallback, useLayoutEffect } from 'react';

export function useScrollManagement(messageCount: number = 0) {
  const scrollContainerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isLockedToBottomRef = useRef(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  
  const prevMessageCountRef = useRef(messageCount);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const forceScrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto') => {
    const container = scrollContainerRef.current;
    if (container) {
      isProgrammaticScrollRef.current = true;
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 150);
    }
  }, []);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      
      scrollTimeoutRef.current = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const threshold = 20;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;
        
        isLockedToBottomRef.current = isAtBottom;
        
        const shouldShowButton = scrollHeight - scrollTop - clientHeight > 150;
        setShowScrollDownButton(shouldShowButton && !isAtBottom);
        
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

    if (messageCount > prevMessageCountRef.current) {
      isLockedToBottomRef.current = true;
      forceScrollToBottom('auto');
      prevMessageCountRef.current = messageCount;
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [messageCount, forceScrollToBottom]);

  const scrollToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    forceScrollToBottom('smooth');
  }, [forceScrollToBottom]);

  // ✅ НОВАЯ ФУНКЦИЯ: Принудительно блокируем скролл
  const lockToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    forceScrollToBottom('auto');
  }, [forceScrollToBottom]);

  return {
    messagesContainerRef: scrollContainerRef,
    contentRef,
    showScrollDownButton,
    scrollToBottom,
    lockToBottom, // ✅ Экспортируем ее
  };
}
