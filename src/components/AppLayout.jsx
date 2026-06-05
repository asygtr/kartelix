import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { clearSession } from '../utils/auth';
import AppNavbar from './AppNavbar';

const pageTitles = {
  '/admin': 'Yönetim',
  '/admin/mamuller': 'Mamül Kartı',
  '/admin/orders': 'Siparişler',
  '/admin/reports': 'Raporlar',
  '/admin/settings': 'Ayarlar',
  '/staff/orders/new': 'Siparişler',
  '/mamul': 'Mamül',
  '/mamul/labels': 'Etiket',
};

const AppLayout = ({ navAction }) => {
  const location = useLocation();
  const title = pageTitles[location.pathname] || '';

  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

  return (
    <>
      <AppNavbar title={title} action={navAction} onLogout={handleLogout} />
      <div className="app-page">
        <div className="app-container space-y-6">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default AppLayout;
