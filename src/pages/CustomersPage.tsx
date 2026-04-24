import { useState } from 'react';
import { Search, Plus, Pencil, Eye, DollarSign, Users, Loader2 } from 'lucide-react';
import { useCustomerStore } from '../store/useCustomerStore';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import type { Customer, CustomerInput } from '../types';

export default function CustomersPage() {
  const toast = useToast();
  const { customers, selectedCustomer, addCustomer, recordPayment, selectCustomer } = useCustomerStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [formData, setFormData] = useState<CustomerInput>({
    nameAr: '',
    nameEn: '',
    phone: '',
    vatNumber: '',
    crNumber: '',
    creditLimit: 0,
    address: '',
  });

  const filteredCustomers = customers.filter((customer) =>
    customer.nameAr.includes(searchQuery) ||
    customer.phone?.includes(searchQuery) ||
    customer.vatNumber?.includes(searchQuery)
  );

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        nameAr: customer.nameAr,
        nameEn: customer.nameEn || '',
        phone: customer.phone || '',
        vatNumber: customer.vatNumber || '',
        crNumber: customer.crNumber || '',
        creditLimit: customer.creditLimit,
        address: customer.address || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        nameAr: '',
        nameEn: '',
        phone: '',
        vatNumber: '',
        crNumber: '',
        creditLimit: 0,
        address: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      if (editingCustomer) {
        // TODO: Update customer
        toast.success('تم تحديث العميل بنجاح');
      } else {
        await addCustomer(formData);
        toast.success('تم إضافة العميل بنجاح');
      }
      setShowModal(false);
      setEditingCustomer(null);
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ العميل');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedCustomer || !paymentAmount) return;
    setIsPaying(true);
    try {
      await recordPayment(selectedCustomer.id, parseFloat(paymentAmount));
      setPaymentAmount('');
      setShowPaymentModal(false);
      toast.success('تم تسجيل الدفعة بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setIsPaying(false);
    }
  };

  const handleViewDetail = (customer: Customer) => {
    selectCustomer(customer);
    setShowDetail(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">إدارة العملاء</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة عميل
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو الرقم الضريبي..."
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الهاتف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الرقم الضريبي</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">حد الائتمان</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الرصيد</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{customer.nameAr}</div>
                    {customer.vatNumber && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                        B2B
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{customer.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{customer.vatNumber || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {customer.creditLimit > 0 ? `${customer.creditLimit.toLocaleString()} ر.س` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-sm font-medium',
                      customer.balance > 0 ? 'text-destructive-600' : 'text-gray-900'
                    )}>
                      {customer.balance.toLocaleString()} ر.س
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetail(customer)}
                        className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(customer)}
                        className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        title="تعديل"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {customer.creditLimit > 0 && (
                        <button
                          onClick={() => {
                            selectCustomer(customer);
                            setShowPaymentModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-success-600 transition-colors"
                          title="إضافة دفعة"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا يوجد عملاء</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">{editingCustomer ? 'تعديل عميل' : 'إضافة عميل'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (عربي) *</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (English)</label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرقم الضريبي</label>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السجل التجاري</label>
                  <input
                    type="text"
                    value={formData.crNumber}
                    onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">حد الائتمان</label>
                <input
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.nameAr || isSaving}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showDetail && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">تفاصيل العميل</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-primary-700">
                    {selectedCustomer.nameAr.charAt(0)}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{selectedCustomer.nameAr}</h3>
                {selectedCustomer.vatNumber && (
                  <span className="inline-block mt-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                    B2B
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500 mb-1">حد الائتمان</div>
                  <div className="text-lg font-bold">{selectedCustomer.creditLimit.toLocaleString()} ر.س</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500 mb-1">الرصيد الحالي</div>
                  <div className={cn(
                    'text-lg font-bold',
                    selectedCustomer.balance > 0 ? 'text-destructive-600' : 'text-gray-900'
                  )}>
                    {selectedCustomer.balance.toLocaleString()} ر.س
                  </div>
                </div>
              </div>

              {/* Credit Progress Bar */}
              {selectedCustomer.creditLimit > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>نسبة استهلاك الائتمان</span>
                    <span>{Math.round((selectedCustomer.balance / selectedCustomer.creditLimit) * 100)}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        (selectedCustomer.balance / selectedCustomer.creditLimit) > 0.8 ? 'bg-destructive-500' : 'bg-primary-500'
                      )}
                      style={{ width: `${Math.min(100, (selectedCustomer.balance / selectedCustomer.creditLimit) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">معلومات الاتصال</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">الهاتف:</span>
                    <span className="mr-2">{selectedCustomer.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">الرقم الضريبي:</span>
                    <span className="mr-2">{selectedCustomer.vatNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">السجل التجاري:</span>
                    <span className="mr-2">{selectedCustomer.crNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">العنوان:</span>
                    <span className="mr-2">{selectedCustomer.address || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">إضافة دفعة</h2>
              <p className="text-sm text-gray-500 mt-1">{selectedCustomer.nameAr}</p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="text-sm text-gray-500">الرصيد الحالي</div>
                <div className="text-lg font-bold text-destructive-600">{selectedCustomer.balance.toLocaleString()} ر.س</div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ الدفعة</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right text-xl font-bold"
              />
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handlePayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isPaying}
                className="flex-1 px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
