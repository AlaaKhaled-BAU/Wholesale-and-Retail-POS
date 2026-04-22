import { Settings, LogOut, Store, ScanBarcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useScannerStatus } from '../../hooks/useScannerStatus';

export default function TopBar() {
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
        return 'bg-success-500';
      case 'disconnected':
        return 'bg-destructive-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg cursor-default"
          title={getScannerTooltip()}
        >
          <ScanBarcode className="w-4 h-4 text-gray-600" />
          <span className="text-xs font-medium text-gray-600">قارئ الباركود</span>
          <span className={`w-2.5 h-2.5 rounded-full ${getScannerDotColor()}`} />
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="الإعدادات"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="تسجيل الخروج"
        >
          <LogOut className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary-700">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{user?.name || 'مستخدم'}</div>
            <div className="text-xs text-gray-500">{getRoleLabel(user?.role || '')}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
          <Store className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">{storeInfo.nameAr}</span>
        </div>
      </div>
    </header>
  );
}
