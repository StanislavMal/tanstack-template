// 📄 components/SettingsDialog.tsx
import { useState, useEffect } from 'react'
import { PlusCircle, Trash2 } from 'lucide-react'
import { usePrompts, useSettings } from '../store/hooks' // Импортируем новые хуки
import { actions, type UserSettings } from '../store' // Нужны actions для мгновенного обновления UI

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [promptForm, setPromptForm] = useState({ name: '', content: '' })
  const [isAddingPrompt, setIsAddingPrompt] = useState(false)

  // --- ИЗМЕНЕНИЯ: Используем новые хуки ---
  const { prompts, createPrompt, deletePrompt, setPromptActive, loadPrompts } = usePrompts();
  const { settings, updateSettings, loadSettings } = useSettings();

  // Загружаем данные при открытии диалога
  useEffect(() => {
    if (isOpen) {
      loadPrompts();
      loadSettings();
    }
  }, [isOpen, loadPrompts, loadSettings]);

  const handleAddPrompt = async () => {
    if (!promptForm.name.trim() || !promptForm.content.trim()) return
    await createPrompt(promptForm.name, promptForm.content)
    setPromptForm({ name: '', content: '' })
    setIsAddingPrompt(false)
  }

  const handleClose = () => {
    onClose()
    setIsAddingPrompt(false)
    setPromptForm({ name: '', content: '' })
  }

  // --- ИЗМЕНЕНИЕ: Ждем загрузки настроек ---
  if (!isOpen || !settings) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => {
      if (e.target === e.currentTarget) handleClose()
    }}>
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">Settings</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-white focus:outline-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="space-y-6">
            {/* --- НОВЫЙ БЛОК: ОБЩИЕ НАСТРОЙКИ --- */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">General Settings</h3>
                <div className="p-3 rounded-lg bg-gray-700/50">
                <label htmlFor="model-select" className="block text-sm font-medium text-gray-300 mb-2">AI Model</label>
                <select
                    id="model-select"
                    value={settings.model}
                    onChange={(e) => updateSettings({ model: e.target.value as UserSettings['model'] })}
                    className="w-full px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Cost-Effective)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced & Powerful)</option>
                </select>
                </div>
                <div className="p-3 rounded-lg bg-gray-700/50">
                <label htmlFor="system-instruction" className="block text-sm font-medium text-gray-300 mb-2">System Instruction</label>
                <textarea
                    id="system-instruction"
                    value={settings.system_instruction}
                    onChange={(e) => actions.setSettings({ ...settings, system_instruction: e.target.value })}
                    onBlur={(e) => updateSettings({ system_instruction: e.target.value })}
                    placeholder="e.g., You are a helpful assistant that speaks like a pirate."
                    className="w-full h-32 px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-400 mt-1">This is the base instruction for the AI. An active prompt (if any) will be added to this.</p>
                </div>
            </div>

            {/* Prompts Management */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Custom Prompts</h3>
                <button onClick={() => setIsAddingPrompt(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <PlusCircle className="w-4 h-4" /> Add Prompt
                </button>
              </div>

              {isAddingPrompt && ( /* ...форма добавления промпта без изменений в JSX... */
                <div className="p-3 mb-4 space-y-3 rounded-lg bg-gray-700/50">
                  <input type="text" value={promptForm.name} onChange={(e) => setPromptForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Prompt name..." className="w-full px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                  <textarea value={promptForm.content} onChange={(e) => setPromptForm(prev => ({ ...prev, content: e.target.value }))} placeholder="Enter prompt content..." className="w-full h-32 px-3 py-2 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsAddingPrompt(false)} className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white focus:outline-none">Cancel</button>
                    <button onClick={handleAddPrompt} className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500">Save Prompt</button>
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
              <p className="text-xs text-gray-400">Manage custom prompts. Activating one will automatically deactivate others.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}