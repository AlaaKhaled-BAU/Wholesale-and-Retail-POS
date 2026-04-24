import { useState } from 'react';
import { useToast } from '../hooks/useToast';
import { completeSetup } from '../lib/tauri-commands';

import ToastContainer from '../components/common/ToastContainer';

export default function FirstRunSetupPage({ onComplete }: { onComplete?: () => void }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [branchNameAr, setBranchNameAr] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [address, setAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [branchPrefix, setBranchPrefix] = useState('BR1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!branchNameAr || !adminName || !adminPin || adminPin.length !== 4) {
      toast.error('يُرجى ملء جميع الحقول المطلوبة وإدخال PIN مكون من 4 أرقام');
      return;
    }
    setIsSubmitting(true);
    try {
      await completeSetup({
        branchNameAr,
        vatNumber,
        crNumber,
        address,
        adminName,
        adminPin,
        branchPrefix,
      });
      toast.success('تم إعداد النظام بنجاح');
      if (onComplete) onComplete();
      else window.location.reload();
    } catch (err: any) {
      toast.error(err?.message || 'فشل في إعداد النظام');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">إعداد النظام لأول مرة</h1>
        <p className="text-gray-500 text-center mb-8">أكمل المعلومات التالية لبدء استخدام النظام</p>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفرع *</label>
              <input
                type="text"
                value={branchNameAr}
                onChange={(e) => setBranchNameAr(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="مثال: الفرع الرئيسي"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الرقم الضريبي</label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="310123456700003"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السجل التجاري</label>
              <input
                type="text"
                value={crNumber}
                onChange={(e) => setCrNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="1010123456"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="الرياض، حي العليا..."
              />
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!branchNameAr}
              className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المدير *</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="مثال: أحمد محمد"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN المدير (4 أرقام) *</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-center tracking-widest text-xl"
                placeholder="••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">بادئة رقم الفاتورة</label>
              <input
                type="text"
                value={branchPrefix}
                onChange={(e) => setBranchPrefix(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="BR1"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !adminName || adminPin.length !== 4}
                className="flex-1 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الإعداد...' : 'إنهاء الإعداد'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
