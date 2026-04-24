import { useState } from 'react';
import { Search, Plus, Pencil, Folder, Package, Loader2 } from 'lucide-react';
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
      (product.barcode || '').includes(searchQuery);
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
        barcode: product.barcode || '',
        nameAr: product.nameAr,
        nameEn: product.nameEn ?? '',
        categoryId: product.categoryId ?? '',
        unit: product.unit,
        sellPrice: product.sellPrice,
        costPrice: product.costPrice,
        vatRate: product.vatRate,
        stockQty: product.stockQty ?? 0,
        minStock: product.minStock ?? 0,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">إدارة المخزون</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة منتج
        </button>
      </div>

      {/* Low Stock Summary */}
      {products.some((p) => (p.stockQty ?? 0) <= (p.minStock ?? 0)) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
            <Package className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-rose-700">
              {products.filter((p) => (p.stockQty ?? 0) <= (p.minStock ?? 0)).length} منتجات بمخزون منخفض
            </div>
            <div className="text-xs text-rose-500">يرجى مراجعة المنتجات وإعادة الطلب</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ابحث بالاسم أو الباركود..."
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
          />
        </div>
        <select
          value={selectedCategory || ''}
          onChange={(e) => {
            setSelectedCategory(e.target.value || null);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">جميع الفئات</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.nameAr}</option>
          ))}
        </select>
        <button
          onClick={() => setShowCategoryManager(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <Folder className="w-4 h-4" />
          الفئات
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الباركود</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الفئة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">السعر</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الضريبة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المخزون</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{product.barcode}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{product.nameAr}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{product.categoryName}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.sellPrice.toFixed(2)} ر.س</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{product.vatRate}%</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        (product.stockQty ?? 0) <= (product.minStock ?? 0) ? 'text-destructive-600 font-bold' : 'text-gray-900'
                      )}>
                        {product.stockQty}
                      </span>
                      {(product.stockQty ?? 0) <= (product.minStock ?? 0) && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[10px] font-bold">
                          مخزون منخفض
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(product.id)}
                      className={cn(
                        'w-10 h-6 rounded-full transition-colors relative',
                        product.isActive ? 'bg-success-500' : 'bg-gray-300'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform',
                        product.isActive ? 'left-5' : 'left-1'
                      )} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginatedProducts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد منتجات</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-200">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              السابق
            </button>
            <span className="text-sm text-gray-600">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">{editingProduct ? 'تعديل منتج' : 'إضافة منتج'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الباركود *</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                />
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">الفئة *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nameAr}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع *</label>
                  <input
                    type="number"
                    value={formData.sellPrice}
                    onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر التكلفة *</label>
                  <input
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المخزون *</label>
                  <input
                    type="number"
                    value={formData.stockQty}
                    onChange={(e) => setFormData({ ...formData, stockQty: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                </div>
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
                disabled={!formData.barcode || !formData.nameAr || formData.sellPrice <= 0 || isSaving}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
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
