// 📄 src/components/Header.tsx

import { Settings, Menu, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { ModelSelector } from './ModelSelector';

interface HeaderProps {
  onMenuClick: () => void;
  onSettingsClick: () => void;
  onLogout: () => void;
  isMobile?: boolean;
}

export const Header = memo(({ onMenuClick, onSettingsClick, onLogout, isMobile }: HeaderProps) => {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <header className="flex-shrink-0 h-16 bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-between px-4 border-b border-gray-700">
        <button 
          onClick={onMenuClick} 
          className="p-2 text-white rounded-lg hover:bg-gray-700"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="flex-1 flex justify-center px-2">
          <ModelSelector />
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onLogout} 
            className="p-2 text-white rounded-lg hover:bg-gray-700"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <button 
            onClick={onSettingsClick} 
            className="flex items-center justify-center w-9 h-9 text-white rounded-full bg-gradient-to-r from-orange-500 to-red-600"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">      
      <ModelSelector />

      <div className="flex gap-2 items-center">
        <button 
          onClick={onLogout} 
          className="px-3 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600 flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          {t('logout')}
        </button>
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