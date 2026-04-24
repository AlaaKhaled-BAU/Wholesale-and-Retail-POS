import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Receipt,
  Users,
  BarChart3,
  Settings,
  Lock,
  LogOut,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const mainNavItems = [
  { path: '/pos', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/invoices', label: 'الفواتير', icon: Receipt },
  { path: '/inventory', label: 'المخزون', icon: Package },
  { path: '/customers', label: 'العملاء', icon: Users },
  { path: '/reports', label: 'التقارير', icon: BarChart3 },
  { path: '/settings', label: 'الإعدادات', icon: Settings },
];

const footerNavItems = [
  { path: '/lock', label: 'قفل الشاشة', icon: Lock },
  { path: '/login', label: 'تسجيل الخروج', icon: LogOut },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export default function Sidebar({ isOpen, onClose, onOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed right-0 top-0 h-full w-64 bg-white z-40 flex flex-col border-l border-[#e2e1ec]',
          'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-[#e2e1ec] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-700 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary-700 font-headline-md">ElitePOS Saudi</h1>
              <p className="text-xs text-[#747685]">Riyadh Branch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#f4f2fd] rounded-xl transition-colors"
            title="إخفاء القائمة"
          >
            <X className="w-5 h-5 text-[#555f70]" />
          </button>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {mainNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <li key={item.label}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      'w-full flex items-center gap-4 rounded-lg p-4 transition-colors duration-200 ease-in-out text-sm font-semibold',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-[#555f70] hover:bg-[#f4f2fd]'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-[#e2e1ec]">
          <ul className="space-y-1">
            {footerNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.label}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      'w-full flex items-center gap-4 rounded-lg p-4 transition-colors duration-200 ease-in-out text-sm font-semibold',
                      'text-[#555f70] hover:bg-[#f4f2fd]'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>


    </>
  );
}
