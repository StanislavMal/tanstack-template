// 📄 src/components/ReasoningDisplay.tsx

import { useState, useEffect, useRef } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReasoningDisplayProps {
  reasoningContent?: string;
  isThinking?: boolean;
  model: string;
  reasoningEffort?: string;
}

export const ReasoningDisplay = ({ 
  reasoningContent, 
  isThinking = false, 
  model,
  reasoningEffort 
}: ReasoningDisplayProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [displayedReasoning, setDisplayedReasoning] = useState('');
  const reasoningRef = useRef<HTMLDivElement>(null);

  // Анимация появления текста размышлений
  useEffect(() => {
    if (!reasoningContent) {
      setDisplayedReasoning('');
      return;
    }

    let currentIndex = 0;
    const content = reasoningContent;
    setDisplayedReasoning('');

    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedReasoning(prev => prev + content[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 10); // Скорость печати

    return () => clearInterval(interval);
  }, [reasoningContent]);

  // Автоматическое разворачивание при появлении контента
  useEffect(() => {
    if (reasoningContent && !isExpanded) {
      setIsExpanded(true);
    }
  }, [reasoningContent, isExpanded]);

  if (!reasoningContent && !isThinking) {
    return null;
  }

  const isProModel = model.includes('pro');
  const effortLevels = {
    'low': t('reasoningEffortLow'),
    'medium': t('reasoningEffortMedium'), 
    'high': t('reasoningEffortHigh'),
    'none': t('reasoningEffortNone')
  };

  return (
    <div className="mt-4 mb-6 border-l-4 border-blue-500 bg-blue-500/5 rounded-r-lg">
      {/* Заголовок размышлений */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-blue-500/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className="w-5 h-5 text-blue-500" />
            {isThinking && (
              <div className="absolute -top-1 -right-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-blue-400 flex items-center gap-2">
              {isThinking ? t('thinkingInProgress') : t('thinkingComplete')}
              {isProModel && (
                <span className="px-2 py-1 text-xs font-normal bg-blue-500/20 text-blue-300 rounded-full">
                  {t('proModel')}
                </span>
              )}
            </h3>
            <p className="text-sm text-blue-300/80">
              {t('reasoningEffort')}: {effortLevels[reasoningEffort as keyof typeof effortLevels] || reasoningEffort}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isThinking && (
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-blue-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-blue-400" />
          )}
        </div>
      </div>

      {/* Контент размышлений */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div 
            ref={reasoningRef}
            className="prose prose-sm max-w-none text-blue-100/90 bg-blue-500/10 rounded-lg p-4 font-mono text-sm leading-relaxed"
          >
            {isThinking && !reasoningContent ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-300/70">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  {t('analyzingProblem')}
                </div>
                <div className="flex items-center gap-2 text-blue-300/70">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                  {t('generatingThoughts')}
                </div>
                <div className="flex items-center gap-2 text-blue-300/70">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                  {t('evaluatingSolutions')}
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">
                {displayedReasoning}
                {isThinking && (
                  <span className="inline-block w-2 h-4 ml-1 bg-blue-400 animate-pulse" />
                )}
              </div>
            )}
          </div>
          
          {/* Статистика размышлений */}
          {reasoningContent && (
            <div className="flex items-center justify-between mt-3 text-xs text-blue-300/70">
              <span>
                {t('thoughtsGenerated')}: {reasoningContent.split('\n').filter(line => line.trim()).length}
              </span>
              <span>
                {t('characters')}: {reasoningContent.length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};