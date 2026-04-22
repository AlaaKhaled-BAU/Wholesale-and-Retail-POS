import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/pos', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/pos', label: 'المبيعات', icon: ShoppingCart },
  { path: '/inventory', label: 'المخزون', icon: Package },
  { path: '/customers', label: 'العملاء', icon: Users },
  { path: '/reports', label: 'التقارير', icon: BarChart3 },
  { path: '/settings', label: 'الإعدادات', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="fixed right-0 top-0 h-full w-64 bg-white border-l border-gray-200 z-40 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-700">نظام نقاط البيع</h1>
        <p className="text-sm text-gray-500 mt-1">Wholesale POS</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors',
                'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500',
                isActive
                  ? 'bg-primary-50 text-primary-700 border-l-2 border-primary-600'
                  : 'text-gray-700'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          الإصدار 1.0.0
        </div>
      </div>
    </aside>
  );
}
