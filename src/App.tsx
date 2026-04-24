import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useIdleTimer } from './hooks/useIdleTimer';
import { useToast } from './hooks/useToast';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import InvoicesPage from './pages/InvoicesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AppShell from './components/layout/AppShell';
import RouteGuard from './components/layout/RouteGuard';
import ToastContainer from './components/common/ToastContainer';

function App() {
  const { isAuthenticated, lockScreen } = useAuthStore();
  const toast = useToast();

  // Auto-lock after 5 minutes of inactivity
  useIdleTimer({
    timeout: 300_000, // 5 minutes
    onIdle: () => {
      if (isAuthenticated) {
        lockScreen();
        toast.info('تم قفل الجلسة لعدم النشاط');
      }
    },
    enabled: isAuthenticated,
  });

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/pos" replace /> : <LoginPage />}
        />
        <Route
          path="/*"
          element={
            <RouteGuard>
              <AppShell>
                <Routes>
                  <Route path="/pos" element={<POSPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/pos" replace />} />
                </Routes>
              </AppShell>
            </RouteGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
