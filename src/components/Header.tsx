// 📄 src/components/Header.tsx

import { Settings, Menu } from 'lucide-react';
import { memo } from 'react';
import { ModelSelector } from './ModelSelector';

interface HeaderProps {
  onMenuClick: () => void;
  onSettingsClick: () => void;
  onLogout: () => void;
  isMobile?: boolean;  
  onModelSelectorOpenChange?: (isOpen: boolean) => void;
}

export const Header = memo(({ onMenuClick, onSettingsClick, isMobile, onModelSelectorOpenChange }: HeaderProps) => {
  if (isMobile) {
    return (
      <header className="flex-shrink-0 h-16 bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-between px-4 border-b border-gray-700 gap-3">
        {/* Кнопка меню */}
        <button 
          onClick={onMenuClick} 
          className="flex-shrink-0 p-2 text-white rounded-lg hover:bg-gray-700"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex-1 min-w-0">
          <ModelSelector fullWidth onOpenChange={onModelSelectorOpenChange} />
        </div>

        {/* Кнопка настроек */}
        <button 
          onClick={onSettingsClick} 
          className="flex-shrink-0 flex items-center justify-center w-9 h-9 text-white rounded-full bg-gradient-to-r from-orange-500 to-red-600"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>
    );
  }

  // ✅ ИЗМЕНЕНИЕ: Убираем 'absolute' и 'z-10', добавляем отступы и flex-shrink
  return (
    <header className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
      <ModelSelector onOpenChange={onModelSelectorOpenChange} />

      <div className="flex gap-2 items-center">
        <button 
          onClick={onSettingsClick} 
          className="flex items-center justify-center w-10 h-10 text-white rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 transition-opacity"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';