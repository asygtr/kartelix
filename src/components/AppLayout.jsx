import React, { useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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

const SWIPE_START_ZONE = 28; // px — sol kenardan bu kadar içeri dokunuş
const SWIPE_THRESHOLD  = 80; // px — bu kadar sağa çekince geri gider

const AppLayout = ({ navAction }) => {
  const location = useLocation();
  const navigate  = useNavigate();
  const prevPath  = useRef(location.pathname);
  const title     = pageTitles[location.pathname] || '';

  const prevIndex = pageOrder.indexOf(prevPath.current);
  const currIndex = pageOrder.indexOf(location.pathname);
  const direction = currIndex >= prevIndex ? 1 : -1;
  prevPath.current = location.pathname;

  // Swipe-to-back refs
  const swipeStartX  = useRef(null);
  const swipeStartY  = useRef(null);
  const swipeActive  = useRef(false);

  const handleTouchStart = (e) => {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    if (x <= SWIPE_START_ZONE) {
      swipeStartX.current = x;
      swipeStartY.current = y;
      swipeActive.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (!swipeActive.current) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartY.current);
    swipeActive.current = false;
    if (dx > SWIPE_THRESHOLD && dy < 60) {
      navigate(-1);
    }
  };

  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '100dvh' }}
    >
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
    </div>
  );
};

export default AppLayout;
