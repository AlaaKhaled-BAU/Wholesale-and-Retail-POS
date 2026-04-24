import { useState } from 'react';
import { Download, Calendar, CalendarRange, CalendarDays, TrendingUp, TrendingDown, Package, Receipt, DollarSign, AlertTriangle, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { exportToCSV } from '../lib/csvExport';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

/* ElitePOS chart colors */
const CHART_COLORS = {
  primary: '#00247d',
  secondary: '#2f54cb',
  success: '#10b981',
  warning: '#f59e0b',
  destructive: '#ba1a1a',
  info: '#6366f1',
  surface: '#8B5CF6',
};

const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.info];

/* Mock data */
const mockDailyData = {
  totalSales: 12500,
  totalInvoices: 45,
  avgInvoice: 277.78,
  totalVat: 1630.43,
  totalCost: 8750,
  profit: 3750,
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
  hourlySales: [
    { hour: '08:00', sales: 800 },
    { hour: '10:00', sales: 2100 },
    { hour: '12:00', sales: 3500 },
    { hour: '14:00', sales: 2800 },
    { hour: '16:00', sales: 1900 },
    { hour: '18:00', sales: 1400 },
  ],
};

const mockInventoryData = {
  totalStockValue: 85000,
  totalItems: 342,
  categoriesCount: 12,
  lowStockItems: [
    { id: '1', name: 'تفاح أحمر', barcode: '1234567890123', currentStock: 5, minStock: 10, category: 'فواكه' },
    { id: '2', name: 'حليب', barcode: '1234567890124', currentStock: 3, minStock: 15, category: 'ألبان' },
    { id: '3', name: 'زيت زيتون', barcode: '1234567890125', currentStock: 2, minStock: 8, category: 'زيوت' },
  ],
};

const mockPeriodData = {
  dailySales: [
    { date: '15 أبريل', sales: 12000, invoices: 40, profit: 3200 },
    { date: '16 أبريل', sales: 15000, invoices: 55, profit: 4100 },
    { date: '17 أبريل', sales: 11000, invoices: 38, profit: 2800 },
    { date: '18 أبريل', sales: 18000, invoices: 62, profit: 5200 },
    { date: '19 أبريل', sales: 14000, invoices: 48, profit: 3900 },
    { date: '20 أبريل', sales: 16000, invoices: 58, profit: 4500 },
    { date: '21 أبريل', sales: 12500, invoices: 45, profit: 3400 },
  ],
  totalSales: 98500,
  totalVat: 12847.83,
  totalProfit: 27100,
  totalInvoices: 346,
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

const paymentLabels: Record<string, string> = {
  cash: 'نقدي',
  card: 'فيزا',
  cliq: 'CLIQ',
  mixed: 'مختلط',
};

const paymentIcons: Record<string, React.ElementType> = {
  cash: DollarSign,
  card: Receipt,
  cliq: TrendingUp,
  mixed: Minus,
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'inventory' | 'period' | 'shift'>('daily');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const tabs = [
    { id: 'daily' as const, label: 'التقرير اليومي', icon: Calendar },
    { id: 'inventory' as const, label: 'تقرير المخزون', icon: Package },
    { id: 'period' as const, label: 'تقرير الفترة', icon: CalendarRange },
    { id: 'shift' as const, label: 'تقرير المناوبة', icon: CalendarDays },
  ];

  const toast = useToast();

  const handleExportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) {
      toast.warning('لا توجد بيانات للتصدير');
      return;
    }
    exportToCSV(data, filename);
    toast.success('تم تصدير التقرير بنجاح');
  };

  return (
    <div className="min-h-full bg-[#F8F9FA] -m-6 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-[#1a1b22] tracking-tight">التقارير</h1>
        <div className="text-base font-semibold text-[#747685] bg-white px-4 py-2 rounded-lg border border-[#e2e1ec] shadow-sm">
          لوحة تحليلات ElitePOS
        </div>
      </div>

      {/* Chunky Segmented Tab Control */}
      <div className="bg-white rounded-xl shadow-sm p-2 border border-[#e2e1ec] flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-3 px-5 h-14 rounded-lg text-base font-bold transition-all whitespace-nowrap',
                isActive
                  ? 'bg-primary-700 text-white shadow-md'
                  : 'text-[#555f70] hover:bg-[#f4f2fd]'
              )}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DAILY REPORT                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-[#e2e1ec] flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555f70] pointer-events-none" />
                <input
                  type="date"
                  className="pr-10 pl-4 h-12 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right text-sm text-[#1a1b22] w-44 bg-white"
                />
              </div>
            </div>
            <button
              onClick={() => handleExportCSV(mockDailyData.topProducts.map((p) => ({ name: p.name, qty: p.qty, revenue: p.revenue })), 'daily-report.csv')}
              className="flex items-center gap-2 px-5 h-12 border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] transition-colors text-sm font-semibold bg-white w-full sm:w-auto justify-center"
            >
              <Download className="w-5 h-5" />
              تصدير CSV
            </button>
          </div>

          {/* KPI Cards — 6 columns, large, icon-driven */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'المبيعات', value: `${mockDailyData.totalSales.toLocaleString()}`, suffix: 'ر.س', icon: DollarSign, color: 'bg-primary-700 text-white', trend: '+12%' },
              { label: 'الفواتير', value: mockDailyData.totalInvoices.toString(), suffix: '', icon: Receipt, color: 'bg-success-600 text-white', trend: '+5%' },
              { label: 'متوسط الفاتورة', value: `${mockDailyData.avgInvoice.toFixed(0)}`, suffix: 'ر.س', icon: TrendingUp, color: 'bg-[#6366F1] text-white', trend: '+3%' },
              { label: 'الربح', value: `${mockDailyData.profit.toLocaleString()}`, suffix: 'ر.س', icon: TrendingUp, color: 'bg-[#8B5CF6] text-white', trend: '+8%' },
              { label: 'الضريبة', value: `${mockDailyData.totalVat.toFixed(0)}`, suffix: 'ر.س', icon: Receipt, color: 'bg-warning-500 text-white', trend: '' },
              { label: 'التكلفة', value: `${mockDailyData.totalCost.toLocaleString()}`, suffix: 'ر.س', icon: TrendingDown, color: 'bg-[#9CA3AF] text-white', trend: '' },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className={cn('rounded-xl p-5 shadow-sm flex flex-col justify-between', kpi.color)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium opacity-90">{kpi.label}</div>
                    <Icon className="w-5 h-5 opacity-80" />
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-black">{kpi.value}</div>
                    {kpi.suffix && <div className="text-xs font-bold opacity-80 mb-1">{kpi.suffix}</div>}
                  </div>
                  {kpi.trend && (
                    <div className="text-xs font-bold mt-2 opacity-80 bg-white/20 inline-flex px-2 py-0.5 rounded self-start">
                      {kpi.trend}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Breakdown — Donut */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e1ec]">
              <h3 className="text-lg font-bold text-[#1a1b22] mb-4">توزيع طرق الدفع</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={mockDailyData.paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {mockDailyData.paymentBreakdown.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {mockDailyData.paymentBreakdown.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 bg-[#f4f2fd] px-3 py-1.5 rounded-lg">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index] }} />
                    <span className="text-sm font-semibold text-[#1a1b22]">{entry.name}</span>
                    <span className="text-xs text-[#747685]">{entry.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products — Horizontal Bar */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e1ec]">
              <h3 className="text-lg font-bold text-[#1a1b22] mb-4">أفضل 5 منتجات</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={mockDailyData.topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e1ec" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#1a1b22', fontWeight: 600 }} />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} />
                  <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[0, 8, 8, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hourly Sales — Area Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e1ec]">
              <h3 className="text-lg font-bold text-[#1a1b22] mb-4">المبيعات بالساعة</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={mockDailyData.hourlySales}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e1ec" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12, fill: '#555f70' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} />
                  <Area type="monotone" dataKey="sales" stroke={CHART_COLORS.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* INVENTORY REPORT                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-[#e2e1ec] flex items-center justify-between">
            <div className="text-lg font-bold text-[#1a1b22]">تقرير جرد المخزون</div>
            <button
              onClick={() => handleExportCSV(mockInventoryData.lowStockItems.map((i) => ({ name: i.name, barcode: i.barcode, currentStock: i.currentStock, minStock: i.minStock, category: i.category })), 'inventory-report.csv')}
              className="flex items-center gap-2 px-5 h-12 border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] transition-colors text-sm font-semibold bg-white"
            >
              <Download className="w-5 h-5" />
              تصدير CSV
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e1ec]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary-700" />
                </div>
                <div className="text-sm text-[#747685]">إجمالي قيمة المخزون</div>
              </div>
              <div className="text-3xl font-black text-primary-700">
                {mockInventoryData.totalStockValue.toLocaleString()} <span className="text-base font-bold">ر.س</span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e1ec]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center">
                  <Package className="w-6 h-6 text-success-600" />
                </div>
                <div className="text-sm text-[#747685]">عدد المنتجات</div>
              </div>
              <div className="text-3xl font-black text-[#1a1b22]">
                {mockInventoryData.totalItems}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e1ec]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-destructive-50 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive-600" />
                </div>
                <div className="text-sm text-[#747685]">منتجات منخفضة</div>
              </div>
              <div className="text-3xl font-black text-destructive-600">
                {mockInventoryData.lowStockItems.length}
              </div>
            </div>
          </div>

          {/* Low Stock Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#e2e1ec]">
            <div className="p-5 border-b border-[#e2e1ec] flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive-600" />
              <h3 className="text-lg font-bold text-destructive-600">منتجات منخفضة المخزون</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F1F5F9]">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">المنتج</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">الباركود</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">المخزون الحالي</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">الحد الأدنى</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">الفئة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e1ec]">
                  {mockInventoryData.lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#f4f2fd] transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-destructive-600">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-[#555f70]">{item.barcode}</td>
                      <td className="px-6 py-4 text-sm text-destructive-600 font-black">{item.currentStock}</td>
                      <td className="px-6 py-4 text-sm text-[#555f70]">{item.minStock}</td>
                      <td className="px-6 py-4 text-sm text-[#555f70]">{item.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mockInventoryData.lowStockItems.length === 0 && (
              <div className="text-center py-12 text-[#747685]">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>لا يوجد منتجات منخفضة المخزون</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PERIOD REPORT                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'period' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-[#e2e1ec] flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <CalendarRange className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555f70] pointer-events-none" />
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="pr-10 pl-4 h-12 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right text-sm text-[#1a1b22] w-44 bg-white"
                />
              </div>
              <span className="text-[#747685] font-bold">—</span>
              <div className="relative flex-1 sm:flex-none">
                <CalendarRange className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555f70] pointer-events-none" />
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="pr-10 pl-4 h-12 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right text-sm text-[#1a1b22] w-44 bg-white"
                />
              </div>
            </div>
            <button
              onClick={() => handleExportCSV(mockPeriodData.dailySales.map((d) => ({ date: d.date, sales: d.sales, invoices: d.invoices })), 'period-report.csv')}
              className="flex items-center gap-2 px-5 h-12 border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] transition-colors text-sm font-semibold bg-white w-full sm:w-auto justify-center"
            >
              <Download className="w-5 h-5" />
              تصدير CSV
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'إجمالي المبيعات', value: `${mockPeriodData.totalSales.toLocaleString()}`, suffix: 'ر.س', icon: DollarSign, color: 'bg-primary-700' },
              { label: 'إجمالي الربح', value: `${mockPeriodData.totalProfit.toLocaleString()}`, suffix: 'ر.س', icon: TrendingUp, color: 'bg-success-600' },
              { label: 'الضريبة', value: `${mockPeriodData.totalVat.toFixed(0)}`, suffix: 'ر.س', icon: Receipt, color: 'bg-warning-500' },
              { label: 'الفواتير', value: mockPeriodData.totalInvoices.toString(), suffix: '', icon: Receipt, color: 'bg-[#6366F1]' },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className={cn('rounded-xl p-5 shadow-sm text-white', kpi.color)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium opacity-90">{kpi.label}</div>
                    <Icon className="w-5 h-5 opacity-80" />
                  </div>
                  <div className="text-2xl font-black">{kpi.value}</div>
                  {kpi.suffix && <div className="text-xs font-bold opacity-80">{kpi.suffix}</div>}
                </div>
              );
            })}
          </div>

          {/* Sales + Profit Dual Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e1ec]">
            <h3 className="text-lg font-bold text-[#1a1b22] mb-4">أداء المبيعات والأرباح</h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={mockPeriodData.dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e1ec" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#555f70' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#555f70' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v / 1000}k`} />
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} />
                <Area type="monotone" dataKey="sales" name="المبيعات" stroke={CHART_COLORS.primary} strokeWidth={3} fill="url(#colorSales2)" />
                <Area type="monotone" dataKey="profit" name="الربح" stroke={CHART_COLORS.success} strokeWidth={3} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SHIFT REPORT                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'shift' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-[#e2e1ec] flex items-center justify-between">
            <div className="text-lg font-bold text-[#1a1b22]">تقرير مناوبة الكاشير</div>
            <button
              onClick={() => handleExportCSV([{ sessionId: mockShiftData.sessionId, cashierName: mockShiftData.cashierName, totalSales: mockShiftData.totalSales, totalInvoices: mockShiftData.totalInvoices, expectedCash: mockShiftData.expectedCash, actualCash: mockShiftData.actualCash, discrepancy: mockShiftData.discrepancy }], 'shift-report.csv')}
              className="flex items-center gap-2 px-5 h-12 border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] transition-colors text-sm font-semibold bg-white"
            >
              <Download className="w-5 h-5" />
              تصدير CSV
            </button>
          </div>

          {/* Shift Info Cards */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e1ec]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#f4f2fd] rounded-xl p-4">
                <div className="text-sm text-[#747685] mb-1">الكاشير</div>
                <div className="text-lg font-bold text-[#1a1b22]">{mockShiftData.cashierName}</div>
              </div>
              <div className="bg-[#f4f2fd] rounded-xl p-4">
                <div className="text-sm text-[#747685] mb-1">رقم الجلسة</div>
                <div className="text-lg font-bold text-[#1a1b22]">{mockShiftData.sessionId}</div>
              </div>
              <div className="bg-[#f4f2fd] rounded-xl p-4">
                <div className="text-sm text-[#747685] mb-1">وقت الفتح</div>
                <div className="text-base font-bold text-[#1a1b22]">{new Date(mockShiftData.openedAt).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div className="bg-[#f4f2fd] rounded-xl p-4">
                <div className="text-sm text-[#747685] mb-1">وقت الإغلاق</div>
                <div className="text-base font-bold text-[#1a1b22]">{new Date(mockShiftData.closedAt).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-primary-50 border border-primary-100 rounded-xl p-5 text-center">
                <div className="text-sm text-primary-600 font-semibold mb-1">إجمالي المبيعات</div>
                <div className="text-3xl font-black text-primary-700">
                  {mockShiftData.totalSales.toLocaleString()} <span className="text-sm">ر.س</span>
                </div>
              </div>
              <div className="bg-success-50 border border-success-100 rounded-xl p-5 text-center">
                <div className="text-sm text-success-600 font-semibold mb-1">عدد الفواتير</div>
                <div className="text-3xl font-black text-success-700">{mockShiftData.totalInvoices}</div>
              </div>
              <div className={cn(
                'border rounded-xl p-5 text-center',
                mockShiftData.discrepancy === 0 ? 'bg-success-50 border-success-100' : 'bg-destructive-50 border-destructive-100'
              )}>
                <div className={cn('text-sm font-semibold mb-1', mockShiftData.discrepancy === 0 ? 'text-success-600' : 'text-destructive-600')}>
                  حالة الصندوق
                </div>
                <div className={cn('text-3xl font-black', mockShiftData.discrepancy === 0 ? 'text-success-700' : 'text-destructive-700')}>
                  {mockShiftData.discrepancy === 0 ? 'متوافق ✓' : `${mockShiftData.discrepancy.toFixed(2)} ر.س`}
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <h3 className="text-lg font-bold text-[#1a1b22] mb-4">تفاصيل الدفع</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(mockShiftData.paymentBreakdown).map(([method, amount]) => {
                const Icon = paymentIcons[method] || DollarSign;
                return (
                  <div key={method} className="bg-[#f4f2fd] rounded-xl p-5 text-center border border-[#e2e1ec]">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <Icon className="w-5 h-5 text-primary-700" />
                    </div>
                    <div className="text-sm text-[#747685] font-medium mb-1">{paymentLabels[method]}</div>
                    <div className="text-xl font-black text-[#1a1b22]">{amount.toLocaleString()} <span className="text-xs">ر.س</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
