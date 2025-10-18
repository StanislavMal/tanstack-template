// 📄 src/components/Sidebar.tsx

// -> ИЗМЕНЕНИЕ: Убираем неиспользуемые ChevronsLeft и ChevronsRight
import { PlusCircle, MessageCircle, Trash2, Edit2, X } from 'lucide-react';

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

  // Если панель свернута на десктопе, не рендерим ничего
  // Это предотвращает рендер контента, когда панель имеет нулевую ширину
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

      <div className="flex-1 overflow-y-auto">
        {conversations.map((chat) => (
          <div
            key={chat.id}
            className={`group flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-700/50 ${
              chat.id === currentConversationId ? 'bg-gray-700/50' : ''
            }`}
            onClick={() => setCurrentConversationId(chat.id)}
          >
            <MessageCircle className="w-4 h-4 text-gray-400" />
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
            <div className="items-center hidden gap-1 group-hover:flex">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingChatId(chat.id)
                  setEditingTitle(chat.title)
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteChat(chat.id)
                }}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};