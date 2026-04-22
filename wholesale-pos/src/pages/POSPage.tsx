import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ShoppingCart, UserPlus, PauseCircle, RotateCcw, Trash2, Plus, Minus, CreditCard, Percent, Loader2, Receipt, Printer, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useProductStore } from '../store/useProductStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

export default function POSPage() {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSuspendedDrawer, setShowSuspendedDrawer] = useState(false);
  const [isRefundMode, setIsRefundMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'cliq' | 'mixed'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<import('../types').Invoice | null>(null);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [printError, setPrintError] = useState(false);
  
  const [refundInvoiceNumber, setRefundInvoiceNumber] = useState('');
  const [refundInvoice, setRefundInvoice] = useState<{
    id: string;
    invoiceNumber: string;
    lines: { productId: string; name: string; qty: number; unitPrice: number; selectedQty: number }[];
  } | null>(null);
  const [isSearchingInvoice, setIsSearchingInvoice] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef('');
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { items, customerId, customerName, subtotal, totalVat, grandTotal, invoiceDiscount, addItem, updateQty, removeItem, setCustomer, setInvoiceDiscount, clearCart } = useCartStore();
  const { products, fetchProducts } = useProductStore();
  const { customers } = useCustomerStore();
  const { suspendedCarts, suspendCart, restoreCart, deleteSuspended, createInvoice } = useInvoiceStore();

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter' && scanBufferRef.current.length >= 8) {
        handleBarcodeScan(scanBufferRef.current);
        scanBufferRef.current = '';
      } else if (e.key.length === 1) {
        clearTimeout(scanTimerRef.current);
        scanBufferRef.current += e.key;
        scanTimerRef.current = setTimeout(() => { scanBufferRef.current = ''; }, 200);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(scanTimerRef.current);
    };
  }, [products]);

  useEffect(() => {
    const timeout = setTimeout(() => { if (searchQuery) fetchProducts(searchQuery); }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchProducts]);

  const handleBarcodeScan = useCallback((barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      addItem(product);
      toast.success(`تم إضافة: ${product.nameAr}`);
    } else {
      toast.error('باركود غير موجود');
    }
  }, [products, addItem, toast]);

  const handleBarcodeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcode = e.currentTarget.value;
      if (barcode.length >= 8) {
        handleBarcodeScan(barcode);
        e.currentTarget.value = '';
      }
    }
  };

  const handleProductClick = (product: typeof products[0]) => {
    addItem(product);
    toast.success(`تم إضافة: ${product.nameAr}`);
    setSearchQuery('');
  };

  const handleSuspendCart = () => {
    if (items.length === 0) return;
    suspendCart(`فاتورة ${suspendedCarts.length + 1}`, { items, customerId, invoiceDiscount, subtotal, totalVat, grandTotal });
    clearCart();
    toast.info('تم تعليق الفاتورة');
    setShowSuspendedDrawer(false);
  };

  const handleRestoreCart = (id: string) => {
    const cart = restoreCart(id);
    if (cart) toast.success('تم استعادة الفاتورة');
    setShowSuspendedDrawer(false);
  };

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    try {
      const paymentDetails = {
        cashAmount: paymentMethod === 'cash' || paymentMethod === 'mixed' ? parseFloat(cashAmount) || 0 : undefined,
        cardAmount: paymentMethod === 'card' || paymentMethod === 'mixed' ? parseFloat(cardAmount) || 0 : undefined,
        change: paymentMethod === 'cash' ? (parseFloat(cashAmount) || 0) - grandTotal : undefined,
      };
      const invoice = await createInvoice({ items, customerId, invoiceDiscount, subtotal, totalVat, grandTotal, paymentMethod, paymentDetails });
      if (invoice) {
        clearCart(); setShowPaymentModal(false); setCashAmount(''); setCardAmount('');
        setLastInvoice(invoice);
        setShowSuccessModal(true);
        toast.success('تمت العملية بنجاح');
      } else {
        toast.error('فشل في إنشاء الفاتورة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء معالجة الدفع');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!lastInvoice) return;
    setIsPrintingReceipt(true);
    setPrintError(false);
    try {
      // TODO: Replace with real Tauri invoke when Dev B implements print_receipt
      // await printReceipt(lastInvoice.id);
      await new Promise((resolve) => setTimeout(resolve, 800)); // Mock
      toast.success('تم إرسال الإيصال للطباعة');
      setPrintError(false);
    } catch (error) {
      setPrintError(true);
      toast.error('فشل في الطباعة — اضغط إعادة المحاولة');
    } finally {
      setIsPrintingReceipt(false);
    }
  };

  const getChange = () => (parseFloat(cashAmount) || 0) - grandTotal;

  const isPaymentValid = () => {
    if (paymentMethod === 'cash') return (parseFloat(cashAmount) || 0) >= grandTotal;
    if (paymentMethod === 'mixed') { const c = parseFloat(cashAmount) || 0; const d = parseFloat(cardAmount) || 0; return (c + d) >= grandTotal; }
    return true;
  };

  const handleSearchInvoiceForRefund = async () => {
    if (!refundInvoiceNumber.trim()) return;
    setIsSearchingInvoice(true);
    setTimeout(() => {
      setRefundInvoice({
        id: 'inv-123', invoiceNumber: refundInvoiceNumber,
        lines: [
          { productId: '1', name: 'تفاح أحمر', qty: 5, unitPrice: 15.00, selectedQty: 0 },
          { productId: '2', name: 'موز', qty: 3, unitPrice: 8.50, selectedQty: 0 },
        ],
      });
      setIsSearchingInvoice(false);
    }, 500);
  };

  const handleRefundQtyChange = (productId: string, qty: number) => {
    if (!refundInvoice) return;
    const line = refundInvoice.lines.find((l) => l.productId === productId);
    if (!line) return;
    const validQty = Math.max(0, Math.min(qty, line.qty));
    setRefundInvoice({ ...refundInvoice, lines: refundInvoice.lines.map((l) => l.productId === productId ? { ...l, selectedQty: validQty } : l) });
  };

  const handleProcessRefund = async () => {
    if (!refundInvoice) return;
    const selectedLines = refundInvoice.lines.filter((l) => l.selectedQty > 0);
    if (selectedLines.length === 0) { toast.warning('يرجى اختيار منتجات للإرجاع'); return; }
    toast.success('تم معالجة الإرجاع بنجاح');
    setRefundInvoice(null); setRefundInvoiceNumber(''); setIsRefundMode(false);
  };

  return (
    <div className="h-full flex gap-6">
      <input ref={barcodeInputRef} type="text" className="absolute opacity-0 w-0 h-0" onKeyDown={handleBarcodeInput} />

      <div className="flex-1 flex flex-col">
        {isRefundMode ? (
          <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col h-full">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-destructive-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="w-6 h-6 text-destructive-600" />
              </div>
              <h2 className="text-xl font-bold text-destructive-700">وضع الإرجاع</h2>
              <p className="text-gray-500 mt-1">ابحث عن الفاتورة الأصلية</p>
            </div>
            <div className="flex gap-2 mb-6">
              <input type="text" value={refundInvoiceNumber} onChange={(e) => setRefundInvoiceNumber(e.target.value)} placeholder="رقم الفاتورة أو باركود الإيصال..." className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right" />
              <button onClick={handleSearchInvoiceForRefund} disabled={isSearchingInvoice || !refundInvoiceNumber.trim()} className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-bold">
                {isSearchingInvoice ? <Loader2 className="w-5 h-5 animate-spin" /> : 'بحث'}
              </button>
            </div>
            {refundInvoice && (
              <div className="flex-1 overflow-y-auto">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="font-bold text-lg mb-1">فاتورة #{refundInvoice.invoiceNumber}</div>
                  <div className="text-sm text-gray-500">اختر المنتجات والكميات للإرجاع</div>
                </div>
                <div className="space-y-3">
                  {refundInvoice.lines.map((line) => (
                    <div key={line.productId} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium">{line.name}</div>
                          <div className="text-sm text-gray-500">{line.unitPrice.toFixed(2)} ر.س × {line.qty}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">الكمية المراد إرجاعها:</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleRefundQtyChange(line.productId, line.selectedQty - 1)} className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200"><Minus className="w-3 h-3" /></button>
                          <span className="w-8 text-center font-bold">{line.selectedQty}</span>
                          <button onClick={() => handleRefundQtyChange(line.productId, line.selectedQty + 1)} className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200"><Plus className="w-3 h-3" /></button>
                        </div>
                        <span className="text-xs text-gray-400">الحد الأقصى: {line.qty}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => { setRefundInvoice(null); setRefundInvoiceNumber(''); }} className="flex-1 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50">إلغاء</button>
                  <button onClick={handleProcessRefund} className="flex-1 px-4 py-3 bg-destructive-600 text-white rounded-lg hover:bg-destructive-700 font-bold">تأكيد الإرجاع</button>
                </div>
              </div>
            )}
            {!refundInvoice && (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>أدخل رقم الفاتورة للبحث</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث بالاسم أو الباركود..." className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right" />
              </div>
            </div>
            {searchQuery && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4 max-h-64 overflow-y-auto">
                {products.filter((p) => p.nameAr.includes(searchQuery) || p.barcode.includes(searchQuery)).map((product) => (
                  <button key={product.id} onClick={() => handleProductClick(product)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-right">
                    <div>
                      <div className="font-medium text-gray-900">{product.nameAr}</div>
                      <div className="text-sm text-gray-500">{product.barcode}</div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-primary-700">{product.sellPrice.toFixed(2)} ر.س</div>
                      <div className="text-xs text-gray-500">المخزون: {product.stockQty}</div>
                    </div>
                  </button>
                ))}
                {products.filter((p) => p.nameAr.includes(searchQuery) || p.barcode.includes(searchQuery)).length === 0 && (
                  <div className="p-4 text-center text-gray-500">لا توجد نتائج</div>
                )}
              </div>
            )}
            {!searchQuery && (
              <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
                <div className="text-center text-gray-400 py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">ابدأ بمسح المنتجات أو البحث</p>
                  <p className="text-sm mt-2">استخدم الباركود أو اكتب اسم المنتج</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="w-96 flex flex-col">
        <div className="bg-white rounded-xl shadow-sm flex flex-col h-full">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-900">السلة</h2>
              <span className="text-sm text-gray-500">{items.length} منتج</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <UserPlus className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{customerName || 'عميل نقدي'}{customerId && <span className="mr-2 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">B2B</span>}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>السلة فارغة</p></div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.productId} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.barcode}</div>
                      </div>
                      <button onClick={() => { removeItem(item.productId); toast.info('تم حذف المنتج'); }} className="p-1 text-gray-400 hover:text-destructive-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.productId, item.qty - 1)} className="w-7 h-7 rounded bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"><Minus className="w-3 h-3" /></button>
                        <span className="w-8 text-center font-medium">{item.qty}</span>
                        <button onClick={() => updateQty(item.productId, item.qty + 1)} className="w-7 h-7 rounded bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"><Plus className="w-3 h-3" /></button>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-primary-700">{item.lineTotal.toFixed(2)} ر.س</div>
                        {item.discountPercent > 0 && <div className="text-xs text-success-600">خصم {item.discountPercent}%</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">المجموع الفرعي</span><span className="font-medium">{subtotal.toFixed(2)} ر.س</span></div>
              {invoiceDiscount > 0 && <div className="flex justify-between text-success-600"><span>الخصم</span><span>-{invoiceDiscount.toFixed(2)} ر.س</span></div>}
              <div className="flex justify-between"><span className="text-gray-600">ضريبة القيمة المضافة (15%)</span><span className="font-medium">{totalVat.toFixed(2)} ر.س</span></div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200"><span>الإجمالي</span><span className="text-primary-700">{grandTotal.toFixed(2)} ر.س</span></div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowDiscountModal(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"><Percent className="w-4 h-4" />خصم</button>
              <button onClick={() => setShowCustomerModal(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"><UserPlus className="w-4 h-4" />عميل</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleSuspendCart} disabled={items.length === 0} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"><PauseCircle className="w-4 h-4" />تعليق{suspendedCarts.length > 0 && <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{suspendedCarts.length}</span>}</button>
              <button onClick={() => setIsRefundMode(!isRefundMode)} className={cn('flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm', isRefundMode ? 'bg-destructive-100 text-destructive-700' : 'bg-gray-100 hover:bg-gray-200')}><RotateCcw className="w-4 h-4" />إرجاع</button>
            </div>
            <button onClick={() => setShowPaymentModal(true)} disabled={items.length === 0 || isRefundMode} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed">
              <CreditCard className="w-5 h-5" />
              {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : 'الدفع'}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-center">الدفع</h2>
              <div className="text-center text-2xl font-bold text-primary-700 mt-2">{grandTotal.toFixed(2)} ر.س</div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(['cash', 'card', 'cliq', 'mixed'] as const).map((method) => (
                  <button key={method} onClick={() => setPaymentMethod(method)} className={cn('py-3 px-4 rounded-lg border-2 transition-colors font-medium', paymentMethod === method ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300')}>
                    {method === 'cash' && 'نقدي'}{method === 'card' && 'فيزا'}{method === 'cliq' && 'CLIQ'}{method === 'mixed' && 'فيزا + نقدي'}
                  </button>
                ))}
              </div>
              {(paymentMethod === 'cash' || paymentMethod === 'mixed') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ النقدي</label>
                  <input type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right text-xl font-bold" />
                  {paymentMethod === 'cash' && parseFloat(cashAmount) > 0 && <div className={cn('mt-2 text-center font-bold', getChange() >= 0 ? 'text-success-600' : 'text-destructive-600')}>الباقي: {getChange().toFixed(2)} ر.س</div>}
                </div>
              )}
              {(paymentMethod === 'card' || paymentMethod === 'mixed') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ بالبطاقة</label>
                  <input type="number" value={cardAmount} onChange={(e) => setCardAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right text-xl font-bold" />
                </div>
              )}
              {paymentMethod === 'mixed' && (
                <div className="text-center text-sm">
                  {(() => { const c = parseFloat(cashAmount) || 0; const d = parseFloat(cardAmount) || 0; const r = grandTotal - (c + d); if (r > 0) return <span className="text-destructive-600">المبلغ المتبقي: {r.toFixed(2)} ر.س</span>; else if (r < 0) return <span className="text-warning-600">زيادة: {Math.abs(r).toFixed(2)} ر.س</span>; else return <span className="text-success-600">المبلغ صحيح ✓</span>; })()}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">إلغاء</button>
              <button onClick={handlePayment} disabled={!isPaymentValid() || isProcessingPayment} className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'تأكيد البيع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200"><h2 className="text-xl font-bold">اختيار العميل</h2></div>
            <div className="p-6 max-h-80 overflow-y-auto">
              <button onClick={() => { setCustomer(null, null); setShowCustomerModal(false); }} className="w-full text-right p-3 rounded-lg hover:bg-gray-50 mb-2 border border-gray-200"><div className="font-medium">عميل نقدي</div></button>
              {customers.map((customer) => (
                <button key={customer.id} onClick={() => { setCustomer(customer.id, customer.nameAr); setShowCustomerModal(false); }} className={cn('w-full text-right p-3 rounded-lg hover:bg-gray-50 mb-2 border', customerId === customer.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200')}>
                  <div className="font-medium">{customer.nameAr}</div>
                  <div className="text-sm text-gray-500">{customer.phone}</div>
                  {customer.vatNumber && <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">B2B</span>}
                </button>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200">
              <button onClick={() => setShowCustomerModal(false)} className="w-full px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="p-6 border-b border-gray-200"><h2 className="text-xl font-bold">خصم على الفاتورة</h2></div>
            <div className="p-6">
              <input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right text-xl font-bold" />
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button onClick={() => setShowDiscountModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">إلغاء</button>
              <button onClick={() => { setInvoiceDiscount(parseFloat(discountAmount) || 0); setShowDiscountModal(false); toast.success('تم تطبيق الخصم'); }} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold">تطبيق</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Modal */}
      {showSuccessModal && lastInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">تمت العملية بنجاح!</h2>
              <p className="text-gray-500">فاتورة رقم {lastInvoice.invoiceNumber}</p>
            </div>

            <div className="px-6 pb-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">المجموع الفرعي:</span>
                <span className="font-medium">{lastInvoice.subtotal.toFixed(2)} ر.س</span>
              </div>
              {lastInvoice.discount > 0 && (
                <div className="flex justify-between text-sm text-success-600">
                  <span>الخصم:</span>
                  <span>-{lastInvoice.discount.toFixed(2)} ر.س</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">الضريبة:</span>
                <span className="font-medium">{lastInvoice.vatTotal.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>الإجمالي:</span>
                <span className="text-primary-700">{lastInvoice.total.toFixed(2)} ر.س</span>
              </div>

              {/* QR Placeholder */}
              <div className="bg-gray-50 rounded-lg p-4 text-center mt-4">
                <div className="text-sm text-gray-500 mb-2">رمز الاستجابة السريعة (ZATCA QR)</div>
                <div className="w-32 h-32 bg-gray-200 rounded-lg mx-auto flex items-center justify-center">
                  <span className="text-gray-400 text-xs">QR placeholder</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">سيتم إنشاء QR بواسطة Dev B</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 space-y-2">
              {printError && (
                <div className="bg-destructive-50 border border-destructive-200 rounded-lg p-3 mb-2">
                  <div className="text-sm text-destructive-700 font-medium">فشل في طباعة الإيصال</div>
                  <div className="text-xs text-destructive-600">تم حفظ الفاتورة. يمكنك إعادة المحاولة.</div>
                </div>
              )}
              <button
                onClick={handlePrintReceipt}
                disabled={isPrintingReceipt}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold disabled:opacity-50',
                  printError
                    ? 'bg-destructive-600 text-white hover:bg-destructive-700'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                )}
              >
                {isPrintingReceipt ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                {isPrintingReceipt ? 'جاري الطباعة...' : printError ? 'إعادة المحاولة' : 'طباعة الإيصال'}
              </button>
              <button
                onClick={() => { setShowSuccessModal(false); setLastInvoice(null); setPrintError(false); }}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                بيع جديد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspended Invoices Drawer */}
      {showSuspendedDrawer && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold">الفواتير المعلقة</h2>
              <button onClick={() => setShowSuspendedDrawer(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-4rem)]">
              {suspendedCarts.length === 0 ? <div className="text-center text-gray-400 py-8">لا توجد فواتير معلقة</div> : suspendedCarts.map((cart) => (
                <div key={cart.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{cart.label}</div>
                    <button onClick={() => deleteSuspended(cart.id)} className="text-gray-400 hover:text-destructive-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">{cart.itemCount} منتجات | {cart.grandTotal.toFixed(2)} ر.س</div>
                  <button onClick={() => handleRestoreCart(cart.id)} className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">استعادة</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
