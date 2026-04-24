import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-[#e2e1ec]">
            <div className="w-16 h-16 bg-destructive-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive-600" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1b22] mb-2">
              عذراً، حدث خطأ غير متوقع
            </h2>
            <p className="text-[#747685] mb-6">
              نعتذر عن الإزعاج. يرجى تحديث الصفحة أو المحاولة مرة أخرى.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 h-12 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-bold mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              إعادة تحميل التطبيق
            </button>
            {this.state.error && (
              <div className="mt-6 p-4 bg-[#f4f2fd] rounded-xl text-right border border-[#e2e1ec]">
                <div className="text-xs text-[#747685] mb-1">تفاصيل الخطأ:</div>
                <div className="text-sm text-[#555f70] font-mono">
                  {this.state.error.message}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
