import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { chromeSpring, navIndicatorTransition, navTapMotion, iosEase } from '../utils/motion';
import { useHaptic } from '../utils/useHaptic';

const MotionLink = motion.create(Link);

const isActiveLink = (pathname, target) => {
  if (target === '/') return pathname === '/';
  if (target === '/admin' || target === '/mamul') return pathname === target;
  return pathname === target || pathname.startsWith(`${target}/`);
};

const isMobileNavActive = (pathname, item, searchOpen) => {
  if (item.action) return searchOpen;
  if (!item.to) return false;
  if (item.key === 'home') return pathname === item.to;
  return isActiveLink(pathname, item.to);
};

const MobileBottomNav = ({ items = [], location, searchOpen, onSearchClick, compact = false }) => {
  const navRef = useRef(null);
  const itemRefs = useRef([]);
  const [indicator, setIndicator] = useState(null);
  const haptic = useHaptic();
  const prevActiveIndex = useRef(-1);

  const activeIndex = items.findIndex((item) => isMobileNavActive(location.pathname, item, searchOpen));

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const activeItem = itemRefs.current[activeIndex];
      if (!activeItem) {
        setIndicator(null);
        return;
      }

      const inset = 4;
      setIndicator({
        x: activeItem.offsetLeft + inset,
        y: activeItem.offsetTop + inset,
        width: Math.max(0, activeItem.offsetWidth - inset * 2),
        height: Math.max(0, activeItem.offsetHeight - inset * 2),
      });
    };

    updateIndicator();
    const frame = window.requestAnimationFrame(updateIndicator);
    const timeout = window.setTimeout(updateIndicator, 280);
    window.addEventListener('resize', updateIndicator);
    window.addEventListener('orientationchange', updateIndicator);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.removeEventListener('resize', updateIndicator);
      window.removeEventListener('orientationchange', updateIndicator);
    };
  }, [activeIndex, compact, items.length, location.pathname]);

  if (searchOpen) return null;

  return (
    <motion.nav
      ref={navRef}
      className={`app-mobile-bottom-nav${compact ? ' is-compact' : ''}`}
      aria-label="Mobil alt gezinme"
      initial={false}
      animate={{
        scale: compact ? 0.945 : 1,
        y: compact ? 10 : 0,
        opacity: compact ? 0.88 : 1,
      }}
      transition={chromeSpring}
    >
      {indicator ? (
        <motion.span
          className="app-mobile-nav-active-pill"
          initial={false}
          animate={indicator}
          transition={navIndicatorTransition}
        />
      ) : null}

      {items.map((item, index) => {
        const isDisabled = !item.to && !item.action;
        const isActive = isMobileNavActive(location.pathname, item, searchOpen);
        const cls = `app-mobile-nav-item${isActive ? ' is-active' : ''}`;

        const inner = (
          <>
            <span className="app-mobile-nav-icon">{item.icon}</span>
            <span className="app-mobile-nav-label">{item.label}</span>
          </>
        );

        if (item.action) {
          return (
            <motion.button
              key={item.key}
              type="button"
              className={cls}
              onClick={() => { haptic.light(); onSearchClick?.(item); }}
              whileTap={navTapMotion}
              ref={(node) => { itemRefs.current[index] = node; }}
            >
              <motion.span
                className="app-mobile-nav-icon"
                animate={isActive ? { y: -3, scale: 1.18 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              >{item.icon}</motion.span>
              <span className="app-mobile-nav-label">{item.label}</span>
            </motion.button>
          );
        }

        if (isDisabled) {
          return (
            <motion.button
              key={item.key}
              type="button"
              className="app-mobile-nav-item is-disabled"
              disabled
              ref={(node) => { itemRefs.current[index] = node; }}
            >
              <motion.span className="app-mobile-nav-pop" whileTap={navTapMotion}>
                {inner}
              </motion.span>
            </motion.button>
          );
        }

        return (
          <MotionLink
            key={item.key}
            to={item.to}
            className={cls}
            whileTap={navTapMotion}
            onClick={() => haptic.light()}
            ref={(node) => { itemRefs.current[index] = node; }}
          >
            <motion.span
              className="app-mobile-nav-icon"
              animate={isActive ? { y: -3, scale: 1.18 } : { y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            >{item.icon}</motion.span>
            <span className="app-mobile-nav-label">{item.label}</span>
          </MotionLink>
        );
      })}
    </motion.nav>
  );
};

export default MobileBottomNav;
