import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Lock, Unlock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLocked, failedAttempts, resetFailedAttempts, isLoading } = useAuthStore();
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(30);

  useEffect(() => {
    if (isLocked) {
      const interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            resetFailedAttempts();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, resetFailedAttempts]);

  const handleDigit = (digit: string) => {
    if (isLocked || isLoading || pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      handleSubmit(newPin);
    }
  };

  const handleSubmit = async (pinValue: string) => {
    const success = await login(pinValue);
    if (success) {
      navigate('/pos');
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin('');
    }
  };

  const handleClear = () => {
    if (!isLoading) setPin('');
  };

  const handleBackspace = () => {
    if (!isLoading) setPin((prev) => prev.slice(0, -1));
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
      <div className={`bg-white rounded-2xl shadow-xl p-8 w-full max-w-md ${shake ? 'animate-shake' : ''}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {isLocked ? (
              <Lock className="w-8 h-8 text-primary-600" />
            ) : (
              <Unlock className="w-8 h-8 text-primary-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#1a1b22] mb-2">تسجيل الدخول</h1>
          <p className="text-[#747685]">أدخل الرمز السري</p>
        </div>

        {isLocked ? (
          <div className="text-center py-8">
            <div className="text-destructive-600 font-semibold text-lg mb-2">
              الحساب مقفل مؤقتاً
            </div>
            <div className="text-[#747685]">
              يرجى الانتظار {lockoutTimer} ثانية
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-4 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-colors ${
                    i < pin.length ? 'bg-primary-600' : 'bg-[#e2e1ec]'
                  }`}
                />
              ))}
            </div>

            {failedAttempts > 0 && (
              <div className="text-center mb-4 text-destructive-600 text-sm">
                محاولات خاطئة: {failedAttempts} / 5
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {digits.map((digit) => {
                  if (digit === 'C') {
                    return (
                      <button
                        key={digit}
                        onClick={handleClear}
                        className="h-14 rounded-xl bg-[#f4f2fd] hover:bg-[#e2e1ec] font-semibold text-[#555f70] transition-colors"
                      >
                        مسح
                      </button>
                    );
                  }
                  if (digit === '⌫') {
                    return (
                      <button
                        key={digit}
                        onClick={handleBackspace}
                        className="h-14 rounded-xl bg-[#f4f2fd] hover:bg-[#e2e1ec] font-semibold text-[#555f70] transition-colors"
                      >
                        حذف
                      </button>
                    );
                  }
                  return (
                    <button
                      key={digit}
                      onClick={() => handleDigit(digit)}
                      className="h-14 rounded-xl bg-white border-2 border-[#e2e1ec] hover:border-primary-400 hover:bg-primary-50 text-xl font-semibold text-[#1a1b22] transition-colors"
                    >
                      {digit}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className="mt-6 text-center text-xs text-[#747685]">
          نظام نقاط البيع - ElitePOS Saudi v1.0
        </div>
      </div>
    </div>
  );
}
