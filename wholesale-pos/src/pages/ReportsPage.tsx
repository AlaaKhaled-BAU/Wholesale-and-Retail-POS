import { useState } from 'react';
import { Download, Calendar, CalendarRange, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

// Mock data for reports
const mockDailyData = {
  totalSales: 12500,
  totalInvoices: 45,
  avgInvoice: 277.78,
  totalVat: 1630.43,
  paymentBreakdown: [
    { name: 'نقدي', value: 5000 },
    { name: 'فيزا', value: 4000 },
    { name: 'CLIQ', value: 2000 },
    { name: 'مختلط', value: 1500 },
  ],
  topProducts: [
    { name: 'تفاح أحمر', qty: 120, revenue: 1800 },
    { name: 'موز', qty: 200, revenue: 1700 },
    { name: 'حليب', qty: 80, revenue: 1200 },
    { name: 'خبز', qty: 150, revenue: 900 },
    { name: 'أرز', qty: 50, revenue: 750 },
  ],
};

const mockInventoryData = {
  totalStockValue: 85000,
  totalItems: 342,
  lowStockItems: [
    { id: '1', name: 'تفاح أحمر', barcode: '1234567890123', currentStock: 5, minStock: 10, category: 'فواكه' },
    { id: '2', name: 'حليب', barcode: '1234567890124', currentStock: 3, minStock: 15, category: 'ألبان' },
  ],
};

const mockPeriodData = {
  dailySales: [
    { date: '2026-04-15', sales: 12000, invoices: 40 },
    { date: '2026-04-16', sales: 15000, invoices: 55 },
    { date: '2026-04-17', sales: 11000, invoices: 38 },
    { date: '2026-04-18', sales: 18000, invoices: 62 },
    { date: '2026-04-19', sales: 14000, invoices: 48 },
    { date: '2026-04-20', sales: 16000, invoices: 58 },
    { date: '2026-04-21', sales: 12500, invoices: 45 },
  ],
  totalSales: 98500,
  totalVat: 12847.83,
};

const mockShiftData = {
  sessionId: 'sess-001',
  cashierName: 'أحمد محمد',
  openedAt: '2026-04-22T08:00:00Z',
  closedAt: '2026-04-22T16:00:00Z',
  totalSales: 12500,
  totalInvoices: 45,
  paymentBreakdown: {
    cash: 5000,
    card: 4000,
    cliq: 2000,
    mixed: 1500,
  },
  expectedCash: 6500,
  actualCash: 6500,
  discrepancy: 0,
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'inventory' | 'period' | 'shift'>('daily');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const tabs = [
    { id: 'daily' as const, label: 'التقرير اليومي', icon: Calendar },
    { id: 'inventory' as const, label: 'تقرير المخزون', icon: CalendarRange },
    { id: 'period' as const, label: 'تقرير الفترة', icon: CalendarDays },
    { id: 'shift' as const, label: 'تقرير المناوبة', icon: Calendar },
  ];

  const exportToCSV = (data: unknown[], filename: string) => {
    // TODO: Implement CSV export
    console.log('Exporting to CSV:', filename, data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-2">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Report */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <input
              type="date"
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => exportToCSV([], 'daily-report.csv')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'إجمالي المبيعات', value: `${mockDailyData.totalSales.toLocaleString()} ر.س`, color: 'bg-primary-50 text-primary-700' },
              { label: 'عدد الفواتير', value: mockDailyData.totalInvoices.toString(), color: 'bg-success-50 text-success-700' },
              { label: 'متوسط الفاتورة', value: `${mockDailyData.avgInvoice.toFixed(2)} ر.س`, color: 'bg-warning-50 text-warning-700' },
              { label: 'إجمالي الضريبة', value: `${mockDailyData.totalVat.toFixed(2)} ر.س`, color: 'bg-gray-50 text-gray-700' },
            ].map((kpi) => (
              <div key={kpi.label} className={`rounded-xl p-6 ${kpi.color}`}>
                <div className="text-sm opacity-80 mb-2">{kpi.label}</div>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">توزيع طرق الدفع</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={mockDailyData.paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockDailyData.paymentBreakdown.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {mockDailyData.paymentBreakdown.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-sm">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">أفضل 5 منتجات</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={mockDailyData.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Report */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => exportToCSV([], 'inventory-report.csv')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="text-sm text-gray-500 mb-2">إجمالي قيمة المخزون</div>
              <div className="text-3xl font-bold text-primary-700">
                {mockInventoryData.totalStockValue.toLocaleString()} ر.س
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="text-sm text-gray-500 mb-2">عدد المنتجات</div>
              <div className="text-3xl font-bold text-gray-900">
                {mockInventoryData.totalItems}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-destructive-600">منتجات منخفضة المخزون</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المنتج</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الباركود</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المخزون الحالي</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الحد الأدنى</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الفئة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockInventoryData.lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-destructive-600">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.barcode}</td>
                    <td className="px-4 py-3 text-sm text-destructive-600 font-bold">{item.currentStock}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.minStock}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Period Report */}
      {activeTab === 'period' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-gray-500">إلى</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => exportToCSV([], 'period-report.csv')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="text-sm text-gray-500 mb-2">إجمالي المبيعات</div>
              <div className="text-3xl font-bold text-primary-700">
                {mockPeriodData.totalSales.toLocaleString()} ر.س
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="text-sm text-gray-500 mb-2">إجمالي الضريبة</div>
              <div className="text-3xl font-bold text-gray-900">
                {mockPeriodData.totalVat.toFixed(2)} ر.س
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4">المبيعات اليومية</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockPeriodData.dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Shift Report */}
      {activeTab === 'shift' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => exportToCSV([], 'shift-report.csv')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">الكاشير</div>
                <div className="text-lg font-bold">{mockShiftData.cashierName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">رقم الجلسة</div>
                <div className="text-lg font-bold">{mockShiftData.sessionId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">وقت الفتح</div>
                <div className="text-lg">{new Date(mockShiftData.openedAt).toLocaleString('ar-SA')}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">وقت الإغلاق</div>
                <div className="text-lg">{new Date(mockShiftData.closedAt).toLocaleString('ar-SA')}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-primary-50 rounded-lg p-4 text-center">
                <div className="text-sm text-primary-600 mb-1">إجمالي المبيعات</div>
                <div className="text-2xl font-bold text-primary-700">
                  {mockShiftData.totalSales.toLocaleString()} ر.س
                </div>
              </div>
              <div className="bg-success-50 rounded-lg p-4 text-center">
                <div className="text-sm text-success-600 mb-1">عدد الفواتير</div>
                <div className="text-2xl font-bold text-success-700">
                  {mockShiftData.totalInvoices}
                </div>
              </div>
              <div className={cn(
                'rounded-lg p-4 text-center',
                mockShiftData.discrepancy === 0 ? 'bg-success-50' : 'bg-destructive-50'
              )}>
                <div className={cn(
                  'text-sm mb-1',
                  mockShiftData.discrepancy === 0 ? 'text-success-600' : 'text-destructive-600'
                )}>
                  الفرق
                </div>
                <div className={cn(
                  'text-2xl font-bold',
                  mockShiftData.discrepancy === 0 ? 'text-success-700' : 'text-destructive-700'
                )}>
                  {mockShiftData.discrepancy === 0 ? 'متوافق ✓' : `${mockShiftData.discrepancy.toFixed(2)} ر.س`}
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-4">تفاصيل الدفع</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(mockShiftData.paymentBreakdown).map(([method, amount]) => (
                <div key={method} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500 mb-1">
                    {method === 'cash' && 'نقدي'}
                    {method === 'card' && 'فيزا'}
                    {method === 'cliq' && 'CLIQ'}
                    {method === 'mixed' && 'مختلط'}
                  </div>
                  <div className="text-lg font-bold">{amount.toLocaleString()} ر.س</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
