import { useState, useEffect } from 'react';
import { Search, Printer, Eye, FileText, CheckCircle2, XCircle, CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

const statusConfig: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700', icon: FileText },
  confirmed: { label: 'مؤكدة', color: 'bg-success-100 text-success-700', icon: CheckCircle2 },
  cancelled: { label: 'ملغاة', color: 'bg-destructive-100 text-destructive-700', icon: XCircle },
};

export default function InvoicesPage() {
  const toast = useToast();
  const { invoices } = useInvoiceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<typeof invoices[0] | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo, statusFilter]);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.includes(searchQuery) ||
      inv.customerNameAr?.includes(searchQuery);

    let matchesDate = true;
    const invDate = new Date(inv.createdAt).toISOString().split('T')[0];
    if (dateFrom && invDate < dateFrom) matchesDate = false;
    if (dateTo && invDate > dateTo) matchesDate = false;

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesDate && matchesStatus;
  });

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE) || 1;
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePrint = async (_invoiceId: string) => {
    setIsPrinting(true);
    try {
      // TODO: Replace with real Tauri invoke when Dev B implements print_receipt
      // await printReceipt(invoiceId);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Mock
      toast.success('تم إرسال الفاتورة للطباعة');
    } catch (error) {
      toast.error('فشل في الطباعة');
    } finally {
      setIsPrinting(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">الفواتير</h1>
        <div className="text-sm text-gray-500">{invoices.length} فاتورة</div>
      </div>

      {/* Search & Date Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة أو اسم العميل..."
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="من"
              className="pr-9 pl-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right text-xs text-gray-700 w-36"
            />
          </div>
          <span className="text-gray-400 text-xs">—</span>
          <div className="relative">
            <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="إلى"
              className="pr-9 pl-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right text-xs text-gray-700 w-36"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="إلغاء التصفية بالتاريخ"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 bg-white rounded-xl shadow-sm p-2 overflow-x-auto">
        {[
          { key: 'all', label: 'الكل', count: invoices.length },
          { key: 'confirmed', label: 'مُؤكدة', count: invoices.filter((i) => i.status === 'confirmed').length },
          { key: 'draft', label: 'مسودة', count: invoices.filter((i) => i.status === 'draft').length },
          { key: 'cancelled', label: 'ملغاة', count: invoices.filter((i) => i.status === 'cancelled').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              statusFilter === tab.key
                ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            {tab.label}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-bold',
              statusFilter === tab.key ? 'bg-primary-200 text-primary-700' : 'bg-gray-100 text-gray-500'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">العميل</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">النوع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الإجمالي</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">حالة ZATCA</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedInvoices.map((invoice) => {
                const status = statusConfig[invoice.status] || statusConfig.draft;
                const StatusIcon = status.icon;
                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{invoice.customerNameAr || 'عميل نقدي'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs',
                        invoice.invoiceType === 'standard' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                      )}>
                        {invoice.invoiceType === 'standard' ? 'ضريبية' : 'مبسطة'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{invoice.total.toFixed(2)} ر.س</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', status.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(invoice.id)}
                          disabled={isPrinting}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                          title="طباعة"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد فواتير</p>
          </div>
        )}

        {/* Pagination */}
        {filteredInvoices.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              عرض {(currentPage - 1) * ITEMS_PER_PAGE + 1} إلى{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} من{' '}
              {filteredInvoices.length} فاتورة
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                    currentPage === page
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">تفاصيل الفاتورة</h2>
              <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">رقم الفاتورة</div>
                  <div className="font-bold">{selectedInvoice.invoiceNumber}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">التاريخ</div>
                  <div className="font-bold">{formatDate(selectedInvoice.createdAt)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">المجموع الفرعي:</span>
                  <span>{selectedInvoice.subtotal.toFixed(2)} ر.س</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-success-600">
                    <span>الخصم:</span>
                    <span>-{selectedInvoice.discountAmount.toFixed(2)} ر.س</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ضريبة القيمة المضافة:</span>
                  <span>{selectedInvoice.vatAmount.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span>الإجمالي:</span>
                  <span className="text-primary-700">{selectedInvoice.total.toFixed(2)} ر.س</span>
                </div>
              </div>

              {/* QR Placeholder */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-500 mb-2">رمز الاستجابة السريعة (QR)</div>
                <div className="w-32 h-32 bg-gray-200 rounded-lg mx-auto flex items-center justify-center">
                  <span className="text-gray-400 text-xs">سيتم عرض QR هنا</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">سيتم إنشاء QR بواسطة Dev B (ZATCA)</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { handlePrint(selectedInvoice.id); setSelectedInvoice(null); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold"
                >
                  <Printer className="w-4 h-4" />
                  طباعة الفاتورة
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
