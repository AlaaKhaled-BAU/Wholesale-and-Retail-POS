import { useState } from 'react';
import { Search, Printer, Eye, FileText, CheckCircle2, Clock, XCircle, CalendarDays, X } from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

const statusConfig = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700', icon: FileText },
  cleared: { label: 'مُبلَّغ', color: 'bg-success-100 text-success-700', icon: CheckCircle2 },
  pending: { label: 'معلق', color: 'bg-warning-100 text-warning-700', icon: Clock },
  rejected: { label: 'مرفوض', color: 'bg-destructive-100 text-destructive-700', icon: XCircle },
};

export default function InvoicesPage() {
  const toast = useToast();
  const { invoices } = useInvoiceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<typeof invoices[0] | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.includes(searchQuery) ||
      inv.customerName?.includes(searchQuery);

    let matchesDate = true;
    if (selectedDate) {
      const invDate = new Date(inv.createdAt).toISOString().split('T')[0];
      matchesDate = invDate === selectedDate;
    }

    return matchesSearch && matchesDate;
  });

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

        <div className="relative flex items-center gap-2">
          <div className="relative">
            <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right text-sm text-gray-700"
            />
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="إلغاء التصفية بالتاريخ"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
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
              {filteredInvoices.map((invoice) => {
                const status = statusConfig[invoice.status] || statusConfig.draft;
                const StatusIcon = status.icon;
                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{invoice.customerName || 'عميل نقدي'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs',
                        invoice.type === 'standard' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                      )}>
                        {invoice.type === 'standard' ? 'ضريبية' : 'مبسطة'}
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
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-sm text-success-600">
                    <span>الخصم:</span>
                    <span>-{selectedInvoice.discount.toFixed(2)} ر.س</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ضريبة القيمة المضافة:</span>
                  <span>{selectedInvoice.vatTotal.toFixed(2)} ر.س</span>
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
