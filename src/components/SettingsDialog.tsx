// 📄 src/components/SettingsDialog.tsx
import { useState, useEffect } from 'react'
import { PlusCircle, Trash2 } from 'lucide-react'
import { usePrompts, useSettings } from '../store/hooks'
import { type UserSettings } from '../store'
import { useTranslation } from 'react-i18next'
import { validatePromptName, validatePromptContent, sanitizeString } from '../utils/validation'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { t, i18n } = useTranslation(); 
  const [promptForm, setPromptForm] = useState({ name: '', content: '' })
  const [isAddingPrompt, setIsAddingPrompt] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const { prompts, createPrompt, deletePrompt, setPromptActive, loadPrompts } = usePrompts();
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
          
          <div className="space-y-6">
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">{t('generalSettings')}</h3>

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
                
                <div className="p-3 rounded-lg bg-gray-700/50">
                  <label htmlFor="model-select" className="block text-sm font-medium text-gray-300 mb-2">{t('aiModel')}</label>
                  <select
                      id="model-select"
                      value={localSettings.model}
                      onChange={(e) => setLocalSettings(prev => prev ? { ...prev, model: e.target.value as UserSettings['model'] } : null)}
                      className="w-full px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  >
                      <option value="gemini-2.5-flash">{t('modelFlash')}</option>
                      <option value="gemini-2.5-pro">{t('modelPro')}</option>
                  </select>
                </div>

                {/* ✅ НОВОЕ: Слайдер скорости стриминга */}
                <div className="p-3 rounded-lg bg-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="stream-speed" className="block text-sm font-medium text-gray-300">
                      {t('streamSpeed')}
                    </label>
                    <span className="text-sm text-orange-400 font-semibold">
                      {localSettings.streamSpeed || 30} {t('streamSpeedUnit')}
                    </span>
                  </div>
                  <input
                    id="stream-speed"
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={localSettings.streamSpeed || 30}
                    onChange={(e) => setLocalSettings(prev => prev ? { ...prev, streamSpeed: parseInt(e.target.value) } : null)}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{t('slow')}</span>
                    <span>{t('fast')}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{t('streamSpeedNote')}</p>
                </div>

                <div className="p-3 rounded-lg bg-gray-700/50">
                  <label htmlFor="system-instruction" className="block text-sm font-medium text-gray-300 mb-2">{t('systemInstruction')}</label>
                  <textarea
                      id="system-instruction"
                      value={localSettings.system_instruction}
                      onChange={(e) => setLocalSettings(prev => prev ? { ...prev, system_instruction: e.target.value } : null)}
                      placeholder={t('systemInstructionPlaceholder')}
                      className="w-full h-32 px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('systemInstructionNote')}</p>
                </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">{t('customPrompts')}</h3>
                <button onClick={() => setIsAddingPrompt(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <PlusCircle className="w-4 h-4" /> {t('addPrompt')}
                </button>
              </div>

              {isAddingPrompt && (
                <div className="p-3 mb-4 space-y-3 rounded-lg bg-gray-700/50">
                  <input type="text" value={promptForm.name} onChange={(e) => setPromptForm(prev => ({ ...prev, name: e.target.value }))} placeholder={t('promptNamePlaceholder')} className="w-full px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                  <textarea value={promptForm.content} onChange={(e) => setPromptForm(prev => ({ ...prev, content: e.target.value }))} placeholder={t('promptContentPlaceholder')} className="w-full h-32 px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                  
                  {validationError && (
                    <p className="text-sm text-red-400">{validationError}</p>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setIsAddingPrompt(false); setValidationError(null); }} className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white focus:outline-none">{t('cancel')}</button>
                    <button onClick={handleAddPrompt} className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500">{t('savePrompt')}</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {prompts.map((prompt) => (
                  <div key={prompt.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                    <div className="flex-1 min-w-0 mr-4">
                      <h4 className="text-sm font-medium text-white truncate">{prompt.name}</h4>
                      <p className="text-xs text-gray-400 truncate">{prompt.content}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={prompt.is_active} onChange={() => setPromptActive(prompt.id, !prompt.is_active)} />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                      <button onClick={() => deletePrompt(prompt.id)} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">{t('promptsNote')}</p>
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