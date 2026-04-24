import { useState } from 'react';
import { Search, Plus, Pencil, Folder, Package, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProductStore } from '../store/useProductStore';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import type { Product, ProductInput } from '../types';

export default function InventoryPage() {
  const toast = useToast();
  const { products, categories, searchQuery, selectedCategory, addProduct, updateProduct, toggleActive, setSearchQuery, setSelectedCategory } = useProductStore();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [, setShowCategoryManager] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const itemsPerPage = 50;

  const [formData, setFormData] = useState<ProductInput>({
    barcode: '',
    nameAr: '',
    nameEn: '',
    categoryId: '',
    unit: 'piece',
    sellPrice: 0,
    costPrice: 0,
    vatRate: 15,
    stockQty: 0,
    minStock: 0,
    isActive: true,
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch = !searchQuery || 
      product.nameAr.includes(searchQuery) || 
      product.barcode.includes(searchQuery);
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        barcode: product.barcode,
        nameAr: product.nameAr,
        nameEn: product.nameEn || '',
        categoryId: product.categoryId,
        unit: product.unit,
        sellPrice: product.sellPrice,
        costPrice: product.costPrice,
        vatRate: product.vatRate,
        stockQty: product.stockQty,
        minStock: product.minStock,
        isActive: product.isActive,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        barcode: '',
        nameAr: '',
        nameEn: '',
        categoryId: categories[0]?.id || '',
        unit: 'piece',
        sellPrice: 0,
        costPrice: 0,
        vatRate: 15,
        stockQty: 0,
        minStock: 0,
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
        toast.success('تم تحديث المنتج بنجاح');
      } else {
        await addProduct(formData);
        toast.success('تم إضافة المنتج بنجاح');
      }
      setShowModal(false);
      setEditingProduct(null);
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ المنتج');
    } finally {
      setIsSaving(false);
    }
  };

  const lowStockCount = products.filter((p) => p.stockQty <= p.minStock).length;

  return (
    <div className="min-h-full bg-[#F8F9FA] -m-6 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-[#1a1b22] tracking-tight">إدارة المخزون</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-3 px-6 h-14 bg-primary-700 text-white rounded-xl hover:bg-primary-800 transition-colors shadow-md text-base font-bold"
        >
          <Plus className="w-5 h-5" />
          إضافة منتج
        </button>
      </div>

      {/* Low Stock Alert — Touch-Optimized */}
      {lowStockCount > 0 && (
        <div className="bg-destructive-50 border border-destructive-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-destructive-100 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-destructive-600" />
          </div>
          <div>
            <div className="text-base font-bold text-destructive-700">
              {lowStockCount} منتجات بمخزون منخفض
            </div>
            <div className="text-sm text-destructive-500">يرجى مراجعة المنتجات وإعادة الطلب</div>
          </div>
        </div>
      )}

      {/* Filters — Touch-Optimized */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-[#e2e1ec] flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#555f70]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="البحث في النظام (المخزون)..."
            className="w-full pr-10 pl-4 h-12 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right text-sm bg-[#f8f9fa]"
          />
        </div>
        <select
          value={selectedCategory || ''}
          onChange={(e) => {
            setSelectedCategory(e.target.value || null);
            setCurrentPage(1);
          }}
          className="px-4 h-12 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-sm bg-white min-w-[160px]"
        >
          <option value="">جميع الفئات</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowCategoryManager(true)}
          className="flex items-center gap-2 px-5 h-12 border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] transition-colors text-sm font-semibold bg-white"
        >
          <Folder className="w-5 h-5" />
          الفئات
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#e2e1ec]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F1F5F9]">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">الباركود</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">الاسم</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">الفئة</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">السعر</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">الضريبة</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">المخزون</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">الحالة</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-[#1a1b22]">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e1ec]">
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-[#f4f2fd] transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[#1a1b22]">{product.barcode}</td>
                  <td className="px-6 py-4 text-sm text-[#1a1b22] font-semibold">{product.nameAr}</td>
                  <td className="px-6 py-4 text-sm text-[#555f70]">{product.categoryName}</td>
                  <td className="px-6 py-4 text-sm font-bold text-[#1a1b22]">{product.sellPrice.toFixed(2)} ر.س</td>
                  <td className="px-6 py-4 text-sm text-[#555f70]">{product.vatRate}%</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        product.stockQty <= product.minStock ? 'text-destructive-600 font-bold' : 'text-[#1a1b22] font-medium'
                      )}>
                        {product.stockQty}
                      </span>
                      {product.stockQty <= product.minStock && (
                        <span className="px-2 py-1 rounded-full bg-destructive-100 text-destructive-600 text-[10px] font-bold">
                          منخفض
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(product.id)}
                      className={cn(
                        'w-12 h-7 rounded-full transition-colors relative',
                        product.isActive ? 'bg-success-500' : 'bg-[#c4c5d6]'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full bg-white absolute top-1 transition-transform shadow-sm',
                        product.isActive ? 'left-6' : 'left-1'
                      )} />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="w-11 h-11 flex items-center justify-center text-[#747685] hover:text-primary-700 hover:bg-primary-50 rounded-full transition-colors"
                        title="تعديل"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginatedProducts.length === 0 && (
          <div className="text-center py-16 text-[#747685]">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-4">لا توجد منتجات</p>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-6 h-12 bg-primary-50 text-primary-700 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors font-semibold"
            >
              <Plus className="w-5 h-5" />
              إضافة أول منتج
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-6 border-t border-[#e2e1ec]">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 h-11 border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] disabled:opacity-50 text-sm font-semibold flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </button>
            <span className="text-sm text-[#555f70] font-medium px-4">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 h-11 border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] disabled:opacity-50 text-sm font-semibold flex items-center gap-1"
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-[#e2e1ec]">
            <div className="p-6 border-b border-[#e2e1ec]">
              <h2 className="text-xl font-bold">{editingProduct ? 'تعديل منتج' : 'إضافة منتج'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#555f70] mb-1">الباركود *</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full px-4 py-3 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#555f70] mb-1">الاسم (عربي) *</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full px-4 py-3 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#555f70] mb-1">الاسم (English)</label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full px-4 py-3 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#555f70] mb-1">الفئة *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-3 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#555f70] mb-1">سعر البيع *</label>
                  <input
                    type="number"
                    value={formData.sellPrice}
                    onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#555f70] mb-1">سعر التكلفة *</label>
                  <input
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#555f70] mb-1">المخزون *</label>
                  <input
                    type="number"
                    value={formData.stockQty}
                    onChange={(e) => setFormData({ ...formData, stockQty: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#555f70] mb-1">الحد الأدنى</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-[#c4c5d6] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-right"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#e2e1ec] flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 border border-[#c4c5d6] rounded-xl hover:bg-[#f4f2fd] font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.barcode || !formData.nameAr || formData.sellPrice <= 0 || isSaving}
                className="flex-1 px-4 py-3 bg-primary-700 text-white rounded-xl hover:bg-primary-800 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
