import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/pos', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/pos', label: 'المبيعات', icon: ShoppingCart },
  { path: '/inventory', label: 'المخزون', icon: Package },
  { path: '/customers', label: 'العملاء', icon: Users },
  { path: '/invoices', label: 'الفواتير', icon: FileText },
  { path: '/reports', label: 'التقارير', icon: BarChart3 },
  { path: '/settings', label: 'الإعدادات', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <aside
      className={cn(
        'fixed right-0 top-0 h-full w-64 bg-white z-40 flex flex-col',
        'shadow-[0_0_40px_-12px_rgba(0,0,0,0.12)]',
        'transition-[transform,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        isOpen
          ? 'translate-x-0'
          : 'translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:shadow-none'
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">نظام نقاط البيع</h1>
            <p className="text-[11px] text-gray-400 leading-tight">Wholesale POS</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title="إغلاق"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-all duration-200',
                'hover:bg-gray-50 active:scale-[0.98]',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
                isActive
                  ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <span
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  isActive ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'
                )}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm">{item.label}</span>
              {isActive && (
                <span className="mr-auto w-1 h-5 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="text-[11px] text-gray-400 text-center tracking-wide">
          الإصدار 1.0.0
        </div>
      </div>
    </aside>
  );
}
