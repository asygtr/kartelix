import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';

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

const MobileBottomNav = ({ items = [], location, searchOpen, onSearchClick }) => {
  const navRef = useRef(null);
  const [hovering, setHovering] = useState(false);

  const rawX = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 280, damping: 28, mass: 0.6 });

  if (searchOpen) return null;

  const handlePointerMove = (e) => {
    const nav = navRef.current;
    if (!nav) return;
    const rect = nav.getBoundingClientRect();
    rawX.set(e.clientX - rect.left);
  };

  const handlePointerEnter = (e) => {
    const nav = navRef.current;
    if (!nav) return;
    const rect = nav.getBoundingClientRect();
    // Spring olmadan direkt yerleştir — giriş anında zıplamayı önle
    rawX.jump(e.clientX - rect.left);
    setHovering(true);
  };

  const handlePointerLeave = () => setHovering(false);

  return (
    <nav
      ref={navRef}
      className="app-mobile-bottom-nav"
      aria-label="Mobil alt gezinme"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Liquid glass spotlight */}
      <motion.div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '4.5rem',
          x: springX,
          translateX: '-50%',
          pointerEvents: 'none',
          borderRadius: '1.1rem',
          background:
            'radial-gradient(ellipse 80% 90% at 50% 50%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 60%, transparent 100%)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 1px rgba(255,255,255,0.08)',
          zIndex: 0,
        }}
        animate={{ opacity: hovering ? 1 : 0 }}
        transition={{ duration: 0.18 }}
      />

      {items.map((item) => {
        const isDisabled = !item.to && !item.action;
        const isActive = isMobileNavActive(location.pathname, item, searchOpen);

        const content = (
          <>
            <span className="app-mobile-nav-icon" style={{ position: 'relative', zIndex: 1 }}>{item.icon}</span>
            <span className="app-mobile-nav-label" style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
          </>
        );

        const sharedClass = `app-mobile-nav-item${isActive ? ' is-active' : ''}`;
        const sharedStyle = { position: 'relative', zIndex: 1 };

        if (item.action) {
          return (
            <button
              key={item.key}
              type="button"
              className={sharedClass}
              style={sharedStyle}
              onClick={() => onSearchClick?.(item)}
            >
              {content}
            </button>
          );
        }

        if (isDisabled) {
          return (
            <button key={item.key} type="button" className="app-mobile-nav-item is-disabled" style={sharedStyle} disabled>
              {content}
            </button>
          );
        }

        return (
          <Link key={item.key} to={item.to} className={sharedClass} style={sharedStyle}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
