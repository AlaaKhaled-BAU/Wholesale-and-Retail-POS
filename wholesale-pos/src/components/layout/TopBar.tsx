import { Settings, LogOut, Store, ScanBarcode, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useScannerStatus } from '../../hooks/useScannerStatus';
import { cn } from '../../lib/utils';

interface TopBarProps {
  isSidebarOpen?: boolean;
  onMenuClick?: () => void;
}

export default function TopBar({ isSidebarOpen = true, onMenuClick }: TopBarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { storeInfo } = useSettingsStore();
  const { status: scannerStatus } = useScannerStatus();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'مسؤول',
      manager: 'مدير',
      cashier: 'كاشير',
      stock: 'مخزن',
      accountant: 'محاسب',
    };
    return roles[role] || role;
  };

  const getScannerTooltip = () => {
    switch (scannerStatus) {
      case 'connected':
        return 'قارئ الباركود متصل';
      case 'disconnected':
        return 'قارئ الباركود غير متصل';
      default:
        return 'حالة قارئ الباركود غير معروفة';
    }
  };

  const getScannerDotColor = () => {
    switch (scannerStatus) {
      case 'connected':
        return 'bg-emerald-500';
      case 'disconnected':
        return 'bg-rose-500';
      default:
        return 'bg-gray-300';
    }
  };

  const MenuIcon = isSidebarOpen ? PanelRightOpen : PanelRightClose;

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-5 sticky top-0 z-20">
      {/* Left section */}
      <div className="flex items-center gap-2">
        {/* Sidebar Toggle */}
        <button
          onClick={onMenuClick}
          className={cn(
            'group flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl transition-all duration-200',
            'hover:bg-gray-100 active:scale-95',
            isSidebarOpen
              ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
              : 'text-gray-500 hover:text-gray-700'
          )}
          title={isSidebarOpen ? 'إخفاء القائمة' : 'إظهار القائمة'}
        >
          <MenuIcon
            className={cn(
              'w-[18px] h-[18px] transition-transform duration-200',
              isSidebarOpen ? 'rotate-0' : '-rotate-180'
            )}
          />
          <span className="text-xs font-semibold hidden sm:inline">القائمة</span>
        </button>

        {/* Divider */}
        <span className="w-px h-6 bg-gray-200 mx-1" />

        {/* Scanner Status */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50/80 cursor-default"
          title={getScannerTooltip()}
        >
          <ScanBarcode className="w-[15px] h-[15px] text-gray-400" />
          <span className="text-[11px] font-medium text-gray-500 hidden sm:inline">قارئ الباركود</span>
          <span
            className={cn(
              'w-2 h-2 rounded-full ring-2 ring-white shadow-sm transition-colors duration-500',
              getScannerDotColor()
            )}
          />
        </div>

        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-all duration-200"
          title="الإعدادات"
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all duration-200"
          title="تسجيل الخروج"
        >
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-5">
        {/* User */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-gray-900 leading-tight">
              {user?.name || 'مستخدم'}
            </div>
            <div className="text-[11px] text-gray-400 leading-tight">
              {getRoleLabel(user?.role || '')}
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center shadow-sm shadow-primary-200">
            <span className="text-sm font-bold text-white">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
        </div>

        {/* Store */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100">
          <Store className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-700">{storeInfo.nameAr}</span>
        </div>
      </div>
    </header>
  );
}
