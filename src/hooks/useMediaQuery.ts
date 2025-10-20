// src/hooks/useMediaQuery.ts

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const getMatches = (query: string): boolean => {
    // Предотвращает ошибку "window is not defined" во время серверного рендеринга (SSR)
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Устанавливаем начальное значение после монтирования на клиенте
    setMatches(mediaQueryList.matches);

    // Добавляем слушатель для отслеживания изменений размера окна
    mediaQueryList.addEventListener('change', handleChange);

    // Очищаем слушатель при размонтировании компонента
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}