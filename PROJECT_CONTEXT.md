
# Project Structure
📄 .env.example
📁 .vscode/
└── 📄 settings.json
📄 app.config.ts
📄 netlify.toml
📄 package.json
📄 postcss.config.ts
📁 public/
├── 📄 favicon.ico (binary)
├── 📄 logo192.png (binary)
├── 📄 logo512.png (binary)
├── 📄 manifest.json
└── 📄 robots.txt
📄 renovate.json
📁 src/
├── 📄 api.ts
├── 📄 client.tsx
├── 📁 components/
│   ├── 📄 ChatInput.tsx
│   ├── 📄 ChatMessage.tsx
│   ├── 📄 index.ts
│   ├── 📄 LoadingIndicator.tsx
│   ├── 📄 SettingsDialog.tsx
│   ├── 📄 Sidebar.tsx
│   └── 📄 WelcomeScreen.tsx
├── 📄 convex.tsx
├── 📁 providers/
│   └── 📄 AuthProvider.tsx
├── 📄 router.tsx
├── 📁 routes/
│   ├── 📄 index.tsx
│   ├── 📄 login.tsx
│   ├── 📄 signup.tsx
│   └── 📄 __root.tsx
├── 📄 routeTree.gen.ts
├── 📄 sentry.ts
├── 📄 ssr.tsx
├── 📁 store/
│   ├── 📄 hooks.ts
│   ├── 📄 index.ts
│   └── 📄 store.ts
├── 📄 styles.css
└── 📁 utils/
    ├── 📄 ai.ts
    ├── 📄 index.ts
    └── 📄 supabase.ts
📄 tsconfig.json
📄 vite.config.js


# Project Configuration
📄 .env.example
--- BEGIN .env.example ---
# Server-side AI key (never exposed to browser)
GEMINI_API_KEY=your_gemini_api_key_here

# Client-side Supabase keys
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Sentry
VITE_SENTRY_DSN=your-sentry-dsn-here
SENTRY_AUTH_TOKEN=your-sentry-auth-token-here

#Important! Never commit your `.env` file to version control as it contains sensitive information.


--- END .env.example ---

📄 app.config.ts
--- BEGIN app.config.ts ---
import { defineConfig } from '@tanstack/react-start/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  tsr: {
    appDirectory: 'src',
  },
  server: {
    preset: 'netlify-edge',
  },
  vite: {
    plugins: [
      // this is the plugin that enables path aliases
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
})

--- END app.config.ts ---

📄 netlify.toml
--- BEGIN netlify.toml ---
[template.environment]
VITE_ANTHROPIC_API_KEY="Add your Anthropic API key here"
--- END netlify.toml ---

📄 package.json
{
  "name": "tanstack-chat-template",
  "scripts": {
  "start": "vinxi start",
  "build": "vinxi build",
  "serve": "vite preview",
  "dev": "vinxi dev"
},
  "dependencies": [
  "@google/generative-ai",
  "@sentry/react",
  "@supabase/supabase-js",
  "@tailwindcss/postcss",
  "@tailwindcss/vite",
  "@tanstack/react-router",
  "@tanstack/react-start",
  "@tanstack/react-store",
  "lucide-react",
  "react",
  "react-dom",
  "react-markdown",
  "react-resizable-panels",
  "tailwindcss"
],
  "devDependencies": [
  "@vitejs/plugin-react",
  "typescript",
  "vite"
]
}

📄 postcss.config.ts
--- BEGIN postcss.config.ts ---
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

--- END postcss.config.ts ---

📄 renovate.json
// Файл renovate.json (содержимое пропущено для экономии места)

📄 tsconfig.json
// Файл tsconfig.json (содержимое пропущено для экономии места)

📄 vite.config.js
--- BEGIN vite.config.js ---
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const basePlugins = [
  TanStackRouterVite({ autoCodeSplitting: true }), 
  viteReact(), 
  tailwindcss(),
];

// Add Sentry plugin only if auth token is available
if (process.env.SENTRY_AUTH_TOKEN) {
  basePlugins.push(
    sentryVitePlugin({
      org: "org-name",
      project: "project-name",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: basePlugins,
  build: {
    // Only generate source maps if Sentry is enabled
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
  },
});

--- END vite.config.js ---



# Source Code Architecture
📄 api.ts
--- BEGIN api.ts ---
import {
  createStartAPIHandler,
  defaultAPIFileRouteHandler,
} from '@tanstack/react-start/api'

export default createStartAPIHandler(defaultAPIFileRouteHandler)
--- END api.ts ---

📄 client.tsx
--- BEGIN client.tsx ---
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start'
import * as Sentry from '@sentry/react'

import { createRouter } from './router'
import { initSentry } from './sentry'

// Initialize Sentry (will be skipped if DSN is not defined)
initSentry()

const router = createRouter()

// Check if Sentry DSN is defined before creating error boundary
const AppComponent = process.env.SENTRY_DSN
  ? Sentry.withErrorBoundary(StartClient, {
      fallback: () => <div>An error has occurred. Our team has been notified.</div>,
    })
  : StartClient

hydrateRoot(document, <AppComponent router={router} />)

--- END client.tsx ---

📁 components/
  📄 ChatInput.tsx
  --- BEGIN ChatInput.tsx ---
// 📄 src/components/ChatInput.tsx

import { Send } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}

export const ChatInput = ({ 
  input, 
  setInput, 
  handleSubmit, 
  isLoading 
}: ChatInputProps) => (
  <div className="bg-gray-900/80 backdrop-blur-sm border-t border-orange-500/10 p-4">
    <form onSubmit={handleSubmit}>
      <div className="relative flex items-center">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="Напишите что-нибудь умное..."
          className="w-full pl-4 pr-12 py-2.5 overflow-y-auto text-sm text-white placeholder-gray-400 border rounded-lg shadow-lg resize-none border-orange-500/20 bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
          rows={1}
          style={{ maxHeight: '200px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = (target.scrollHeight) + 'px'
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute p-2 text-orange-500 transition-colors right-3 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  </div>
);
  --- END ChatInput.tsx ---

  📄 ChatMessage.tsx
  --- BEGIN ChatMessage.tsx ---
// 📄 src/components/ChatMessage.tsx

import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import type { Message } from '../utils/ai'

export const ChatMessage = ({ message }: { message: Message }) => {
  const isAssistant = message.role === 'assistant';

  return (
    // -> ИЗМЕНЕНИЕ: Внешний div-обертка для выравнивания пузыря влево или вправо
    <div className={`flex w-full ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      
      {/* -> ИЗМЕНЕНИЕ: Сам "пузырь" сообщения */}
      <div
        className={`rounded-lg px-4 py-2 ${
          // -> ИЗМЕНЕНИЕ: Правильные цвета и ширина
          isAssistant
            ? 'bg-gradient-to-r from-orange-500/5 to-red-600/5' // AI: Оригинальный градиент, вся доступная ширина
            : 'bg-gray-700/50 max-w-2xl'                          // User: Серый, ограниченная ширина
        }`}
        // -> ИЗМЕНЕНИЕ: Добавляем overflow: 'hidden', чтобы скругленные углы обрезали внутренний контент, например, таблицы
        style={{ overflow: 'hidden' }}
      >
        <ReactMarkdown
          className="prose dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-pre:bg-gray-800/50 prose-pre:overflow-x-auto prose-pre:p-4 prose-pre:rounded-md"
          rehypePlugins={[
            rehypeRaw,
            rehypeSanitize,
            rehypeHighlight,
          ]}
        >
          {message.content}
        </ReactMarkdown>
      </div>

    </div>
  );
};
  --- END ChatMessage.tsx ---

  📄 index.ts
  --- BEGIN index.ts ---
export { ChatMessage } from './ChatMessage';
export { LoadingIndicator } from './LoadingIndicator';
export { ChatInput } from './ChatInput';
export { Sidebar } from './Sidebar';
export { WelcomeScreen } from './WelcomeScreen';
export { SettingsDialog } from './SettingsDialog'; 
  --- END index.ts ---

  📄 LoadingIndicator.tsx
  --- BEGIN LoadingIndicator.tsx ---
export const LoadingIndicator = () => (
  <div className="px-6 py-6 bg-gradient-to-r from-orange-500/5 to-red-600/5">
    <div className="flex items-start w-full max-w-3xl gap-4 mx-auto">
      <div className="relative flex-shrink-0 w-8 h-8">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 animate-[spin_2s_linear_infinite]"></div>
        <div className="absolute inset-[2px] rounded-lg bg-gray-900 flex items-center justify-center">
          <div className="relative flex items-center justify-center w-full h-full rounded-lg bg-gradient-to-r from-orange-500 to-red-600">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 animate-pulse"></div>
            <span className="relative z-10 text-sm font-medium text-white">
              AI
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-lg font-medium text-gray-400">
          Thinking
        </div>
        <div className="flex gap-2">
          <div
            className="w-2 h-2 rounded-full bg-orange-500 animate-[bounce_0.8s_infinite]"
            style={{ animationDelay: '0ms' }}
          ></div>
          <div
            className="w-2 h-2 rounded-full bg-orange-500 animate-[bounce_0.8s_infinite]"
            style={{ animationDelay: '200ms' }}
          ></div>
          <div
            className="w-2 h-2 rounded-full bg-orange-500 animate-[bounce_0.8s_infinite]"
            style={{ animationDelay: '400ms' }}
          ></div>
        </div>
      </div>
    </div>
  </div>
); 
  --- END LoadingIndicator.tsx ---

  📄 SettingsDialog.tsx
  --- BEGIN SettingsDialog.tsx ---
// 📄 components/SettingsDialog.tsx
import { useState, useEffect } from 'react'
import { PlusCircle, Trash2 } from 'lucide-react'
import { usePrompts, useSettings } from '../store/hooks'
import { type UserSettings } from '../store'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [promptForm, setPromptForm] = useState({ name: '', content: '' })
  const [isAddingPrompt, setIsAddingPrompt] = useState(false)

  const { prompts, createPrompt, deletePrompt, setPromptActive, loadPrompts } = usePrompts();
  const { settings, updateSettings, loadSettings } = useSettings();

  // Локальное состояние для полей формы, чтобы избежать "мерцания"
  const [localSettings, setLocalSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Загружаем актуальные данные из БД при каждом открытии диалога
      loadPrompts();
      loadSettings();
    }
  }, [isOpen, loadPrompts, loadSettings]);

  // Синхронизируем локальное состояние с глобальным, когда оно загрузится или обновится
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleAddPrompt = async () => {
    if (!promptForm.name.trim() || !promptForm.content.trim()) return
    await createPrompt(promptForm.name, promptForm.content)
    setPromptForm({ name: '', content: '' })
    setIsAddingPrompt(false)
  }

  // Сохраняем все изменения и закрываем окно
  const handleSaveChanges = () => {
    if (localSettings) {
      // Сравниваем, были ли изменения, чтобы не делать лишних запросов к API
      if (JSON.stringify(localSettings) !== JSON.stringify(settings)) {
          updateSettings(localSettings);
      }
    }
    onClose();
  };

  // Закрываем окно, не сохраняя изменения
  const handleClose = () => {
    // Сбрасываем локальные изменения на те, что сейчас в глобальном сторе
    setLocalSettings(settings);
    onClose()
    setIsAddingPrompt(false)
    setPromptForm({ name: '', content: '' })
  }

  // Не рендерим компонент, пока данные не загружены и не синхронизированы
  if (!isOpen || !localSettings) return null;

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
            {/* Общие настройки */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">General Settings</h3>
                <div className="p-3 rounded-lg bg-gray-700/50">
                  <label htmlFor="model-select" className="block text-sm font-medium text-gray-300 mb-2">AI Model</label>
                  <select
                      id="model-select"
                      value={localSettings.model}
                      // Обновляем локальное состояние, а не глобальное
                      onChange={(e) => setLocalSettings(prev => prev ? { ...prev, model: e.target.value as UserSettings['model'] } : null)}
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
                      value={localSettings.system_instruction}
                      // Обновляем локальное состояние, а не глобальное
                      onChange={(e) => setLocalSettings(prev => prev ? { ...prev, system_instruction: e.target.value } : null)}
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

              {isAddingPrompt && (
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
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white focus:outline-none">Cancel</button>
            <button onClick={handleSaveChanges} className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500">Save & Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
  --- END SettingsDialog.tsx ---

  📄 Sidebar.tsx
  --- BEGIN Sidebar.tsx ---
// 📄 src/components/Sidebar.tsx

import { PlusCircle, MessageCircle, Trash2, Edit2, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface SidebarProps {
  conversations: Array<{ id: string; title: string }>;
  currentConversationId: string | null;
  handleNewChat: () => void;
  setCurrentConversationId: (id: string) => void;
  handleDeleteChat: (id: string) => void;
  editingChatId: string | null;
  setEditingChatId: (id: string | null) => void;
  editingTitle: string;
  setEditingTitle: (title: string) => void;
  handleUpdateChatTitle: (id: string, title: string) => void;
  isOpen: boolean; // Для мобильных
  setIsOpen: (isOpen: boolean) => void; // Для мобильных
  isCollapsed: boolean; // Для десктопа
}

export const Sidebar = ({ 
  conversations, 
  currentConversationId, 
  handleNewChat, 
  setCurrentConversationId, 
  handleDeleteChat, 
  editingChatId, 
  setEditingChatId, 
  editingTitle, 
  setEditingTitle, 
  handleUpdateChatTitle,
  isOpen,
  setIsOpen,
  isCollapsed,
}: SidebarProps) => {

  const [contextMenuChatId, setContextMenuChatId] = useState<string | null>(null);
  // -> ИЗМЕНЕНИЕ: Добавляем тип и начальное значение null
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);


  const handleTouchStart = (chatId: string) => {
    if (contextMenuChatId !== chatId) {
      setContextMenuChatId(null);
    }
    
    longPressTimer.current = setTimeout(() => {
      setContextMenuChatId(chatId);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <div className={`
      w-full h-full bg-gray-800 border-r border-gray-700 flex flex-col
      md:relative
      fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
    `}>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <button
          onClick={handleNewChat}
          className="flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90"
        >
          <PlusCircle className="w-4 h-4" />
          New Chat
        </button>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1 ml-2 text-gray-400 rounded-full md:hidden hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" onTouchMove={handleTouchEnd}>
        {conversations.map((chat) => {
            const showMobileMenu = contextMenuChatId === chat.id;

            return (
              <div
                key={chat.id}
                className={`group flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-gray-700/50 ${
                  chat.id === currentConversationId ? 'bg-gray-700/50' : ''
                }`}
                onClick={() => {
                  if (contextMenuChatId) {
                    setContextMenuChatId(null);
                    return; 
                  }
                  setCurrentConversationId(chat.id);
                }}
                onTouchStart={() => handleTouchStart(chat.id)}
                onTouchEnd={handleTouchEnd}
              >
                <div className="flex items-center flex-1 min-w-0 gap-3">
                  <MessageCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {editingChatId === chat.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => {
                        if (editingTitle.trim()) {
                          handleUpdateChatTitle(chat.id, editingTitle)
                        }
                        setEditingChatId(null)
                        setEditingTitle('')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editingTitle.trim()) {
                          handleUpdateChatTitle(chat.id, editingTitle)
                        } else if (e.key === 'Escape') {
                          setEditingChatId(null)
                          setEditingTitle('')
                        }
                      }}
                      className="flex-1 text-sm text-white bg-transparent focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 text-sm text-gray-300 truncate">
                      {chat.title}
                    </span>
                  )}
                </div>

                <div className={`
                    items-center gap-1
                    md:group-hover:flex ${showMobileMenu ? 'flex' : 'hidden'}
                `}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingChatId(chat.id);
                        setEditingTitle(chat.title);
                        setContextMenuChatId(null);
                      }}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                        setContextMenuChatId(null);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                </div>
              </div>
            )
        })}
      </div>
    </div>
  );
};
  --- END Sidebar.tsx ---

  📄 WelcomeScreen.tsx
  --- BEGIN WelcomeScreen.tsx ---
// 📄 src/components/WelcomeScreen.tsx

export const WelcomeScreen = () => (
  <div className="w-full max-w-3xl mx-auto text-center px-4">
    <h1 className="mb-4 text-5xl md:text-6xl font-bold text-transparent uppercase bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text">
      <span className="text-white">AI</span> Chat
    </h1>
    <p className="w-full md:w-2/3 mx-auto mb-6 text-lg text-gray-400">
      Вы можете спросить меня о чем угодно, у меня может быть хороший ответ,
       а может и не быть, но вы все равно можете спросить.
    </p>
  </div>
);
  --- END WelcomeScreen.tsx ---

📄 convex.tsx
--- BEGIN convex.tsx ---
import type { ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Get the Convex URL from environment variables
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

// Initialize the Convex client only if URL is provided
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // If no Convex URL is provided, just render the children without the ConvexProvider
  if (!convex) {
    console.warn('No Convex URL provided. Skipping Convex integration.');
    return <>{children}</>;
  }
  
  // Otherwise, wrap children with ConvexProvider
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
--- END convex.tsx ---

📁 providers/
  📄 AuthProvider.tsx
  --- BEGIN AuthProvider.tsx ---
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    );

    // Получаем начальную сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
  --- END AuthProvider.tsx ---

📄 router.tsx
--- BEGIN router.tsx ---
// 📄 src/router.tsx

import { createRouter as createTanstackRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './styles.css'

// ++ НОВОЕ: Простой компонент для страницы 404
const NotFoundComponent = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
    <h1 className="text-6xl font-bold text-orange-500">404</h1>
    <p className="mt-4 text-2xl">Page Not Found</p>
    <a href="/" className="mt-8 px-4 py-2 text-white bg-orange-600 rounded hover:bg-orange-700">
      Go Home
    </a>
  </div>
);


// Create a new router instance
export const createRouter = () => {
  const router = createTanstackRouter({
    routeTree,
    scrollRestoration: true,
    // ++ НОВОЕ: Добавляем компонент 404 по умолчанию
    defaultNotFoundComponent: NotFoundComponent,
  })
  return router
}

const router = createRouter()

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
--- END router.tsx ---

📁 routes/
  📄 index.tsx
  --- BEGIN index.tsx ---
// 📄 src/routes/index.tsx

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Settings, Menu, AlertTriangle } from 'lucide-react'
import {
  SettingsDialog,
  ChatMessage,
  LoadingIndicator,
  ChatInput,
  Sidebar,
  WelcomeScreen,
} from '../components'
import { useConversations, usePrompts, useSettings, useAppState } from '../store'
import { genAIResponse, type Message } from '../utils'
import { supabase } from '../utils/supabase'
import { useAuth } from '../providers/AuthProvider'

import { Panel, PanelGroup, PanelResizeHandle, type PanelOnCollapse } from 'react-resizable-panels'


export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { throw redirect({ to: '/login' }) }
  },
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const { conversations, loadConversations, createNewConversation, updateConversationTitle, deleteConversation, addMessage, setCurrentConversationId, currentConversationId, currentConversation } = useConversations()
  const { isLoading, setLoading } = useAppState()
  const { settings, loadSettings } = useSettings()
  const { activePrompt, loadPrompts } = usePrompts()
  
  const [input, setInput] = useState('')
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  const mobileMessagesContainerRef = useRef<HTMLElement>(null);
  const desktopMessagesContainerRef = useRef<HTMLElement>(null);

  const [pendingMessage, setPendingMessage] = useState<Message | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);


  useEffect(() => {
    if (user) {
      loadConversations()
      loadPrompts()
      loadSettings()
    }
  }, [user, loadConversations, loadPrompts, loadSettings])

  const messages = useMemo(() => currentConversation?.messages || [], [currentConversation])
  
  const textQueueRef = useRef<string>('');
  const animationFrameRef = useRef<number | undefined>(undefined);
  const finalContentRef = useRef<string>(''); 

  useEffect(() => {
    const animatePrinting = () => {
      if (textQueueRef.current.length > 0) {
        const speed = 2;
        const charsToPrint = textQueueRef.current.substring(0, speed);
        textQueueRef.current = textQueueRef.current.substring(speed);

        setPendingMessage(prev => {
          if (prev) {
            const newContent = prev.content + charsToPrint;
            finalContentRef.current = newContent;
            return { ...prev, content: newContent };
          }
          return null;
        });
      }
      animationFrameRef.current = requestAnimationFrame(animatePrinting);
    };

    animationFrameRef.current = requestAnimationFrame(animatePrinting);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = mobileMessagesContainerRef.current || desktopMessagesContainerRef.current;
    if (container) {
        setTimeout(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }
}, []);
  
  useEffect(() => { scrollToBottom() }, [messages, pendingMessage, scrollToBottom])
  
  const createTitleFromInput = useCallback((text: string) => {
    const words = text.trim().split(/\s+/)
    const firstThreeWords = words.slice(0, 3).join(' ')
    return firstThreeWords + (words.length > 3 ? '...' : '')
  }, [])

  const processAIResponse = useCallback(
    async (userMessage: Message) => {
      if (!settings) {
        setError("User settings not loaded.");
        return null;
      }
      
      finalContentRef.current = ''; 
      const initialAssistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' };
      
      try {
        const response = await genAIResponse({
          data: {
            messages: [...messages, userMessage],
            model: settings.model,
            mainSystemInstruction: settings.system_instruction,
            activePromptContent: activePrompt?.content,
          },
        })

        if (!response.body) throw new Error('No response body');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let isFirstChunk = true;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const rawText = decoder.decode(value, { stream: true });
          rawText.replace(/}\{/g, '}\n{').split('\n').forEach((chunkStr) => {
            if (chunkStr) {
              try {
                const parsed = JSON.parse(chunkStr);
                if (parsed.text) {
                  if (isFirstChunk) {
                    setPendingMessage(initialAssistantMessage);
                    isFirstChunk = false;
                  }
                  textQueueRef.current += parsed.text;
                }
              } catch (e) { /* ignore */ }
            }
          })
        }
        
        await new Promise(resolve => {
            const interval = setInterval(() => {
                if (textQueueRef.current.length === 0) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 50);
        });
        
        return { ...initialAssistantMessage, content: finalContentRef.current };

      } catch (error) {
        console.error('Error in AI response:', error);
        setError('An error occurred while getting the AI response.');
        return null;
      }
    },
    [messages, settings, activePrompt],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      textQueueRef.current = '';
      finalContentRef.current = '';
      setPendingMessage(null);
      setError(null);

      const currentInput = input
      setInput('')
      setLoading(true)

      const conversationTitle = createTitleFromInput(currentInput)
      const userMessage: Message = { id: Date.now().toString(), role: 'user' as const, content: currentInput.trim() }

      let conversationId = currentConversationId;
      
      try {
        if (!conversationId) {
          const newConvId = await createNewConversation(conversationTitle)
          if (newConvId) conversationId = newConvId
        }
        
        if (!conversationId) throw new Error('Failed to create or find conversation ID.');

        await addMessage(conversationId, userMessage);
        
        const finalAiMessage = await processAIResponse(userMessage);
        
        if (finalAiMessage && finalAiMessage.content.trim()) {
            await addMessage(conversationId, finalAiMessage);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        console.error('Error in handleSubmit:', error)
        setError(errorMessage);
      } finally {
        setLoading(false)
        setPendingMessage(null);
      }
    },
    [
      input,
      isLoading,
      currentConversationId,
      createNewConversation,
      addMessage,
      processAIResponse,
      setLoading,
      createTitleFromInput,
    ],
  )

  const handleNewChat = useCallback(() => { setCurrentConversationId(null) }, [setCurrentConversationId])
  const handleDeleteChat = useCallback(async (id: string) => { await deleteConversation(id) }, [deleteConversation])
  const handleUpdateChatTitle = useCallback(async (id: string, title: string) => { await updateConversationTitle(id, title); setEditingChatId(null); setEditingTitle(''); }, [updateConversationTitle])
  const handleLogout = async () => { await supabase.auth.signOut(); navigate({ to: '/login' }) }

  const MainContent = () => (
    <div className="w-full h-full p-4">
        {error && (
            <div className="bg-red-500/10 border-l-4 border-red-500 text-red-300 p-4 mb-4 rounded-r-lg" role="alert">
                <div className="flex">
                    <div className="py-1"><AlertTriangle className="h-5 w-5 text-red-400 mr-3" /></div>
                    <div>
                        <p className="font-bold">An error occurred</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            </div>
        )}
        <div className="space-y-6">
          {currentConversationId ? (
              <>
                  {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
                  {pendingMessage && <ChatMessage message={pendingMessage} />}
                  {isLoading && (!pendingMessage || pendingMessage.content === '') && <LoadingIndicator />}
              </>
          ) : (
              <div className="flex h-full items-center justify-center pt-20 md:pt-0"><WelcomeScreen /></div>
          )}
        </div>
    </div>
  );


  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
        {/* Мобильная версия */}
        <div className="md:hidden h-full flex flex-col">
            {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div>}
            <Sidebar 
                {...{ 
                    conversations, 
                    currentConversationId, 
                    handleDeleteChat, 
                    editingChatId, 
                    setEditingChatId, 
                    editingTitle, 
                    setEditingTitle, 
                    handleUpdateChatTitle, 
                    isOpen: isSidebarOpen, 
                    setIsOpen: setIsSidebarOpen, 
                    isCollapsed: false,
                    handleNewChat: () => {
                        handleNewChat();
                        setIsSidebarOpen(false);
                    },
                    setCurrentConversationId: (id) => { 
                        setCurrentConversationId(id); 
                        setIsSidebarOpen(false); 
                    } 
                }} 
            />
            
            <div className="flex-1 flex flex-col relative min-h-0">
                <header className="absolute top-0 left-0 right-0 h-16 bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-between px-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white rounded-lg hover:bg-gray-700"><Menu className="w-6 h-6" /></button>
                    <div className="flex items-center gap-2">
                        <button onClick={handleLogout} className="px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600">Logout</button>
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center w-9 h-9 text-white rounded-full bg-gradient-to-r from-orange-500 to-red-600"><Settings className="w-5 h-5" /></button>
                    </div>
                </header>
                
                <main ref={mobileMessagesContainerRef} className="flex-1 pt-16 pb-4 overflow-y-auto">
                    <MainContent />
                </main>
                
                <footer className="w-full">
                    <ChatInput {...{ input, setInput, handleSubmit, isLoading }} />
                </footer>
            </div>
        </div>

        {/* Десктопная версия */}
        <div className="hidden md:flex h-full">
            <PanelGroup direction="horizontal">
                <Panel defaultSize={20} minSize={15} maxSize={30} collapsible={true} collapsedSize={0} onCollapse={setIsSidebarCollapsed as PanelOnCollapse} className="flex flex-col">
                    <Sidebar {...{ conversations, currentConversationId, handleNewChat, setCurrentConversationId, handleDeleteChat, editingChatId, setEditingChatId, editingTitle, setEditingTitle, handleUpdateChatTitle, isOpen: true, setIsOpen: () => {}, isCollapsed: isSidebarCollapsed }} />
                </Panel>
                <PanelResizeHandle className="w-2 bg-gray-800 hover:bg-orange-500/50 transition-colors duration-200 cursor-col-resize" />
                {/* -> ИЗМЕНЕНИЕ: ref убран с <Panel> */}
                <Panel className="flex-1 flex flex-col relative min-h-0">
                     <header className="absolute top-4 right-4 z-10 flex gap-2 items-center">
                        <button onClick={handleLogout} className="px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600">Logout</button>
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center w-10 h-10 text-white rounded-full bg-gradient-to-r from-orange-500 to-red-600"><Settings className="w-5 h-5" /></button>
                    </header>
                    
                    {/* -> ИЗМЕНЕНИЕ: ref теперь на <main> */}
                    <main ref={desktopMessagesContainerRef} className="flex-1 overflow-y-auto">
                        <div className="w-full max-w-5xl mx-auto">
                           <MainContent />
                        </div>
                    </main>
                    <footer className="w-full max-w-5xl mx-auto">
                         <ChatInput {...{ input, setInput, handleSubmit, isLoading }} />
                    </footer>
                </Panel>
            </PanelGroup>
        </div>
        <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
  --- END index.tsx ---

  📄 login.tsx
  --- BEGIN login.tsx ---
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '../utils/supabase'

export const Route = createFileRoute('/login')({
  component: LoginComponent,
})

function LoginComponent() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      navigate({ to: '/' })
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center">Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:bg-gray-500">
            {loading ? 'Logging in...' : 'Login'}
          </button>
          {error && <p className="text-red-500 text-center">{error}</p>}
        </form>
        <p className="text-center">
          Don't have an account?{' '}
          <Link to="/signup" className="text-orange-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
  --- END login.tsx ---

  📄 signup.tsx
  --- BEGIN signup.tsx ---
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '../utils/supabase'

export const Route = createFileRoute('/signup')({
  component: SignupComponent,
})

function SignupComponent() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Registration successful! Please login.')
      // navigate({ to: '/login' }) // Можно перенаправить сразу
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center">Sign Up</h2>
        <form onSubmit={handleSignup} className="space-y-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:bg-gray-500">
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
          {error && <p className="text-red-500 text-center">{error}</p>}
          {message && <p className="text-green-500 text-center">{message}</p>}
        </form>
        <p className="text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
  --- END signup.tsx ---

  📄 __root.tsx
  --- BEGIN __root.tsx ---
// 📄 src/routes/__root.tsx

import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AuthProvider } from '../providers/AuthProvider' 

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'AI Chat (Supabase & Gemini)' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: () => (
    <RootDocument>
      <Outlet />
      {/* -> ИЗМЕНЕНИЕ: Devtools теперь рендерится только в режиме разработки */}
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </RootDocument>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
  --- END __root.tsx ---

📄 routeTree.gen.ts
// Автогенерируемый файл TanStack Router
// Используемые маршруты: 

📄 sentry.ts
--- BEGIN sentry.ts ---
import * as Sentry from '@sentry/react';

export function initSentry() {
  // Skip Sentry initialization if DSN is not defined
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.log('Sentry DSN not found. Skipping Sentry initialization.');
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });
}
--- END sentry.ts ---

📄 ssr.tsx
--- BEGIN ssr.tsx ---
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { getRouterManifest } from '@tanstack/react-start/router-manifest'
import * as Sentry from '@sentry/react'

import { createRouter } from './router'
import { initSentry } from './sentry'

// Initialize Sentry in SSR context (will be skipped if DSN is not defined)
initSentry()

// Define a stream handler based on Sentry availability
let streamHandler = defaultStreamHandler;

// Only wrap with Sentry if DSN is available
if (process.env.SENTRY_DSN) {
  const originalHandler = defaultStreamHandler;
  
  streamHandler = async (options) => {
    try {
      return await originalHandler(options);
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  };
}

export default createStartHandler({
  createRouter,
  getRouterManifest,
})(streamHandler)

--- END ssr.tsx ---

📁 store/
  📄 hooks.ts
  --- BEGIN hooks.ts ---
// 📄 store/hooks.ts

import { useCallback } from 'react';
import { useStore } from '@tanstack/react-store';
import { actions, selectors, store, type Conversation, type Prompt, type UserSettings } from './store';
import type { Message } from '../utils/ai';
import { supabase } from '../utils/supabase';
import { useAuth } from '../providers/AuthProvider';

export function useSettings() {
    const { user } = useAuth();
    const settings = useStore(store, s => selectors.getSettings(s));

    const loadSettings = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
        if (error) console.error("Error loading settings:", error);
        if (data && data.settings) actions.setSettings(data.settings as UserSettings);
    }, [user]);

    const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
        if (!user || !settings) return;
        const updated = { ...settings, ...newSettings };
        actions.setSettings(updated);
        const { error } = await supabase.from('profiles').update({ settings: updated }).eq('id', user.id);
        if (error) {
            console.error("Error updating settings:", error);
            actions.setSettings(settings); 
        }
    }, [user, settings]);

    return { settings, loadSettings, updateSettings };
}

export function usePrompts() {
    const { user } = useAuth();
    const prompts = useStore(store, s => selectors.getPrompts(s));
    const activePrompt = useStore(store, s => selectors.getActivePrompt(s));

    const loadPrompts = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase.from('prompts').select('*').eq('user_id', user.id).order('created_at');
        if (error) console.error("Error loading prompts:", error);
        if (data) actions.setPrompts(data as Prompt[]);
    }, [user]);

    const createPrompt = useCallback(async (name: string, content: string) => {
        if (!user) return;
        const { error } = await supabase.from('prompts').insert({ name, content, user_id: user.id });
        if (error) console.error("Error creating prompt:", error);
        else await loadPrompts();
    }, [user, loadPrompts]);

    const deletePrompt = useCallback(async (id: string) => {
        if (!user) return;
        const { error } = await supabase.from('prompts').delete().eq('id', id);
        if (error) console.error("Error deleting prompt:", error);
        else await loadPrompts();
    }, [user, loadPrompts]);

    const setPromptActive = useCallback(async (id: string, isActive: boolean) => {
        if (!user) return;
        await supabase.from('prompts').update({ is_active: false }).eq('user_id', user.id);
        if (isActive) {
            await supabase.from('prompts').update({ is_active: true }).eq('id', id);
        }
        await loadPrompts();
    }, [user, loadPrompts]);
    
    return { prompts, activePrompt, loadPrompts, createPrompt, deletePrompt, setPromptActive };
}

export function useAppState() {
  const isLoading = useStore(store, s => selectors.getIsLoading(s));
  return {
    isLoading,
    setLoading: actions.setLoading
  };
}

export function useConversations() {
  const { user } = useAuth();
  const conversations = useStore(store, s => selectors.getConversations(s));
  const currentConversationId = useStore(store, s => selectors.getCurrentConversationId(s));
  const currentConversation = useStore(store, s => selectors.getCurrentConversation(s));

  const setCurrentConversationId = useCallback((id: string | null) => {
      actions.setCurrentConversationId(id);
  }, []);

  const loadConversations = useCallback(async () => {
      if (!user) return;
      const { data, error } = await supabase.from('conversations').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) { console.error('Error loading conversations:', error); return; }
      const formattedConversations = data.map(conv => ({ ...conv, messages: conv.messages || [] }));
      actions.setConversations(formattedConversations as Conversation[]);
  }, [user]);

  const createNewConversation = useCallback(async (title: string = 'New Conversation') => {
      if (!user) return null;
      const { data, error } = await supabase.from('conversations').insert({ title, messages: [], user_id: user.id }).select().single();
      if (error || !data) { console.error('Failed to create conversation in Supabase:', error); return null; }
      const newConversation: Conversation = { id: data.id, title: data.title, messages: data.messages || [] };
      actions.addConversation(newConversation);
      actions.setCurrentConversationId(newConversation.id);
      return newConversation.id;
  }, [user]);

  const updateConversationTitle = useCallback(async (id: string, title: string) => {
      actions.updateConversationTitle(id, title);
      const { error } = await supabase.from('conversations').update({ title }).eq('id', id);
      if (error) console.error('Failed to update title in Supabase:', error);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
      actions.deleteConversation(id);
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (error) console.error('Failed to delete conversation from Supabase:', error);
  }, []);
  
  // --- ВОЗВРАЩАЕМ `addMessage` К ПРОСТОМУ ВИДУ ---
  const addMessage = useCallback(async (conversationId: string, message: Message) => {
      const conversation = selectors.getConversations(store.state).find(c => c.id === conversationId);
      if (!conversation) return;
      
      // Просто добавляем сообщение в массив
      const updatedMessages = [...conversation.messages, message];
      
      // Оптимистично обновляем UI
      actions.addMessage(conversationId, message);

      // Отправляем обновленный массив в Supabase
      const { error } = await supabase.from('conversations').update({ messages: updatedMessages }).eq('id', conversationId);
      if (error) console.error('Failed to add message to Supabase:', error);
  }, []);


  return {
    conversations,
    currentConversationId,
    currentConversation,
    setCurrentConversationId,
    loadConversations,
    createNewConversation,
    updateConversationTitle,
    deleteConversation,
    addMessage,
  };
}
  --- END hooks.ts ---

  📄 index.ts
  --- BEGIN index.ts ---
export * from './store';
export * from './hooks'; 
  --- END index.ts ---

  📄 store.ts
  --- BEGIN store.ts ---
// 📄 store/store.ts
import { Store } from '@tanstack/store'
import type { Message } from '../utils/ai'

export interface Prompt {
  id: string
  name: string
  content: string
  is_active: boolean
}

export interface UserSettings {
  model: 'gemini-1.5-flash' | 'gemini-1.5-pro'
  system_instruction: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
}

export interface State {
  prompts: Prompt[]
  settings: UserSettings | null
  conversations: Conversation[]
  currentConversationId: string | null
  isLoading: boolean
}

const initialState: State = {
  prompts: [],
  settings: null,
  conversations: [],
  currentConversationId: null,
  isLoading: false
}

export const store = new Store<State>(initialState)

export const actions = {
  // --- НОВЫЙ ACTION ---
  updateMessageContent: (conversationId: string, messageId: string, content: string) => {
    store.setState(state => ({
      ...state,
      conversations: state.conversations.map(conv =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.map(msg =>
                msg.id === messageId ? { ...msg, content: content } : msg
              ),
            }
          : conv
      ),
    }));
  },
  
  // Остальные actions
  setSettings: (settings: UserSettings) => {
    store.setState(state => ({ ...state, settings }));
  },
  
  setPrompts: (prompts: Prompt[]) => {
    store.setState(state => ({ ...state, prompts }));
  },

  setConversations: (conversations: Conversation[]) => {
    store.setState(state => ({ ...state, conversations }))
  },

  setCurrentConversationId: (id: string | null) => {
    store.setState(state => ({ ...state, currentConversationId: id }))
  },

  addConversation: (conversation: Conversation) => {
    store.setState(state => ({
      ...state,
      conversations: [...state.conversations, conversation],
      currentConversationId: conversation.id
    }))
  },

  updateConversationTitle: (id: string, title: string) => {
    store.setState(state => ({
      ...state,
      conversations: state.conversations.map(conv =>
        conv.id === id ? { ...conv, title } : conv
      )
    }))
  },

  deleteConversation: (id: string) => {
    store.setState(state => ({
      ...state,
      conversations: state.conversations.filter(conv => conv.id !== id),
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId
    }))
  },

  addMessage: (conversationId: string, message: Message) => {
    store.setState(state => ({
      ...state,
      conversations: state.conversations.map(conv =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, message] }
          : conv
      )
    }))
  },

  setLoading: (isLoading: boolean) => {
    store.setState(state => ({ ...state, isLoading }))
  }
}

// Selectors
export const selectors = {
  getSettings: (state: State) => state.settings,
  getActivePrompt: (state: State) => state.prompts.find(p => p.is_active),
  getPrompts: (state: State) => state.prompts,
  getCurrentConversation: (state: State) => 
    state.conversations.find(c => c.id === state.currentConversationId),
  getConversations: (state: State) => state.conversations,
  getCurrentConversationId: (state: State) => state.currentConversationId,
  getIsLoading: (state: State) => state.isLoading
}
  --- END store.ts ---

📄 styles.css
--- BEGIN styles.css ---
@import "tailwindcss";
@import "highlight.js/styles/github-dark.css";

body {
  @apply m-0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
    "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New",
    monospace;
}

/* Custom scrollbar styles */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* Smooth transitions for dark mode */
html {
  transition: background-color 0.3s ease;
}

/* Markdown content styles */
.prose {
  max-width: none;
  color: #e5e7eb; /* text-gray-200 */
}

/* .prose p {
  margin-top: 1.25em;
  margin-bottom: 1.25em;
} */

.prose code {
  color: #e5e7eb;
  background-color: rgba(31, 41, 55, 0.5);
  padding: 0.2em 0.4em;
  border-radius: 0.375rem;
  font-size: 0.875em;
}

.prose pre {
  background-color: rgba(31, 41, 55, 0.5);
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1.25em 0;
  overflow-x: auto;
}

.prose pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  color: inherit;
}

.prose h1, .prose h2, .prose h3, .prose h4 {
  color: #f9fafb; /* text-gray-50 */
  /* margin-top: 2em; */
  /* margin-bottom: 1em; */
}

.prose ul, .prose ol {
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  padding-left: 1.625em;
}

.prose li {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.prose blockquote {
  border-left-color: #f97316; /* orange-500 */
  background-color: rgba(249, 115, 22, 0.1);
  padding: 1em;
  margin: 1.25em 0;
  border-radius: 0.5rem;
}

.prose hr {
  border-color: rgba(249, 115, 22, 0.2);
  margin: 2em 0;
}

.prose a {
  color: #f97316; /* orange-500 */
  text-decoration: underline;
  text-decoration-thickness: 0.1em;
  text-underline-offset: 0.2em;
}

.prose a:hover {
  color: #fb923c; /* orange-400 */
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.25em 0;
}

.prose th, .prose td {
  padding: 0.75em;
  border: 1px solid rgba(249, 115, 22, 0.2);
}

.prose th {
  background-color: rgba(249, 115, 22, 0.1);
  font-weight: 600;
}

/* Message transition animations */
.message-enter {
  opacity: 0;
  transform: translateY(10px);
}

.message-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms, transform 300ms;
}

.message-exit {
  opacity: 1;
}

.message-exit-active {
  opacity: 0;
  transition: opacity 300ms;
}

/* Add/update these styles to match AI formatting capabilities */
.prose h1 {
  font-size: 2em;
  /* margin-top: 1em; */
  margin-bottom: 0.5em;
}

.prose h2 {
  font-size: 1.5em;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.prose h3 {
  font-size: 1.25em;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.prose ul {
  list-style-type: disc;
  padding-left: 1.5em;
}

.prose ol {
  list-style-type: decimal;
  padding-left: 1.5em;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

.prose th,
.prose td {
  border: 1px solid rgba(249, 115, 22, 0.2);
  padding: 0.5em;
}

.prose th {
  background-color: rgba(249, 115, 22, 0.1);
}

.prose strong {
  color: #f9fafb; /* text-gray-50 */
  font-weight: 600;
}

.prose em {
  font-style: italic;
}

.prose blockquote {
  border-left: 4px solid #f97316; /* orange-500 */
  padding-left: 1em;
  margin: 1em 0;
  color: #d1d5db; /* text-gray-300 */
}

/* Ensure code blocks match the AI's formatting */
.prose code {
  color: #e5e7eb;
  background-color: rgba(31, 41, 55, 0.5);
  padding: 0.2em 0.4em;
  border-radius: 0.375rem;
  font-size: 0.875em;
}

.prose pre {
  background-color: rgba(31, 41, 55, 0.5);
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1em 0;
}

.prose pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}
--- END styles.css ---

📁 utils/
  📄 ai.ts
  --- BEGIN ai.ts ---
// 📄 src/utils/ai.ts

import { createServerFn } from '@tanstack/react-start'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'model' 
  content: string
}

export const genAIResponse = createServerFn({
  method: 'POST',
  response: 'raw'
})
  .validator(
    (d: {
      messages: Array<Message>
      model: string 
      mainSystemInstruction: string
      activePromptContent?: string
    }) => d,
  )
  .handler(async ({ data }) => { // ← ИСПОЛЬЗУЕМ `data`, А НЕ `body`
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: GEMINI_API_KEY is not defined in the server environment.');
      return new Response(JSON.stringify({ error: 'Missing API key on the server.' }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: data.model || "gemini-2.5-flash", // ← `data`
    });
    
    // Тип `msg` теперь будет выведен правильно из `data.messages`
    const history = data.messages.map((msg: Message) => ({ // ← `data` и явный тип для `msg`
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
    
    const lastMessage = history.pop();
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response(JSON.stringify({ error: 'The last message must be from the user.' }), { status: 400 });
    }
    const prompt = lastMessage.parts[0].text;

    const finalSystemInstruction = [
      data.mainSystemInstruction, // ← `data`
      data.activePromptContent   // ← `data`
    ].filter(Boolean).join('\n\n');
      
    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    try {
      const chat = model.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 8192,
        },
        safetySettings,
        systemInstruction: {
          role: 'system', 
          parts: [{ text: finalSystemInstruction }]
        }
      });
      
      const result = await chat.sendMessageStream(prompt);

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              const jsonChunk = JSON.stringify({ text: text });
              controller.enqueue(encoder.encode(jsonChunk));
            }
          }
          controller.close();
        },
      });

      return new Response(stream);
    } catch (error) {
      console.error('--- GEMINI API ERROR ---');
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return new Response(JSON.stringify({ error: `Failed to get AI response: ${errorMessage}` }), { status: 500 });
    }
  });
  --- END ai.ts ---

  📄 index.ts
  --- BEGIN index.ts ---
export * from './ai'; 
  --- END index.ts ---

  📄 supabase.ts
  --- BEGIN supabase.ts ---
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required.')
}

// Создаем и экспортируем клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
  --- END supabase.ts ---



# Public Assets
📄 favicon.ico (binary)
📄 logo192.png (binary)
📄 logo512.png (binary)
📄 manifest.json
// Файл manifest.json (содержимое пропущено для экономии места)

📄 robots.txt (skipped)

