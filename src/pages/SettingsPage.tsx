import { useState } from 'react';
import { Store, Printer, Users, Percent, Barcode, Shield, Save, TestTube, Plus, Pencil, Power, X } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const toast = useToast();
  const {
    storeInfo,
    printer,
    tax,
    barcode,
    zatca,
    updateStoreInfo,
    updatePrinter,
    updateTax,
    updateBarcode,
    updateZATCA,
  } = useSettingsStore();

  const [activeSection, setActiveSection] = useState<'store' | 'printer' | 'users' | 'tax' | 'barcode' | 'zatca'>('store');

  // Users management state
  const [users, setUsers] = useState([
    { id: '1', name: 'أحمد محمد', role: 'cashier', branchId: '1', isActive: true, pin: '1234' },
    { id: '2', name: 'خالد العلي', role: 'manager', branchId: '1', isActive: true, pin: '5678' },
  ]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<typeof users[0] | null>(null);
  const [userForm, setUserForm] = useState({ name: '', role: 'cashier' as const, pin: '', confirmPin: '', isActive: true });

  const roles = [
    { value: 'admin', label: 'مسؤول' },
    { value: 'manager', label: 'مدير' },
    { value: 'cashier', label: 'كاشير' },
    { value: 'stock', label: 'مخزن' },
    { value: 'accountant', label: 'محاسب' },
  ];

  const handleSaveUser = () => {
    if (!userForm.name || !userForm.pin) {
      toast.error('الاسم والرمز السري مطلوبان');
      return;
    }
    if (userForm.pin !== userForm.confirmPin) {
      toast.error('الرمز السري غير متطابق');
      return;
    }
    if (userForm.pin.length !== 4) {
      toast.error('الرمز السري يجب أن يكون 4 أرقام');
      return;
    }
    if (editingUser) {
      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, name: userForm.name, role: userForm.role, pin: userForm.pin, isActive: userForm.isActive } : u)));
      toast.success('تم تحديث المستخدم بنجاح');
    } else {
      setUsers([...users, { id: String(Date.now()), name: userForm.name, role: userForm.role, branchId: '1', isActive: userForm.isActive, pin: userForm.pin }]);
      toast.success('تم إضافة المستخدم بنجاح');
    }
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm({ name: '', role: 'cashier', pin: '', confirmPin: '', isActive: true });
  };

  const handleToggleUser = (id: string) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)));
    toast.info('تم تغيير حالة المستخدم');
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({ name: '', role: 'cashier', pin: '', confirmPin: '', isActive: true });
    setShowUserModal(true);
  };

  const openEditUser = (user: typeof users[0]) => {
    setEditingUser(user);
    setUserForm({ name: user.name, role: user.role as any, pin: '', confirmPin: '', isActive: user.isActive });
    setShowUserModal(true);
  };

  const sections = [
    { id: 'store' as const, label: 'معلومات المتجر', icon: Store },
    { id: 'printer' as const, label: 'الطابعة', icon: Printer },
    { id: 'users' as const, label: 'المستخدمون', icon: Users },
    { id: 'tax' as const, label: 'الضرائب', icon: Percent },
    { id: 'barcode' as const, label: 'الباركود', icon: Barcode },
    { id: 'zatca' as const, label: 'ZATCA', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
      </div>

      <div className="flex gap-6">
        {/* Settings Sidebar */}
        <div className="w-64 bg-white rounded-xl shadow-sm p-4">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors',
                    activeSection === section.id
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
          {/* Store Info Section */}
          {activeSection === 'store' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-6">معلومات المتجر</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المتجر (عربي)</label>
                  <input
                    type="text"
                    value={storeInfo.nameAr}
                    onChange={(e) => updateStoreInfo({ nameAr: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المتجر (English)</label>
                  <input
                    type="text"
                    value={storeInfo.nameEn}
                    onChange={(e) => updateStoreInfo({ nameEn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                  <textarea
                    value={storeInfo.address}
                    onChange={(e) => updateStoreInfo({ address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرقم الضريبي</label>
                  <input
                    type="text"
                    value={storeInfo.vatNumber}
                    onChange={(e) => updateStoreInfo({ vatNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السجل التجاري</label>
                  <input
                    type="text"
                    value={storeInfo.crNumber}
                    onChange={(e) => updateStoreInfo({ crNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="mt-8 p-6 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-medium text-gray-500 mb-4">معاينة ترويسة الإيصال</h3>
                <div className="bg-white p-6 rounded-lg text-center space-y-2">
                  <div className="font-bold text-lg">{storeInfo.nameAr}</div>
                  <div className="text-sm text-gray-500">{storeInfo.nameEn}</div>
                  <div className="text-sm text-gray-500">{storeInfo.address}</div>
                  <div className="text-sm">الرقم الضريبي: {storeInfo.vatNumber}</div>
                  <div className="text-sm">السجل التجاري: {storeInfo.crNumber}</div>
                </div>
              </div>
            </div>
          )}

          {/* Printer Section */}
          {activeSection === 'printer' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-6">إعدادات الطابعة</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع الطابعة</label>
                  <select
                    value={printer.type}
                    onChange={(e) => updatePrinter({ type: e.target.value as 'usb' | 'serial' })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="usb">USB</option>
                    <option value="serial">Serial (COM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">منفذ COM</label>
                  <select
                    value={printer.port}
                    onChange={(e) => updatePrinter({ port: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Array.from({ length: 9 }, (_, i) => (
                      <option key={i} value={`COM${i + 1}`}>COM{i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">عرض الورق</label>
                  <select
                    value={printer.paperWidth}
                    onChange={(e) => updatePrinter({ paperWidth: parseInt(e.target.value) as 58 | 80 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={58}>58mm</option>
                    <option value={80}>80mm</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  <TestTube className="w-4 h-4" />
                  اختبار الطباعة
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  البحث التلقائي
                </button>
              </div>
            </div>
          )}

          {/* Users Section */}
          {activeSection === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">إدارة المستخدمين</h2>
                <button
                  onClick={openAddUser}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مستخدم
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الاسم</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الدور</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الفرع</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الحالة</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                            {roles.find((r) => r.value === user.role)?.label || user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">فرع {user.branchId}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-medium', user.isActive ? 'text-success-600' : 'text-gray-400')}>
                            {user.isActive ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditUser(user)}
                              className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                              title="تعديل"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleUser(user.id)}
                              className={cn(
                                'p-1 transition-colors',
                                user.isActive ? 'text-gray-400 hover:text-destructive-500' : 'text-gray-400 hover:text-success-500'
                              )}
                              title={user.isActive ? 'تعطيل' : 'تفعيل'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tax Section */}
          {activeSection === 'tax' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-6">إعدادات الضرائب</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نسبة ضريبة القيمة المضافة الافتراضية</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={tax.defaultVatRate}
                    onChange={(e) => updateTax({ defaultVatRate: parseFloat(e.target.value) || 0 })}
                    className="w-32 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                  <span className="text-gray-500">%</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">القيمة الافتراضية: 15% (حسب نظام ZATCA)</p>
              </div>
            </div>
          )}

          {/* Barcode Section */}
          {activeSection === 'barcode' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-6">إعدادات الباركود</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مهلة الماسح الضوئي</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={100}
                    max={300}
                    step={10}
                    value={barcode.scannerTimeout}
                    onChange={(e) => updateBarcode({ scannerTimeout: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="w-16 text-center font-medium">{barcode.scannerTimeout}ms</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">الوقت المسموح به بين إدخال الأحرف لاعتبارها مسحاً ضوئياً</p>
              </div>
            </div>
          )}

          {/* ZATCA Section */}
          {activeSection === 'zatca' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-6">إعدادات ZATCA</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-500">حالة CSID</div>
                    <div className={cn(
                      'text-lg font-bold',
                      zatca.csidStatus === 'active' ? 'text-success-600' :
                      zatca.csidStatus === 'expired' ? 'text-destructive-600' :
                      'text-warning-600'
                    )}>
                      {zatca.csidStatus === 'active' && 'نشط'}
                      {zatca.csidStatus === 'expired' && 'منتهي'}
                      {zatca.csidStatus === 'pending' && 'معلق'}
                    </div>
                  </div>
                  <div className={cn(
                    'w-4 h-4 rounded-full',
                    zatca.csidStatus === 'active' ? 'bg-success-500' :
                    zatca.csidStatus === 'expired' ? 'bg-destructive-500' :
                    'bg-warning-500'
                  )} />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-500">حالة الجهاز</div>
                    <div className="text-lg font-bold">
                      {zatca.deviceRegistered ? 'مسجل ✓' : 'غير مسجل'}
                    </div>
                  </div>
                </div>

                {zatca.pendingInvoices > 0 && (
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500">الفواتير المعلقة</div>
                      <div className="text-lg font-bold text-warning-600">
                        {zatca.pendingInvoices} فاتورة
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => updateZATCA({ deviceRegistered: true, csidStatus: 'active' })}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  تسجيل الجهاز
                </button>
                {zatca.pendingInvoices > 0 && (
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    إعادة إرسال الفواتير المعلقة
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-6 border-t border-gray-200">
            <button onClick={() => toast.success('تم حفظ الإعدادات بنجاح')} className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-bold">
              <Save className="w-4 h-4" />
              حفظ الإعدادات
            </button>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم'}</h2>
              <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الدور *</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {roles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{editingUser ? 'رمز سري جديد (اختياري)' : 'الرمز السري *'}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={userForm.pin}
                  onChange={(e) => setUserForm({ ...userForm, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="4 أرقام"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد الرمز السري *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={userForm.confirmPin}
                  onChange={(e) => setUserForm({ ...userForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="4 أرقام"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                />
              </div>
              {editingUser && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="user-active"
                    checked={userForm.isActive}
                    onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="user-active" className="text-sm">المستخدم نشط</label>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button onClick={() => setShowUserModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">إلغاء</button>
              <button
                onClick={handleSaveUser}
                disabled={!userForm.name || (!editingUser && (!userForm.pin || userForm.pin.length !== 4))}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold disabled:opacity-50"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
