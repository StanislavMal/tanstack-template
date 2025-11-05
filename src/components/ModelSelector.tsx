// 📄 src/components/ModelSelector.tsx

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Sparkles, Zap, Brain, MessageSquare } from 'lucide-react';
import { useSettings } from '../store/hooks';
import { useTranslation } from 'react-i18next';

interface ModelConfig {
  id: string;
  name: string;
  provider: 'gemini' | 'deepseek';
  icon: React.ReactNode;
  description: string;
  supportsReasoning?: boolean;
  requiresReasoning?: boolean; // ✅ Новое: для Gemini Pro
}

const MODELS: ModelConfig[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    icon: <Zap className="w-4 h-4" />,
    description: 'Fast & efficient',
    supportsReasoning: true,
    requiresReasoning: false,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Most capable',
    supportsReasoning: true,
    requiresReasoning: true, // ✅ Pro требует reasoning минимум low
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    icon: <MessageSquare className="w-4 h-4" />,
    description: 'V3 General-purpose',
    supportsReasoning: false,
    requiresReasoning: false,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'deepseek',
    icon: <Brain className="w-4 h-4" />,
    description: 'R1 Reasoning',
    supportsReasoning: true,
    requiresReasoning: false,
  },
];

const REASONING_LEVELS = [
  { value: 'none', label: 'Off' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
];

export function ModelSelector() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = MODELS.find(m => m.id === settings?.model) || MODELS[0];

  // Закрытие при клике вне компонента
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleModelChange = (modelId: string) => {
    const model = MODELS.find(m => m.id === modelId);
    if (!model || !settings) return;

    // ✅ Для Gemini Pro устанавливаем минимум low если было none
    const newReasoningEffort = model.requiresReasoning && settings.reasoningEffort === 'none'
      ? 'low'
      : model.supportsReasoning
        ? settings.reasoningEffort
        : 'none';

    updateSettings({
      model: modelId,
      provider: model.provider,
      reasoningEffort: newReasoningEffort,
    });

    setIsOpen(false);
  };

  const handleReasoningChange = (level: string) => {
    if (!settings) return;
    
    // ✅ Для Gemini Pro запрещаем выбор 'none'
    if (currentModel.requiresReasoning && level === 'none') {
      return;
    }

    updateSettings({
      reasoningEffort: level as 'none' | 'low' | 'medium' | 'high',
    });
  };

  const handleTemperatureChange = (value: number) => {
    if (!settings) return;
    updateSettings({ temperature: value });
  };

  const handleStreamSpeedChange = (value: number) => {
    if (!settings) return;
    updateSettings({ streamSpeed: value });
  };

  if (!settings) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Кнопка выбора модели */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <div className="text-orange-400">{currentModel.icon}</div>
        <div className="hidden sm:block">
          <span className="text-sm">{currentModel.name}</span>
        </div>
        <div className="sm:hidden">
          <span className="text-sm">{currentModel.name.split(' ')[0]}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* ✅ ИСПРАВЛЕНО: Dropdown с правильным позиционированием */}
      {isOpen && (
        <div className="absolute left-0 sm:left-0 right-0 sm:right-auto top-full mt-2 w-screen sm:w-80 max-w-[100vw] sm:max-w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Список моделей */}
          <div className="max-h-64 overflow-y-auto">
            {/* Группа Gemini */}
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-gray-900">
              Google Gemini
            </div>
            {MODELS.filter(m => m.provider === 'gemini').map(model => (
              <button
                key={model.id}
                onClick={() => handleModelChange(model.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-700 transition-colors ${
                  settings.model === model.id ? 'bg-gray-700' : ''
                }`}
              >
                <div className={`${settings.model === model.id ? 'text-orange-400' : 'text-gray-400'}`}>
                  {model.icon}
                </div>
                <div className="flex-1 min-w-0">
                  {/* ✅ Компактный вид: название + описание в одну строку */}
                  <div className="text-sm font-medium text-white">
                    {model.name} <span className="text-xs text-gray-400">• {model.description}</span>
                  </div>
                </div>
                {settings.model === model.id && (
                  <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                )}
              </button>
            ))}

            {/* Группа DeepSeek */}
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-gray-900 border-t border-gray-700">
              DeepSeek
            </div>
            {MODELS.filter(m => m.provider === 'deepseek').map(model => (
              <button
                key={model.id}
                onClick={() => handleModelChange(model.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-700 transition-colors ${
                  settings.model === model.id ? 'bg-gray-700' : ''
                }`}
              >
                <div className={`${settings.model === model.id ? 'text-orange-400' : 'text-gray-400'}`}>
                  {model.icon}
                </div>
                <div className="flex-1 min-w-0">
                  {/* ✅ Компактный вид */}
                  <div className="text-sm font-medium text-white">
                    {model.name} <span className="text-xs text-gray-400">• {model.description}</span>
                  </div>
                </div>
                {settings.model === model.id && (
                  <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Разделитель */}
          <div className="border-t border-gray-700" />

          {/* Настройки для текущей модели */}
          <div className="p-3 bg-gray-900">
            <div className="text-xs font-semibold text-gray-400 mb-3">{t('modelSettings')}</div>

            {/* Reasoning Effort (только для моделей с поддержкой) */}
            {currentModel.supportsReasoning && currentModel.provider === 'gemini' && (
              <div className="mb-3">
                <label className="text-xs text-gray-400 block mb-1.5">{t('reasoningEffort')}</label>
                <div className="grid grid-cols-4 gap-1">
                  {REASONING_LEVELS.map(level => {
                    // ✅ Для Gemini Pro блокируем кнопку "Off"
                    const isDisabled = currentModel.requiresReasoning && level.value === 'none';
                    
                    return (
                      <button
                        key={level.value}
                        onClick={() => handleReasoningChange(level.value)}
                        disabled={isDisabled}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          settings.reasoningEffort === level.value
                            ? 'bg-orange-500 text-white'
                            : isDisabled
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {level.label}
                      </button>
                    );
                  })}
                </div>
                {/* ✅ Подсказка для Gemini Pro */}
                {currentModel.requiresReasoning && (
                  <p className="text-xs text-gray-500 mt-1">{t('reasoningRequired')}</p>
                )}
              </div>
            )}

            {/* Temperature */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">{t('temperature')}</label>
                <span className="text-xs text-orange-400 font-semibold">
                  {settings.temperature?.toFixed(1) || '0.7'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature || 0.7}
                onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{t('precise')}</span>
                <span>{t('creative')}</span>
              </div>
            </div>

            {/* ✅ Stream Speed */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">{t('streamSpeed')}</label>
                <span className="text-xs text-orange-400 font-semibold">
                  {settings.streamSpeed || 30} {t('streamSpeedUnit')}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={settings.streamSpeed || 30}
                onChange={(e) => handleStreamSpeedChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{t('slow')}</span>
                <span>{t('fast')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}