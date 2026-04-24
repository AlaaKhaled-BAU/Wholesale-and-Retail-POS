import { Package } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon = <Package className="w-12 h-12" />,
  title = 'لا توجد بيانات',
  description = 'لا توجد عناصر لعرضها حالياً',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-[#e2e1ec] mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-[#1a1b22] mb-2">{title}</h3>
      <p className="text-sm text-[#747685] mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
