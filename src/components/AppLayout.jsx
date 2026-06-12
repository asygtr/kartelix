import React, { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

const pageOrder = Object.keys(pageTitles);

const AppLayout = ({ navAction }) => {
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const title = pageTitles[location.pathname] || '';

  const prevIndex = pageOrder.indexOf(prevPath.current);
  const currIndex = pageOrder.indexOf(location.pathname);
  const direction = currIndex >= prevIndex ? 1 : -1;
  prevPath.current = location.pathname;

  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

  return (
    <>
      <AppNavbar title={title} action={navAction} onLogout={handleLogout} />
      <div className="app-page">
        <div className="app-container space-y-6">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={location.pathname}
              custom={direction}
              initial={{ opacity: 0, x: direction * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              style={{ willChange: 'transform, opacity' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default AppLayout;
