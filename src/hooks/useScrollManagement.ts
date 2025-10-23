// 📄 src/hooks/useScrollManagement.ts

import { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';

export function useScrollManagement() {
  const messagesContainerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isLockedToBottomRef = useRef(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);

  console.log(`[useScrollManagement] HOOK INITIALIZED. Initial lock: ${isLockedToBottomRef.current}`);

  const forceScrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    const container = messagesContainerRef.current;
    if (container) {
      console.log(`[useScrollManagement] ---> forceScrollToBottom CALLED. Behavior: ${behavior}, ScrollHeight: ${container.scrollHeight}`);
      container.scrollTo({ top: container.scrollHeight, behavior });
    } else {
      console.warn('[useScrollManagement] forceScrollToBottom called but container is null.');
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    console.log('[useScrollManagement] scrollToBottom CALLED (from button or other UI). Setting lock to TRUE.');
    isLockedToBottomRef.current = true;
    setShowScrollDownButton(false);
    forceScrollToBottom('smooth');
  }, [forceScrollToBottom]);

  useLayoutEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    console.log('[useScrollManagement] ResizeObserver ATTACHED.');
    const observer = new ResizeObserver((entries) => {
      const newHeight = entries[0]?.contentRect?.height;
      console.log(`[useScrollManagement] ResizeObserver FIRED. New height: ${newHeight}. Lock is: ${isLockedToBottomRef.current}`);
      if (isLockedToBottomRef.current) {
        forceScrollToBottom('auto');
      }
    });

    observer.observe(contentElement);
    return () => {
        console.log('[useScrollManagement] ResizeObserver DISCONNECTED.');
        observer.disconnect();
    }
  }, [forceScrollToBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    console.log('[useScrollManagement] Scroll listener ATTACHED.');
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      
      const isAtBottom = distanceToBottom < 10;
      const oldLockState = isLockedToBottomRef.current;

      if (isAtBottom !== oldLockState) {
        isLockedToBottomRef.current = isAtBottom;
        console.log(`[useScrollManagement] LOCK STATE CHANGED to ${isAtBottom}. (Distance to bottom: ${distanceToBottom.toFixed(2)})`);
      }
      
      const isScrolledUp = distanceToBottom > 150;
      if (showScrollDownButton !== isScrolledUp) {
        setShowScrollDownButton(isScrolledUp);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
        console.log('[useScrollManagement] Scroll listener REMOVED.');
        container.removeEventListener('scroll', handleScroll);
    }
  }, [showScrollDownButton]); // Добавили зависимость для корректного обновления

  const lockToBottom = useCallback(() => {
    console.log('[useScrollManagement] lockToBottom CALLED. Setting lock to TRUE.');
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