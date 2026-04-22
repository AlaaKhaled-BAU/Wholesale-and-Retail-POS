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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-destructive-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              عذراً، حدث خطأ غير متوقع
            </h2>
            <p className="text-gray-500 mb-6">
              نعتذر عن الإزعاج. يرجى تحديث الصفحة أو المحاولة مرة أخرى.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-bold mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة تحميل التطبيق
            </button>
            {this.state.error && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-right">
                <div className="text-xs text-gray-400 mb-1">تفاصيل الخطأ:</div>
                <div className="text-sm text-gray-600 font-mono">
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
