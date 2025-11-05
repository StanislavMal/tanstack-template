// 📄 src/components/SettingsDialog.tsx
import { useState, useEffect, useRef } from 'react'
import { PlusCircle, Trash2, Edit2, HelpCircle } from 'lucide-react'
import { usePrompts, useSettings } from '../store/hooks'
import { type UserSettings } from '../store'
import { useTranslation } from 'react-i18next'
import { validatePromptName, validatePromptContent, sanitizeString } from '../utils/validation'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

function InfoTooltip({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={tooltipRef} className="group relative inline-block ml-1.5">
      <HelpCircle 
        className="w-4 h-4 text-gray-400 hover:text-orange-400 cursor-help transition-colors" 
        onClick={() => setIsOpen(!isOpen)}
      />
      <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 z-50 ${isOpen ? 'block' : 'hidden'} group-hover:block`}>
        <div className="bg-gray-900 text-gray-200 text-xs rounded-lg py-2 px-3 shadow-xl border border-gray-700">
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-700"></div>
        </div>
      </div>
    </div>
  )
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { t, i18n } = useTranslation(); 
  const [promptForm, setPromptForm] = useState({ name: '', content: '' })
  const [isAddingPrompt, setIsAddingPrompt] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [editingPromptForm, setEditingPromptForm] = useState({ name: '', content: '' })

  const { prompts, createPrompt, updatePrompt, deletePrompt, setPromptActive, loadPrompts } = usePrompts();
  const { settings, updateSettings, loadSettings } = useSettings();

  const [localSettings, setLocalSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPrompts();
      loadSettings();
    }
  }, [isOpen, loadPrompts, loadSettings]);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleAddPrompt = async () => {
    setValidationError(null);
    
    const nameValidation = validatePromptName(promptForm.name);
    if (!nameValidation.isValid) {
      setValidationError(nameValidation.error!);
      return;
    }
    
    const contentValidation = validatePromptContent(promptForm.content);
    if (!contentValidation.isValid) {
      setValidationError(contentValidation.error!);
      return;
    }
    
    const sanitizedName = sanitizeString(promptForm.name);
    const sanitizedContent = sanitizeString(promptForm.content);
    
    await createPrompt(sanitizedName, sanitizedContent);
    setPromptForm({ name: '', content: '' });
    setIsAddingPrompt(false);
    setValidationError(null);
  }

  const handleStartEditPrompt = (id: string, name: string, content: string) => {
    setEditingPromptId(id);
    setEditingPromptForm({ name, content });
    setValidationError(null);
  }

  const handleSaveEditPrompt = async () => {
    if (!editingPromptId) return;

    setValidationError(null);
    
    const nameValidation = validatePromptName(editingPromptForm.name);
    if (!nameValidation.isValid) {
      setValidationError(nameValidation.error!);
      return;
    }
    
    const contentValidation = validatePromptContent(editingPromptForm.content);
    if (!contentValidation.isValid) {
      setValidationError(contentValidation.error!);
      return;
    }
    
    const sanitizedName = sanitizeString(editingPromptForm.name);
    const sanitizedContent = sanitizeString(editingPromptForm.content);
    
    try {
      await updatePrompt(editingPromptId, sanitizedName, sanitizedContent);
      setEditingPromptId(null);
      setEditingPromptForm({ name: '', content: '' });
      setValidationError(null);
    } catch (error) {
      setValidationError('Failed to update prompt. Please try again.');
    }
  }

  const handleCancelEditPrompt = () => {
    setEditingPromptId(null);
    setEditingPromptForm({ name: '', content: '' });
    setValidationError(null);
  }

  const handleSaveChanges = () => {
    if (localSettings) {
      if (JSON.stringify(localSettings) !== JSON.stringify(settings)) {
          updateSettings(localSettings);
      }
    }
    onClose();
  };

  const handleClose = () => {
    setLocalSettings(settings);
    setValidationError(null);
    onClose()
    setIsAddingPrompt(false)
    setPromptForm({ name: '', content: '' })
    setEditingPromptId(null)
    setEditingPromptForm({ name: '', content: '' })
  }
  
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
  };

  if (!isOpen || !localSettings) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => {
      if (e.target === e.currentTarget) handleClose()
    }}>
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">{t('settings')}</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-white focus:outline-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="space-y-4">
            {/* ✅ Язык */}
            <div className="p-3 rounded-lg bg-gray-700/50">
              <label htmlFor="language-select" className="block text-sm font-medium text-gray-300 mb-2">{t('language')}</label>
              <select
                  id="language-select"
                  value={i18n.language}
                  onChange={handleLanguageChange}
                  className="w-full px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                  <option value="en">English</option>
                  <option value="ru">Русский</option>
              </select>
            </div>

            {/* ✅ Скорость печати */}
            <div className="p-3 rounded-lg bg-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <label htmlFor="stream-speed" className="block text-sm font-medium text-gray-300">
                    {t('streamSpeed')}
                  </label>
                  <InfoTooltip text={t('streamSpeedNote')} />
                </div>
                <span className="text-sm text-orange-400 font-semibold">
                  {localSettings.streamSpeed || 30} {t('streamSpeedUnit')}
                </span>
              </div>
              <input
                id="stream-speed"
                type="range"
                min="10"
                max="500"
                step="10"
                value={localSettings.streamSpeed || 30}
                onChange={(e) => setLocalSettings(prev => prev ? { ...prev, streamSpeed: parseInt(e.target.value) } : null)}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{t('slow')}</span>
                <span>{t('fast')}</span>
              </div>
            </div>

            {/* ✅ Системная инструкция */}
            <div className="p-3 rounded-lg bg-gray-700/50">
              <div className="flex items-center mb-2">
                <label htmlFor="system-instruction" className="block text-sm font-medium text-gray-300">
                  {t('systemInstruction')}
                </label>
                <InfoTooltip text={t('systemInstructionNote')} />
              </div>
              <textarea
                  id="system-instruction"
                  value={localSettings.system_instruction}
                  onChange={(e) => setLocalSettings(prev => prev ? { ...prev, system_instruction: e.target.value } : null)}
                  placeholder={t('systemInstructionPlaceholder')}
                  className="w-full h-20 px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
              />
            </div>

            {/* ✅ Кастомные промпты */}
            <div className="p-3 rounded-lg bg-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-gray-300">
                    {t('customPrompts')}
                  </label>
                  <InfoTooltip text={t('promptsNote')} />
                </div>
                <button 
                  onClick={() => setIsAddingPrompt(true)} 
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <PlusCircle className="w-4 h-4" /> 
                  {t('addPrompt')}
                </button>
              </div>

              {/* Форма добавления промпта */}
              {isAddingPrompt && (
                <div className="mb-3 space-y-3 p-3 rounded-lg bg-gray-800/50 border border-gray-600">
                  <input 
                    type="text" 
                    value={promptForm.name} 
                    onChange={(e) => setPromptForm(prev => ({ ...prev, name: e.target.value }))} 
                    placeholder={t('promptNamePlaceholder')} 
                    className="w-full px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500" 
                  />
                  <textarea 
                    value={promptForm.content} 
                    onChange={(e) => setPromptForm(prev => ({ ...prev, content: e.target.value }))} 
                    placeholder={t('promptContentPlaceholder')} 
                    className="w-full h-32 px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500" 
                  />
                  
                  {validationError && (
                    <p className="text-sm text-red-400">{validationError}</p>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => { setIsAddingPrompt(false); setValidationError(null); }} 
                      className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white focus:outline-none"
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      onClick={handleAddPrompt} 
                      className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {t('savePrompt')}
                    </button>
                  </div>
                </div>
              )}

              {/* Список промптов */}
              <div className="space-y-2">
                {prompts.map((prompt) => (
                  <div key={prompt.id}>
                    {editingPromptId === prompt.id ? (
                      <div className="p-3 space-y-3 rounded-lg bg-gray-800/50 border-2 border-orange-500">
                        <input 
                          type="text" 
                          value={editingPromptForm.name} 
                          onChange={(e) => setEditingPromptForm(prev => ({ ...prev, name: e.target.value }))} 
                          placeholder={t('promptNamePlaceholder')} 
                          className="w-full px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500" 
                          autoFocus
                        />
                        <textarea 
                          value={editingPromptForm.content} 
                          onChange={(e) => setEditingPromptForm(prev => ({ ...prev, content: e.target.value }))} 
                          placeholder={t('promptContentPlaceholder')} 
                          className="w-full h-32 px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500" 
                        />
                        
                        {validationError && (
                          <p className="text-sm text-red-400">{validationError}</p>
                        )}
                        
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={handleCancelEditPrompt} 
                            className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white focus:outline-none"
                          >
                            {t('cancel')}
                          </button>
                          <button 
                            onClick={handleSaveEditPrompt} 
                            className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            {t('savePrompt')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/50 border border-gray-600">
                        <div className="flex-1 min-w-0 mr-3">
                          <h4 className="text-sm font-medium text-white truncate">{prompt.name}</h4>
                          <p className="text-xs text-gray-400 truncate">{prompt.content}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={prompt.is_active} 
                              onChange={() => setPromptActive(prompt.id, !prompt.is_active)} 
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                          </label>
                          <button 
                            onClick={() => handleStartEditPrompt(prompt.id, prompt.name, prompt.content)} 
                            className="p-1 text-gray-400 hover:text-orange-500"
                            title={t('editPrompt')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deletePrompt(prompt.id)} 
                            className="p-1 text-gray-400 hover:text-red-500" 
                            title={t('deletePrompt')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white focus:outline-none">{t('cancel')}</button>
            <button onClick={handleSaveChanges} className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500">{t('saveAndClose')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}