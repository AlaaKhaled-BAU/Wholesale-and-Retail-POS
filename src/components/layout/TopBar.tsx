import { Bell, Settings, Globe, Search, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';

interface TopBarProps {
  isSidebarOpen: boolean;
  onMenuClick: () => void;
}

export default function TopBar({ isSidebarOpen, onMenuClick }: TopBarProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const MenuIcon = isSidebarOpen ? PanelRightOpen : PanelRightClose;

  return (
    <header className="bg-white border-b border-[#e2e1ec] shadow-sm flex justify-between items-center px-6 h-20 w-full z-40 sticky top-0">
      {/* Right section — Toggle + Brand */}
      <div className="flex items-center gap-4">
        {/* Sidebar Toggle */}
        <button
          onClick={onMenuClick}
          className={cn(
            'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-[#f4f2fd] active:scale-95',
            isSidebarOpen ? 'text-primary-700 bg-primary-50' : 'text-[#555f70]'
          )}
          title={isSidebarOpen ? 'إخفاء القائمة' : 'إظهار القائمة'}
        >
          <MenuIcon className="w-6 h-6" />
        </button>

        <div className="text-2xl font-black text-primary-700 tracking-tight">
          ElitePOS Saudi
        </div>
      </div>

      {/* Center section — Search */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <input
            className="w-full pl-4 pr-10 py-2 bg-[#f4f2fd] border border-[#c4c5d6] rounded-lg focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition-shadow text-[#1a1b22] text-sm shadow-sm"
            placeholder="بحث عن منتج..."
            type="text"
          />
          <Search className="absolute right-3 top-2.5 w-5 h-5 text-[#747685]" />
        </div>
      </div>

      {/* Left section — Actions + Profile */}
      <div className="flex items-center gap-2 text-primary-700">
        <button className="w-10 h-10 flex items-center justify-center hover:bg-[#f4f2fd] rounded-full transition-transform active:scale-95 duration-150">
          <Bell className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 flex items-center justify-center hover:bg-[#f4f2fd] rounded-full transition-transform active:scale-95 duration-150"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center hover:bg-[#f4f2fd] rounded-full transition-transform active:scale-95 duration-150">
          <Globe className="w-5 h-5" />
        </button>

        <div className="mr-4 pr-4 border-r border-[#e2e1ec]">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm',
            'bg-primary-700'
          )}>
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
