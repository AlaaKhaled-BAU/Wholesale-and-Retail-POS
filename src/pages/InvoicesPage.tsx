import { useState, useEffect } from 'react';
import { Search, Printer, Eye, FileText, CheckCircle2, Clock, XCircle, CalendarDays, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

const statusConfig = {
  draft:     { label: 'مسودة',  color: 'bg-[#9CA3AF] text-white', icon: FileText },
  cleared:   { label: 'مُبلَّغ', color: 'bg-success-600 text-white', icon: CheckCircle2 },
  pending:   { label: 'معلق',   color: 'bg-warning-500 text-white', icon: Clock },
  rejected:  { label: 'مرفوض',  color: 'bg-destructive-600 text-white', icon: XCircle },
};

const typeConfig = {
  standard:   { label: 'ضريبية', color: 'bg-[#6366F1] text-white' },
  simplified: { label: 'مبسطة',  color: 'bg-[#8B5CF6] text-white' },
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo, statusFilter]);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.includes(searchQuery) ||
      inv.customerName?.includes(searchQuery);

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
      await new Promise((resolve) => setTimeout(resolve, 500));
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

  const tabs = [
    { key: 'all', label: 'الكل', count: invoices.length },
    { key: 'cleared', label: 'مُبلَّغ', count: invoices.filter((i) => i.status === 'cleared').length },
    { key: 'pending', label: 'معلق', count: invoices.filter((i) => i.status === 'pending').length },
    { key: 'rejected', label: 'مرفوض', count: invoices.filter((i) => i.status === 'rejected').length },
  ];

  return (
    <div className="min-h-full bg-[#F8F9FA] -m-6 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-[#1a1b22] tracking-tight">الفواتير</h1>
        <div className="text-base font-semibold text-[#747685] bg-white px-4 py-2 rounded-lg border border-[#e2e1ec] shadow-sm">
          {invoices.length} فاتورة
        </div>
      </div>

      {/* Search & Date Filter — Touch-Optimized */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-[#e2e1ec] flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555f70]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في النظام..."
            className="w-full pr-10 pl-4 h-12 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right text-sm bg-[#f8f9fa]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555f70] pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="pr-10 pl-3 h-12 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right text-sm text-[#1a1b22] w-40 bg-white"
            />
          </div>
          <span className="text-[#747685] font-medium">—</span>
          <div className="relative">
            <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555f70] pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="pr-10 pl-3 h-12 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right text-sm text-[#1a1b22] w-40 bg-white"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="h-12 w-12 flex items-center justify-center rounded-xl hover:bg-[#f4f2fd] text-[#747685] hover:text-[#1a1b22] transition-colors border border-[#e2e1ec]"
              title="إلغاء التصفية بالتاريخ"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Tabs — Chunky Segmented Control */}
      <div className="bg-white rounded-xl shadow-sm p-2 border border-[#e2e1ec] flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-3 px-5 h-14 rounded-lg text-base font-bold transition-all whitespace-nowrap',
                isActive
                  ? 'bg-primary-700 text-white shadow-md'
                  : 'text-[#555f70] hover:bg-[#f4f2fd]'
              )}
            >
              {tab.label}
              <span className={cn(
                'px-2.5 py-1 rounded-lg text-sm font-black',
                isActive ? 'bg-white/20 text-white' : 'bg-[#f4f2fd] text-[#555f70]'
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#e2e1ec]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F1F5F9]">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">رقم الفاتورة</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">التاريخ</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">العميل</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">النوع</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">الإجمالي</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">حالة ZATCA</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e1ec]">
              {paginatedInvoices.map((invoice) => {
                const status = statusConfig[invoice.status] || statusConfig.draft;
                const StatusIcon = status.icon;
                const typeBadge = typeConfig[invoice.type] || typeConfig.simplified;
                return (
                  <tr key={invoice.id} className="hover:bg-[#f4f2fd] transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-[#1a1b22]">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 text-sm text-[#555f70]">{formatDate(invoice.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-[#1a1b22] font-medium">{invoice.customerName || 'عميل نقدي'}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold',
                        typeBadge.color
                      )}>
                        {typeBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#1a1b22]">{invoice.total.toFixed(2)} ر.س</td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold', status.color)}>
                        <StatusIcon className="w-4 h-4" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="w-11 h-11 flex items-center justify-center text-[#747685] hover:text-primary-700 hover:bg-primary-50 rounded-full transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handlePrint(invoice.id)}
                          disabled={isPrinting}
                          className="w-11 h-11 flex items-center justify-center text-[#747685] hover:text-primary-700 hover:bg-primary-50 rounded-full transition-colors disabled:opacity-40"
                          title="طباعة"
                        >
                          <Printer className="w-5 h-5" />
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
          <div className="text-center py-16 text-[#747685]">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-4">لا توجد فواتير</p>
            <button
              onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); setStatusFilter('all'); }}
              className="inline-flex items-center gap-2 px-6 h-12 bg-primary-50 text-primary-700 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors font-semibold"
            >
              <X className="w-5 h-5" />
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}

        {/* Pagination */}
        {filteredInvoices.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#e2e1ec]">
            <div className="text-sm text-[#747685] font-medium">
              عرض {(currentPage - 1) * ITEMS_PER_PAGE + 1} إلى{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} من{' '}
              {filteredInvoices.length} فاتورة
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#f4f2fd] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'w-10 h-10 rounded-xl text-sm font-bold transition-colors',
                    currentPage === page
                      ? 'bg-primary-700 text-white shadow-sm'
                      : 'text-[#555f70] hover:bg-[#f4f2fd]'
                  )}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#f4f2fd] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-[#e2e1ec]">
            <div className="p-6 border-b border-[#e2e1ec] flex items-center justify-between">
              <h2 className="text-xl font-bold">تفاصيل الفاتورة</h2>
              <button onClick={() => setSelectedInvoice(null)} className="w-10 h-10 flex items-center justify-center hover:bg-[#f4f2fd] rounded-xl transition-colors text-[#747685]">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f4f2fd] rounded-xl p-4">
                  <div className="text-xs text-[#747685] mb-1">رقم الفاتورة</div>
                  <div className="font-bold text-lg">{selectedInvoice.invoiceNumber}</div>
                </div>
                <div className="bg-[#f4f2fd] rounded-xl p-4">
                  <div className="text-xs text-[#747685] mb-1">التاريخ</div>
                  <div className="font-bold text-lg">{formatDate(selectedInvoice.createdAt)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#747685]">المجموع الفرعي:</span>
                  <span className="font-medium">{selectedInvoice.subtotal.toFixed(2)} ر.س</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-sm text-success-600">
                    <span>الخصم:</span>
                    <span className="font-medium">-{selectedInvoice.discount.toFixed(2)} ر.س</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[#747685]">ضريبة القيمة المضافة:</span>
                  <span className="font-medium">{selectedInvoice.vatTotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#e2e1ec]">
                  <span>الإجمالي:</span>
                  <span className="text-primary-700">{selectedInvoice.total.toFixed(2)} ر.س</span>
                </div>
              </div>

              {/* QR Placeholder */}
              <div className="bg-[#f4f2fd] rounded-xl p-4 text-center">
                <div className="text-sm text-[#747685] mb-2">رمز الاستجابة السريعة (QR)</div>
                <div className="w-32 h-32 bg-[#e2e1ec] rounded-xl mx-auto flex items-center justify-center">
                  <span className="text-[#747685] text-xs">سيتم عرض QR هنا</span>
                </div>
                <p className="text-xs text-[#747685] mt-2">سيتم إنشاء QR بواسطة Dev B (ZATCA)</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { handlePrint(selectedInvoice.id); setSelectedInvoice(null); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-700 text-white rounded-xl hover:bg-primary-800 font-bold h-14"
                >
                  <Printer className="w-5 h-5" />
                  طباعة الفاتورة
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 px-4 py-3 border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] font-medium h-14"
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
