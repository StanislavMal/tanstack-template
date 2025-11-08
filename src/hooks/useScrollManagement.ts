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
  const consecutiveDownScrollsRef = useRef(0);

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
      
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      if (scrollDelta < -5) {  
        isLockedToBottomRef.current = false;
        consecutiveDownScrollsRef.current = 0;
      }

      else if (scrollDelta > 10) {
        consecutiveDownScrollsRef.current++;

        if (distanceFromBottom < 150) {
          isLockedToBottomRef.current = true;
          consecutiveDownScrollsRef.current = 0;

          if (distanceFromBottom > 140) {
            forceScrollToBottom('smooth');
          }
        }
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
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
    consecutiveDownScrollsRef.current = 0;
    forceScrollToBottom('smooth');
  }, [forceScrollToBottom]);

  const lockToBottom = useCallback(() => {
    isLockedToBottomRef.current = true;
    consecutiveDownScrollsRef.current = 0;
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