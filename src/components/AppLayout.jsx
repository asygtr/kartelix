import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clearSession, getSession } from '../utils/auth';
import AppNavbar, { navSets, useNavItems } from './AppNavbar';
import MobileBottomNav from './MobileBottomNav';
import { pageTransition, routeVariants } from '../utils/motion';
import { useHaptic } from '../utils/useHaptic';

const pageTitles = {
  '/admin': 'Yönetim',
  '/admin/mamuller': 'Mamül Kartı',
  '/admin/orders': 'Siparişler',
  '/admin/reports': 'Raporlar',
  '/admin/settings': 'Ayarlar',
  '/staff/orders/new': 'Siparişler',
  '/mamul/labels': 'Etiket',
};

const fallbackPageOrder = [
  '/admin',
  '/admin/orders',
  '/staff/orders/new',
  '/mamul/labels',
  '/admin/mamuller',
  '/admin/reports',
  '/admin/settings',
];

const normalizeRouteKey = (pathname = '') => {
  if (pathname === '/mamul' || pathname.startsWith('/mamul/preview')) return '/mamul/labels';
  if (pathname.startsWith('/admin/mamuller')) return '/admin/mamuller';
  if (pathname.startsWith('/admin/orders')) return '/admin/orders';
  if (pathname.startsWith('/staff/orders')) return '/staff/orders/new';
  if (pathname.startsWith('/admin/reports')) return '/admin/reports';
  if (pathname.startsWith('/admin/settings')) return '/admin/settings';
  if (pathname.startsWith('/mamul/labels')) return '/mamul/labels';
  if (pathname === '/admin') return '/admin';
  return pathname;
};

const uniqueRouteKeys = (items) => {
  const seen = new Set();
  return items.reduce((order, item) => {
    const key = normalizeRouteKey(typeof item === 'string' ? item : item?.to);
    if (!key || seen.has(key)) return order;
    seen.add(key);
    order.push(key);
    return order;
  }, []);
};

const routeIndex = (pathname, order) => {
  const routeKey = normalizeRouteKey(pathname);
  const directIndex = order.indexOf(routeKey);
  if (directIndex >= 0) return directIndex;
  const fallbackIndex = fallbackPageOrder.indexOf(routeKey);
  if (fallbackIndex >= 0) return fallbackIndex;
  return 0;
};

const SWIPE_START_ZONE = 28;
const SWIPE_THRESHOLD = 80;

const AppLayout = ({ navAction }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const prevPath = useRef(location.pathname);
  const title = pageTitles[location.pathname] || '';
  const session = getSession();
  const role = session?.yetki || 'guest';
  const [searchOpen, setSearchOpen] = useState(false);
  const [chromeCompact, setChromeCompact] = useState(false);
  const [isDesktopNav, setIsDesktopNav] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 992px)').matches : false
  ));
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const haptic = useHaptic();
  const openSearch = useCallback(() => { haptic.light(); setSearchOpen(true); }, [haptic]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setKeyboardOpen(vv.height < window.innerHeight * 0.8);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  const mobileNavItems = useNavItems(role, openSearch);
  const lastScrollTop = useRef(0);
  const nestedScrollTops = useRef(new WeakMap());
  const scrollIntent = useRef(0);
  const scrollRaf = useRef(null);
  const previousSearch = useRef(location.search);
  const pendingRouteScrollReset = useRef(false);

  const desktopRouteOrder = useMemo(() => {
    const links = navSets[role] || navSets.guest;
    return uniqueRouteKeys(role === 'admin' ? [...links, '/admin/settings'] : links);
  }, [role]);
  const mobileRouteOrder = useMemo(() => uniqueRouteKeys(mobileNavItems), [mobileNavItems]);
  const visibleRouteOrder = isDesktopNav ? desktopRouteOrder : mobileRouteOrder;
  const prevIndex = routeIndex(prevPath.current, visibleRouteOrder);
  const currIndex = routeIndex(location.pathname, visibleRouteOrder);
  const delta = currIndex - prevIndex;
  const direction = delta === 0 ? 1 : delta > 0 ? 1 : -1;
  const travel = Math.max(1, Math.min(Math.abs(delta), 5));
  const routeMotion = { direction, travel, isDesktop: isDesktopNav };
  const hasPageSearch = location.pathname === '/admin/mamuller' || location.pathname === '/mamul/labels';
  const pageClass = location.pathname === '/admin/mamuller'
    ? ' is-mamul-page'
    : location.pathname === '/mamul/labels'
      ? ' is-label-page'
      : '';

  const resetPageScroll = useCallback(() => {
    if (!pageRef.current) return;
    pageRef.current.scrollTop = 0;
    pageRef.current.scrollLeft = 0;
    lastScrollTop.current = 0;
    nestedScrollTops.current = new WeakMap();
    scrollIntent.current = 0;
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 992px)');
    const updateMode = () => setIsDesktopNav(media.matches);
    updateMode();
    media.addEventListener('change', updateMode);
    return () => media.removeEventListener('change', updateMode);
  }, []);

  useLayoutEffect(() => {
    const pathChanged = prevPath.current !== location.pathname;
    const searchChanged = previousSearch.current !== location.search;

    if (pathChanged) {
      pendingRouteScrollReset.current = true;
      setChromeCompact(false);
    } else if (searchChanged) {
      resetPageScroll();
    }

    prevPath.current = location.pathname;
    previousSearch.current = location.search;
  }, [location.pathname, location.search, resetPageScroll]);

  const handleExitComplete = useCallback(() => {
    if (!pendingRouteScrollReset.current) return;
    pendingRouteScrollReset.current = false;
    resetPageScroll();
  }, [resetPageScroll]);

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return undefined;

    const applyScrollIntent = (diff, currentTop) => {
      if (Math.abs(diff) < 3) return;
      scrollIntent.current = Math.max(-80, Math.min(80, scrollIntent.current + diff));

      if (currentTop < 16) {
        scrollIntent.current = 0;
        setChromeCompact(false);
      } else if (scrollIntent.current > 18) {
        setChromeCompact(true);
      } else if (scrollIntent.current < -12) {
        setChromeCompact(false);
      }
    };

    const updatePageChrome = () => {
      scrollRaf.current = null;
      const currentTop = page.scrollTop;
      const diff = currentTop - lastScrollTop.current;
      applyScrollIntent(diff, currentTop);
      lastScrollTop.current = currentTop;
    };

    const handlePageScroll = () => {
      if (scrollRaf.current) return;
      scrollRaf.current = window.requestAnimationFrame(updatePageChrome);
    };

    const handleNestedScroll = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || target === page) return;
      if (!page.contains(target)) return;

      const previous = nestedScrollTops.current.get(target) ?? 0;
      const currentTop = target.scrollTop;
      nestedScrollTops.current.set(target, currentTop);
      applyScrollIntent(currentTop - previous, currentTop);
    };

    page.addEventListener('scroll', handlePageScroll, { passive: true });
    page.addEventListener('scroll', handleNestedScroll, { passive: true, capture: true });
    return () => {
      page.removeEventListener('scroll', handlePageScroll);
      page.removeEventListener('scroll', handleNestedScroll, true);
      if (scrollRaf.current) {
        window.cancelAnimationFrame(scrollRaf.current);
        scrollRaf.current = null;
      }
    };
  }, []);

  const swipeStartX = useRef(null);
  const swipeStartY = useRef(null);
  const swipeActive = useRef(false);

  const handleTouchStart = (e) => {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    if (x <= SWIPE_START_ZONE) {
      swipeStartX.current = x;
      swipeStartY.current = y;
      swipeActive.current = true;
    }
  };

  const handleTouchMove = () => {};

  const handleTouchEnd = (e) => {
    if (!swipeActive.current) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartY.current);
    swipeActive.current = false;
    if (dx > SWIPE_THRESHOLD && dy < 60) {
      haptic.light();
      navigate(-1);
    }
  };

  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

  return (
    <div
      className={`app-shell${pageClass}${chromeCompact ? ' is-chrome-compact' : ''}${keyboardOpen ? ' is-keyboard-open' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '100dvh' }}
    >
      <AppNavbar
        title={title}
        action={navAction}
        onLogout={handleLogout}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        compact={chromeCompact}
      />
      <MobileBottomNav
        items={mobileNavItems}
        location={location}
        searchOpen={searchOpen}
        onSearchClick={() => setSearchOpen(true)}
        compact={chromeCompact}
      />
      <div ref={pageRef} className="app-page">
        <AnimatePresence mode="popLayout" custom={routeMotion} initial={false} onExitComplete={handleExitComplete}>
          <motion.div
            key={location.pathname}
            className="app-route-wrapper"
            custom={routeMotion}
            variants={routeVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={pageTransition}
            style={{ willChange: 'transform' }}
          >
            <div className={`app-container space-y-6${hasPageSearch ? ' has-page-search' : ''}`}>
              <Outlet />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AppLayout;
