import { useToastStore } from '../../hooks/useToast';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const toastStyles = {
  success: 'bg-success-50 border-success-200 text-success-800',
  error: 'bg-destructive-50 border-destructive-200 text-destructive-800',
  warning: 'bg-warning-50 border-warning-200 text-warning-800',
  info: 'bg-primary-50 border-primary-200 text-primary-800',
};

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl min-w-[320px] max-w-[520px]',
              'transform transition-all duration-300 ease-out',
              'translate-x-0 opacity-100 scale-100',
              toastStyles[toast.type]
            )}
            style={{ animation: 'toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
