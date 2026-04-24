import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Search, ShoppingCart, UserPlus, PauseCircle, RotateCcw, Trash2, Plus, Minus,
  CreditCard, Percent, Loader2, Receipt, Printer, CheckCircle2, Package,
  Bell, Coffee, IceCream, Cookie, Croissant
} from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useProductStore } from '../store/useProductStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToast } from '../hooks/useToast';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { cn } from '../lib/utils';

/* Category icons mapping */
const categoryIcons: Record<string, React.ElementType> = {
  'مشروبات ساخنة': Coffee,
  'مشروبات باردة': IceCream,
  'حلويات': Cookie,
  'معجنات': Croissant,
};

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
  const [activePaymentInput, setActivePaymentInput] = useState<'cash' | 'card'>('cash');
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
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef('');
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { storeInfo } = useSettingsStore();
  const {
    items, customerId, customerName, subtotal, totalVat, grandTotal,
    invoiceDiscount, addItem, updateQty, removeItem, setCustomer,
    setInvoiceDiscount, clearCart
  } = useCartStore();

  useKeyboardShortcuts(useMemo(() => [
    {
      key: 'Escape',
      handler: () => {
        if (showSuccessModal) { setShowSuccessModal(false); setLastInvoice(null); }
        else if (showPaymentModal) setShowPaymentModal(false);
        else if (showDiscountModal) setShowDiscountModal(false);
        else if (showCustomerModal) setShowCustomerModal(false);
        else if (showSuspendedDrawer) setShowSuspendedDrawer(false);
        else if (showRefundConfirm) setShowRefundConfirm(false);
        else if (isRefundMode) setIsRefundMode(false);
      },
    },
    {
      key: 'F1',
      handler: () => {
        if (showSuccessModal) { setShowSuccessModal(false); setLastInvoice(null); setPrintError(false); }
        else if (items.length > 0 && !isRefundMode && !showPaymentModal) {
          setPaymentMethod('cash');
          setShowPaymentModal(true);
          toast.info('تم اختيار الدفع نقدي');
        }
      },
    },
    {
      key: 'F2',
      handler: () => {
        if (items.length > 0 && !isRefundMode && !showPaymentModal) {
          setPaymentMethod('card');
          setShowPaymentModal(true);
          toast.info('تم اختيار الدفع بالبطاقة');
        }
      },
    },
    {
      key: 'F3',
      handler: () => {
        if (items.length > 0 && !isRefundMode && !showPaymentModal) {
          setPaymentMethod('cliq');
          setShowPaymentModal(true);
          toast.info('تم اختيار الدفع CLIQ');
        }
      },
    },
    {
      key: 'F4',
      handler: () => {
        if (showPaymentModal && !isProcessingPayment && isPaymentValid()) {
          handlePayment();
        } else if (items.length > 0 && !isRefundMode && !showPaymentModal) {
          setPaymentMethod('cash');
          setShowPaymentModal(true);
          toast.info('تم فتح نافذة الدفع');
        }
      },
    },
    {
      key: 'p',
      ctrl: true,
      handler: () => {
        if (lastInvoice && showSuccessModal) handlePrintReceipt();
      },
    },
  ], [showSuccessModal, showPaymentModal, showDiscountModal, showCustomerModal, showSuspendedDrawer, showRefundConfirm, isRefundMode, items.length, lastInvoice, isProcessingPayment, grandTotal, cashAmount, cardAmount, paymentMethod, invoiceDiscount]));

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { products, fetchProducts } = useProductStore();
  const { customers } = useCustomerStore();

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map((p) => p.categoryName).filter((c): c is string => !!c)))],
    [products]
  );

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
    const label = customerName || `فاتورة ${suspendedCarts.length + 1}`;
    suspendCart(label, { items, customerId, invoiceDiscount, subtotal, totalVat, grandTotal });
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
      await new Promise((resolve) => setTimeout(resolve, 800));
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
    setShowRefundConfirm(true);
  };

  const confirmRefund = () => {
    toast.success('تم معالجة الإرجاع بنجاح');
    setRefundInvoice(null); setRefundInvoiceNumber(''); setIsRefundMode(false); setShowRefundConfirm(false);
  };

  const handleNumpadInput = (val: string) => {
    if (activePaymentInput === 'cash') {
      if (val === 'backspace') setCashAmount(prev => prev.slice(0, -1));
      else setCashAmount(prev => prev + val);
    } else {
      if (val === 'backspace') setCardAmount(prev => prev.slice(0, -1));
      else setCardAmount(prev => prev + val);
    }
  };

  /* Payment method labels */
  const paymentLabels: Record<string, string> = { cash: 'نقدي', card: 'فيزا', cliq: 'CLIQ', mixed: 'فيزا + نقدي' };

  return (
    <div className="h-full flex gap-4">
      {/* Hidden barcode input */}
      <input ref={barcodeInputRef} type="text" className="absolute opacity-0 w-0 h-0" onKeyDown={handleBarcodeInput} />

      {/* ================================================================ */}
      {/* PRODUCT GRID — 65%                                               */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {isRefundMode ? (
          /* Refund Mode UI */
          <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col h-full">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-destructive-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="w-6 h-6 text-destructive-600" />
              </div>
              <h2 className="text-xl font-bold text-destructive-700">وضع الإرجاع</h2>
              <p className="text-[#747685] mt-1">ابحث عن الفاتورة الأصلية</p>
            </div>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={refundInvoiceNumber}
                onChange={(e) => setRefundInvoiceNumber(e.target.value)}
                placeholder="رقم الفاتورة أو باركود الإيصال..."
                className="flex-1 px-4 py-3 border border-[#c4c5d6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 text-right"
              />
              <button
                onClick={handleSearchInvoiceForRefund}
                disabled={isSearchingInvoice || !refundInvoiceNumber.trim()}
                className="px-6 h-12 bg-primary-700 text-white rounded-xl hover:bg-primary-800 disabled:opacity-50 font-bold transition-colors"
              >
                {isSearchingInvoice ? <Loader2 className="w-5 h-5 animate-spin" /> : 'بحث'}
              </button>
            </div>
            {refundInvoice && (
              <div className="flex-1 overflow-y-auto">
                <div className="bg-[#f4f2fd] rounded-lg p-4 mb-4">
                  <div className="font-bold text-lg mb-1">فاتورة #{refundInvoice.invoiceNumber}</div>
                  <div className="text-sm text-[#747685]">اختر المنتجات والكميات للإرجاع</div>
                </div>
                <div className="space-y-3">
                  {refundInvoice.lines.map((line) => (
                    <div key={line.productId} className="bg-white border border-[#e2e1ec] rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium">{line.name}</div>
                          <div className="text-sm text-[#747685]">{line.unitPrice.toFixed(2)} ر.س × {line.qty}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#747685]">الكمية المراد إرجاعها:</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleRefundQtyChange(line.productId, line.selectedQty - 1)} className="w-10 h-10 rounded-lg bg-[#f4f2fd] flex items-center justify-center hover:bg-[#e2e1ec] transition-colors"><Minus className="w-4 h-4" /></button>
                          <span className="w-10 text-center font-bold">{line.selectedQty}</span>
                          <button onClick={() => handleRefundQtyChange(line.productId, line.selectedQty + 1)} className="w-10 h-10 rounded-lg bg-[#f4f2fd] flex items-center justify-center hover:bg-[#e2e1ec] transition-colors"><Plus className="w-4 h-4" /></button>
                        </div>
                        <span className="text-xs text-[#747685]">الحد الأقصى: {line.qty}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => { setRefundInvoice(null); setRefundInvoiceNumber(''); }} className="flex-1 h-12 px-4 border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] font-medium transition-colors">إلغاء</button>
                  <button onClick={handleProcessRefund} className="flex-1 h-12 px-4 bg-destructive-600 text-white rounded-xl hover:bg-destructive-700 font-bold transition-colors">تأكيد الإرجاع</button>
                </div>
              </div>
            )}
            {!refundInvoice && (
              <div className="flex-1 flex items-center justify-center text-[#747685]">
                <div className="text-center">
                  <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>أدخل رقم الفاتورة للبحث</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4 shrink-0">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#747685]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو الباركود..."
                  className="w-full pr-10 pl-4 py-3 border border-[#c4c5d6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 text-right"
                />
              </div>
            </div>

            {/* Category Chips */}
            {!searchQuery && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  const CatIcon = cat === 'all' ? ShoppingCart : (categoryIcons[cat] || Package);
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors',
                        isActive
                          ? 'bg-primary-700 text-white shadow-sm'
                          : 'bg-white border border-[#c4c5d6] text-[#555f70] hover:bg-[#f4f2fd]'
                      )}
                    >
                      <CatIcon className="w-4 h-4" />
                      <span className="text-sm font-bold">{cat === 'all' ? 'الكل' : cat}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search Results */}
            {searchQuery && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4 max-h-64 overflow-y-auto shrink-0">
                {products.filter((p) => p.nameAr.includes(searchQuery) || (p.barcode && p.barcode.includes(searchQuery))).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#f4f2fd] border-b border-[#e2e1ec] last:border-0 text-right transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary-500" />
                      </div>
                      <div>
                        <div className="font-medium text-[#1a1b22]">{product.nameAr}</div>
                        <div className="text-sm text-[#747685]">{product.barcode}</div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-primary-700">{product.sellPrice.toFixed(2)} ر.س</div>
                      <div className="text-xs text-[#747685]">مخزون: {product.stock ?? 0}</div>
                    </div>
                  </button>
                ))}
                {products.filter((p) => p.nameAr.includes(searchQuery) || (p.barcode && p.barcode.includes(searchQuery))).length === 0 && (
                  <div className="p-4 text-center text-[#747685]">لا توجد نتائج</div>
                )}
              </div>
            )}

            {/* Product Grid */}
            {!searchQuery && (
              <div className="flex-1 bg-white rounded-xl shadow-sm p-4 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto -mx-4 px-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products
                      .filter((p) => selectedCategory === 'all' || p.categoryName === selectedCategory)
                      .map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className={cn(
                            'flex flex-col items-center text-center p-4 rounded-xl border transition-all duration-200',
                            'hover:border-primary-400 hover:shadow-md hover:-translate-y-0.5 active:scale-95',
                            (product.stock ?? 0) <= 0
                              ? 'border-destructive-200 bg-destructive-50/50'
                              : 'border-[#e2e1ec] bg-white'
                          )}
                        >
                          <div className="w-full h-24 rounded-lg bg-primary-50 flex items-center justify-center mb-3">
                            <Package className="w-10 h-10 text-primary-300" />
                          </div>
                          <div className="text-sm font-semibold text-[#1a1b22] line-clamp-2 leading-tight mb-1">
                            {product.nameAr}
                          </div>
                          <div className="text-xs text-primary-700 font-bold">
                            {product.sellPrice.toFixed(2)} ر.س
                          </div>
                          <div className={cn(
                            'text-[10px] mt-1 px-2 py-0.5 rounded-full',
                            (product.stock ?? 0) <= 0
                              ? 'bg-destructive-100 text-destructive-600'
                              : 'bg-[#f4f2fd] text-[#747685]'
                          )}>
                            مخزون: {product.stock ?? 0}
                          </div>
                        </button>
                      ))}
                  </div>
                  {products.length === 0 && (
                    <div className="text-center text-[#747685] py-12">
                      <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">ابدأ بمسح المنتجات أو البحث</p>
                      <p className="text-sm mt-2">استخدم الباركود أو اكتب اسم المنتج</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================================================================ */}
      {/* TRANSACTION / CART PANEL — 35%                                   */}
      {/* ================================================================ */}
      <div className="w-[400px] min-w-[380px] shrink-0 flex flex-col h-full">
        <div className="bg-white rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          {/* Order Header */}
          <div className="p-4 border-b border-[#e2e1ec] flex justify-between items-center bg-[#f4f2fd]">
            <h2 className="text-lg font-bold text-[#1a1b22]">الطلب الحالي</h2>
            <span className="text-sm text-[#747685] bg-white px-2 py-1 rounded-md border border-[#e2e1ec]">#{(suspendedCarts.length + 1).toString().padStart(4, '0')}</span>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#747685]">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-50" />
                <p>السلة فارغة</p>
                <p className="text-sm mt-1">اختر منتجات من القائمة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center pb-3 border-b border-[#e2e1ec] last:border-0 animate-in slide-in-from-right-4 fade-in duration-200"
                  >
                    <div className="text-right">
                      <div className="font-medium text-sm text-[#1a1b22]">{item.name}</div>
                      <div className="text-xs text-[#747685]">{item.barcode}</div>
                    </div>
                    <div className="bg-[#f4f2fd] rounded-xl flex items-center justify-between p-1">
                      <button
                        onClick={() => updateQty(item.productId, item.qty - 1)}
                        className="w-10 h-10 flex items-center justify-center text-[#1a1b22] hover:bg-white rounded-lg transition-all active:scale-95"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-sm px-2">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.qty + 1)}
                        className="w-10 h-10 flex items-center justify-center text-[#1a1b22] hover:bg-white rounded-lg transition-all active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm text-right text-[#1a1b22] font-semibold" dir="ltr">
                      {item.lineTotal.toFixed(2)}
                    </div>
                    <button
                      onClick={() => { removeItem(item.productId); toast.info('تم حذف المنتج'); }}
                      className="w-10 h-10 flex items-center justify-center text-destructive-600 hover:bg-destructive-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary & Payment */}
          <div className="p-4 border-t border-[#e2e1ec] bg-[#faf8ff]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#747685]">المجموع الفرعي</span>
              <span className="text-sm text-[#1a1b22]" dir="ltr">{subtotal.toFixed(2)} ر.س</span>
            </div>
            {invoiceDiscount > 0 && (
              <div className="flex justify-between items-center mb-2 text-success-600">
                <span className="text-sm">الخصم</span>
                <span className="text-sm" dir="ltr">-{invoiceDiscount.toFixed(2)} ر.س</span>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-[#747685]">الضريبة (15%)</span>
              <span className="text-sm text-[#1a1b22]" dir="ltr">{totalVat.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between items-end mb-6">
              <span className="text-lg font-bold text-[#1a1b22]">الإجمالي</span>
              <span className="text-2xl font-bold text-primary-700" dir="ltr">{grandTotal.toFixed(2)} ر.س</span>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['cash', 'card', 'cliq'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => { setPaymentMethod(method); setShowPaymentModal(true); }}
                    className={cn(
                      'h-16 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-sm active:scale-95',
                      paymentMethod === method
                        ? 'border-success-600 bg-success-50'
                        : 'border-[#c4c5d6] bg-white hover:border-success-500 hover:bg-success-50'
                    )}
                  >
                  <CreditCard className={cn('w-5 h-5', paymentMethod === method ? 'text-success-600' : 'text-[#747685]')} />
                  <span className={cn('text-xs font-bold', paymentMethod === method ? 'text-success-700' : 'text-[#1a1b22]')}>
                    {method === 'cash' ? 'نقدي' : method === 'card' ? 'فيزا' : 'CLIQ'}
                  </span>
                </button>
              ))}
            </div>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => setShowDiscountModal(true)} className="flex items-center justify-center gap-2 h-12 px-4 bg-white border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] transition-colors text-sm font-bold">
                <Percent className="w-4 h-4" />خصم
              </button>
              <button onClick={() => setShowCustomerModal(true)} className="flex items-center justify-center gap-2 h-12 px-4 bg-white border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] transition-colors text-sm font-bold">
                <UserPlus className="w-4 h-4" />عميل
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={handleSuspendCart} disabled={items.length === 0} className="flex items-center justify-center gap-2 h-12 px-4 bg-white border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] transition-colors text-sm font-bold disabled:opacity-50">
                <PauseCircle className="w-4 h-4" />تعليق
                {suspendedCarts.length > 0 && (
                  <span className="bg-primary-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{suspendedCarts.length}</span>
                )}
              </button>
              <button onClick={() => setIsRefundMode(!isRefundMode)} className={cn('flex items-center justify-center gap-2 h-12 px-4 rounded-xl transition-colors text-sm font-bold', isRefundMode ? 'bg-destructive-50 text-destructive-700 border border-destructive-200' : 'bg-white border border-[#c4c5d6] hover:bg-[#f4f2fd]')}>
                <RotateCcw className="w-4 h-4" />إرجاع
              </button>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={items.length === 0 || isRefundMode}
              className="w-full h-16 bg-primary-700 hover:bg-primary-800 text-white rounded-xl font-bold text-lg shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-6 h-6" />
              {isProcessingPayment ? <Loader2 className="w-6 h-6 animate-spin" /> : 'دفع وإصدار الفاتورة'}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODALS                                                           */}
      {/* ================================================================ */}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="p-6 border-b border-[#e2e1ec]">
              <h2 className="text-xl font-bold text-center">الدفع</h2>
              <div className="text-center text-2xl font-bold text-primary-700 mt-2">{grandTotal.toFixed(2)} ر.س</div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(['cash', 'card', 'cliq', 'mixed'] as const).map((method) => (
                  <button key={method} onClick={() => setPaymentMethod(method)} className={cn('h-12 px-4 rounded-xl border-2 transition-all active:scale-95 font-bold', paymentMethod === method ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-[#e2e1ec] hover:border-[#c4c5d6]')}>
                    {paymentLabels[method]}
                  </button>
                ))}
              </div>
              {(paymentMethod === 'cash' || paymentMethod === 'card' || paymentMethod === 'mixed') && (
                <div className="space-y-4">
                  <div className={cn("grid gap-2", paymentMethod === 'mixed' ? "grid-cols-2" : "grid-cols-1")}>
                    {(paymentMethod === 'cash' || paymentMethod === 'mixed') && (
                      <div onClick={() => setActivePaymentInput('cash')}>
                        <label className="block text-sm font-medium text-[#555f70] mb-1">المبلغ النقدي</label>
                        <input readOnly type="text" value={cashAmount} placeholder="0.00" className={cn("w-full px-4 py-3 border rounded-lg focus:outline-none text-right text-xl font-bold cursor-pointer transition-all", activePaymentInput === 'cash' ? "border-primary-600 ring-2 ring-primary-600/20" : "border-[#c4c5d6]")} />
                        {paymentMethod === 'cash' && parseFloat(cashAmount) > 0 && <div className={cn('mt-1 text-center font-bold text-sm', getChange() >= 0 ? 'text-success-600' : 'text-destructive-600')}>الباقي: {getChange().toFixed(2)} ر.س</div>}
                      </div>
                    )}
                    {(paymentMethod === 'card' || paymentMethod === 'mixed') && (
                      <div onClick={() => setActivePaymentInput('card')}>
                        <label className="block text-sm font-medium text-[#555f70] mb-1">المبلغ بالبطاقة</label>
                        <input readOnly type="text" value={cardAmount} placeholder="0.00" className={cn("w-full px-4 py-3 border rounded-lg focus:outline-none text-right text-xl font-bold cursor-pointer transition-all", activePaymentInput === 'card' ? "border-primary-600 ring-2 ring-primary-600/20" : "border-[#c4c5d6]")} />
                      </div>
                    )}
                  </div>
                  
                  {paymentMethod === 'mixed' && (
                    <div className="text-center text-sm font-bold">
                      {(() => { const c = parseFloat(cashAmount) || 0; const d = parseFloat(cardAmount) || 0; const r = grandTotal - (c + d); if (r > 0) return <span className="text-destructive-600">المبلغ المتبقي: {r.toFixed(2)} ر.س</span>; else if (r < 0) return <span className="text-warning-600">زيادة: {Math.abs(r).toFixed(2)} ر.س</span>; else return <span className="text-success-600">المبلغ صحيح ✓</span>; })()}
                    </div>
                  )}

                  {/* Numpad */}
                  <div className="grid grid-cols-3 gap-2">
                    {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'backspace'].map((key) => (
                      <button
                        key={key}
                        onClick={() => handleNumpadInput(key)}
                        className="h-14 bg-[#f4f2fd] rounded-xl text-xl font-bold text-[#1a1b22] hover:bg-[#e2e1ec] active:scale-95 transition-all flex items-center justify-center"
                      >
                        {key === 'backspace' ? <span className="text-2xl">⌫</span> : key}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#e2e1ec] space-y-2">
              <button onClick={() => setShowReceiptPreview(true)} className="w-full flex items-center justify-center gap-2 h-12 px-4 border border-[#e2e1ec] rounded-xl hover:bg-[#f4f2fd] transition-colors text-sm font-medium text-[#555f70]">
                <Receipt className="w-4 h-4" />
                معاينة الإيصال
              </button>
              <div className="flex gap-3">
                <button onClick={() => setShowPaymentModal(false)} className="flex-1 h-12 px-4 border border-[#e2e1ec] rounded-xl hover:bg-[#f4f2fd] transition-colors font-medium">إلغاء</button>
                <button onClick={handlePayment} disabled={!isPaymentValid() || isProcessingPayment} className="flex-1 h-12 px-4 bg-primary-700 text-white rounded-xl hover:bg-primary-800 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                  {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'تأكيد البيع'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="p-6 border-b border-[#e2e1ec] text-center">
              <h2 className="text-lg font-bold">{storeInfo.nameAr}</h2>
              <p className="text-xs text-[#747685] mt-1">{storeInfo.address}</p>
              <p className="text-xs text-[#747685]">الرقم الضريبي: {storeInfo.vatNumber}</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="text-center text-xs text-[#747685] border-b border-dashed border-[#e2e1ec] pb-2">
                {new Date().toLocaleString('ar-SA')}
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span>{item.name} × {item.qty}</span>
                    <span className="font-medium">{item.lineTotal.toFixed(2)} ر.س</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-[#e2e1ec] pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-[#747685]">المجموع</span><span>{subtotal.toFixed(2)} ر.س</span></div>
                {invoiceDiscount > 0 && <div className="flex justify-between text-success-600"><span>الخصم</span><span>-{invoiceDiscount.toFixed(2)} ر.س</span></div>}
                <div className="flex justify-between"><span className="text-[#747685]">الضريبة (15%)</span><span>{totalVat.toFixed(2)} ر.س</span></div>
                <div className="flex justify-between text-lg font-bold pt-1"><span>الإجمالي</span><span>{grandTotal.toFixed(2)} ر.س</span></div>
              </div>
              <div className="text-center text-[10px] text-[#747685] pt-2">شكراً لزيارتكم</div>
            </div>
            <div className="p-4 border-t border-[#e2e1ec]">
              <button onClick={() => setShowReceiptPreview(false)} className="w-full h-12 px-4 bg-[#f4f2fd] rounded-xl hover:bg-[#e2e1ec] text-sm font-bold transition-colors">إغلاق المعاينة</button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-[#e2e1ec]"><h2 className="text-xl font-bold">اختيار العميل</h2></div>
            <div className="p-6 max-h-80 overflow-y-auto">
              <button onClick={() => { setCustomer(null, null); setShowCustomerModal(false); }} className="w-full text-right p-3 rounded-lg hover:bg-[#f4f2fd] mb-2 border border-[#e2e1ec]"><div className="font-medium">عميل نقدي</div></button>
              {customers.map((customer) => (
                <button key={customer.id} onClick={() => { setCustomer(customer.id, customer.nameAr); setShowCustomerModal(false); }} className={cn('w-full text-right p-3 rounded-lg hover:bg-[#f4f2fd] mb-2 border', customerId === customer.id ? 'border-primary-600 bg-primary-50' : 'border-[#e2e1ec]')}>
                  <div className="font-medium">{customer.nameAr}</div>
                  <div className="text-sm text-[#747685]">{customer.phone}</div>
                  {customer.vatNumber && <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">B2B</span>}
                </button>
              ))}
            </div>
            <div className="p-6 border-t border-[#e2e1ec]">
              <button onClick={() => setShowCustomerModal(false)} className="w-full h-12 px-4 border border-[#e2e1ec] rounded-xl hover:bg-[#f4f2fd] font-medium transition-colors">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="p-6 border-b border-[#e2e1ec]"><h2 className="text-xl font-bold">خصم على الفاتورة</h2></div>
            <div className="p-6">
              <input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 border border-[#c4c5d6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 text-right text-xl font-bold" />
            </div>
            <div className="p-6 border-t border-[#e2e1ec] flex gap-3">
              <button onClick={() => setShowDiscountModal(false)} className="flex-1 h-12 px-4 border border-[#e2e1ec] rounded-xl hover:bg-[#f4f2fd] font-medium transition-colors">إلغاء</button>
              <button onClick={() => { setInvoiceDiscount(parseFloat(discountAmount) || 0); setShowDiscountModal(false); toast.success('تم تطبيق الخصم'); }} className="flex-1 h-12 px-4 bg-primary-700 text-white rounded-xl hover:bg-primary-800 font-bold transition-colors">تطبيق</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Modal */}
      {showSuccessModal && lastInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#1a1b22] mb-1">تمت العملية بنجاح!</h2>
              <p className="text-[#747685]">فاتورة رقم {lastInvoice.invoiceNumber}</p>
            </div>

            <div className="px-6 pb-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#747685]">المجموع الفرعي:</span>
                <span className="font-medium">{lastInvoice.subtotal.toFixed(2)} ر.س</span>
              </div>
              {lastInvoice.discount > 0 && (
                <div className="flex justify-between text-sm text-success-600">
                  <span>الخصم:</span>
                  <span>-{lastInvoice.discount.toFixed(2)} ر.س</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[#747685]">الضريبة:</span>
                <span className="font-medium">{lastInvoice.vatTotal.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#e2e1ec]">
                <span>الإجمالي:</span>
                <span className="text-primary-700">{lastInvoice.total.toFixed(2)} ر.س</span>
              </div>

              {/* QR Placeholder */}
              <div className="bg-[#f4f2fd] rounded-lg p-4 text-center mt-4">
                <div className="text-sm text-[#747685] mb-2">رمز الاستجابة السريعة (ZATCA QR)</div>
                <div className="w-32 h-32 bg-[#e2e1ec] rounded-lg mx-auto flex items-center justify-center">
                  <span className="text-[#747685] text-xs">QR placeholder</span>
                </div>
                <p className="text-xs text-[#747685] mt-2">سيتم إنشاء QR بواسطة Dev B</p>
              </div>
            </div>

            <div className="p-6 border-t border-[#e2e1ec] space-y-2">
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
                  'w-full flex items-center justify-center gap-2 h-12 px-4 rounded-xl font-bold disabled:opacity-50 transition-colors',
                  printError
                    ? 'bg-destructive-600 text-white hover:bg-destructive-700'
                    : 'bg-primary-700 text-white hover:bg-primary-800'
                )}
              >
                {isPrintingReceipt ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                {isPrintingReceipt ? 'جاري الطباعة...' : printError ? 'إعادة المحاولة' : 'طباعة الإيصال'}
              </button>
              <button
                onClick={() => { setShowSuccessModal(false); setLastInvoice(null); setPrintError(false); }}
                className="w-full h-12 px-4 border border-[#e2e1ec] rounded-xl hover:bg-[#f4f2fd] transition-colors font-medium"
              >
                بيع جديد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirmation Modal */}
      {showRefundConfirm && refundInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-destructive-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="w-7 h-7 text-destructive-600" />
              </div>
              <h2 className="text-lg font-bold text-[#1a1b22]">تأكيد الإرجاع</h2>
              <p className="text-sm text-[#747685] mt-1">
                هل أنت متأكد من إرجاع المنتجات المحددة؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="space-y-2 mb-6">
              {refundInvoice.lines.filter((l) => l.selectedQty > 0).map((line) => (
                <div key={line.productId} className="flex justify-between text-sm bg-[#f4f2fd] rounded-lg p-3">
                  <span className="font-medium">{line.name}</span>
                  <span className="text-[#747685]">{line.selectedQty} × {line.unitPrice.toFixed(2)} ر.س</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRefundConfirm(false)} className="flex-1 h-12 px-4 border border-[#e2e1ec] rounded-xl hover:bg-[#f4f2fd] font-medium transition-colors">إلغاء</button>
              <button onClick={confirmRefund} className="flex-1 h-12 px-4 bg-destructive-600 text-white rounded-xl hover:bg-destructive-700 font-bold transition-colors">تأكيد الإرجاع</button>
            </div>
          </div>
        </div>
      )}

      {/* Suspended Invoices Drawer */}
      {showSuspendedDrawer && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl">
            <div className="p-4 border-b border-[#e2e1ec] flex items-center justify-between">
              <h2 className="text-lg font-bold">الفواتير المعلقة</h2>
              <button onClick={() => setShowSuspendedDrawer(false)} className="w-10 h-10 flex items-center justify-center hover:bg-[#f4f2fd] rounded-xl text-[#747685] transition-colors">✕</button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-4rem)]">
              {suspendedCarts.length === 0 ? (
                <div className="text-center text-[#747685] py-8">لا توجد فواتير معلقة</div>
              ) : suspendedCarts.map((cart) => (
                <div key={cart.id} className="bg-white border border-[#e2e1ec] rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-sm text-[#1a1b22]">{cart.label}</div>
                      <div className="text-[11px] text-[#747685] mt-0.5">
                        {new Date(cart.createdAt).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <button onClick={() => deleteSuspended(cart.id)} className="w-10 h-10 flex items-center justify-center rounded-lg text-[#747685] hover:text-destructive-600 hover:bg-destructive-50 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {cart.items.slice(0, 3).map((item) => (
                      <span key={item.productId} className="px-2 py-0.5 bg-[#f4f2fd] rounded text-[10px] text-[#555f70] border border-[#e2e1ec]">
                        {item.name} ×{item.qty}
                      </span>
                    ))}
                    {cart.items.length > 3 && (
                      <span className="px-2 py-0.5 bg-[#f4f2fd] rounded text-[10px] text-[#747685] border border-[#e2e1ec]">+{cart.items.length - 3}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[#747685]">{cart.itemCount} منتجات</div>
                    <div className="text-sm font-bold text-primary-700">{cart.grandTotal.toFixed(2)} ر.س</div>
                  </div>
                  <button onClick={() => handleRestoreCart(cart.id)} className="w-full mt-3 h-11 bg-primary-700 text-white rounded-xl hover:bg-primary-800 text-sm font-bold transition-colors">استعادة</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
