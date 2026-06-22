import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLandingPage from './pages/AdminLandingPage';
import StaffOrderPage from './pages/StaffOrderPage';
import PublicMamulPage from './pages/PublicMamulPage';
import AdminMamulPage from './pages/AdminMamulPage';
import MamulLabelPage from './pages/MamulLabelPage';
import { ThemeProvider } from './theme/ThemeProvider';
import { GenelAyarlarProvider } from './theme/ThemeProvider';
import ScrollToTop from './components/ScrollToTop';
import ReportsPage from './pages/ReportsPage';
import AppLayout from './components/AppLayout';
import { ToastProvider } from './components/Toast';


function App() {
  return (
    <ThemeProvider>
      <GenelAyarlarProvider>
        <ToastProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/u/:slug" element={<PublicMamulPage />} />

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminLandingPage />} />
              <Route path="/admin/mamuller" element={<AdminMamulPage />} />
              <Route path="/admin/orders" element={<StaffOrderPage mode="admin" />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['staff', 'admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/staff/orders/new" element={<StaffOrderPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['mamul', 'admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/mamul" element={<Navigate to="/mamul/labels" replace />} />
              <Route path="/mamul/labels" element={<MamulLabelPage />} />
              <Route path="/mamul/preview/:slug" element={<PublicMamulPage mode="internal" />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </ToastProvider>
      </GenelAyarlarProvider>
    </ThemeProvider>
  );
}

export default App;
