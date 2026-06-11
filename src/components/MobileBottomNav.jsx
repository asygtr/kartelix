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
  const springX = useSpring(rawX, { stiffness: 300, damping: 30, mass: 0.5 });

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
    >
      {/* Liquid glass spotlight — overflow:hidden olmayan bir wrapper ile */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        <motion.div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '5rem',
            x: springX,
            translateX: '-50%',
            borderRadius: '1.1rem',
            background:
              'radial-gradient(ellipse 80% 100% at 50% 50%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.08) 55%, transparent 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.32)',
          }}
          animate={{ opacity: hovering ? 1 : 0 }}
          transition={{ duration: 0.16 }}
        />
      </div>

      {items.map((item) => {
        const isDisabled = !item.to && !item.action;
        const isActive = isMobileNavActive(location.pathname, item, searchOpen);
        const cls = `app-mobile-nav-item${isActive ? ' is-active' : ''}`;
        const itemStyle = { position: 'relative', zIndex: 1 };

        const inner = (
          <>
            <span className="app-mobile-nav-icon">{item.icon}</span>
            <span className="app-mobile-nav-label">{item.label}</span>
          </>
        );

        if (item.action) {
          return (
            <button key={item.key} type="button" className={cls} style={itemStyle}
              onClick={() => onSearchClick?.(item)}>
              {inner}
            </button>
          );
        }

        if (isDisabled) {
          return (
            <button key={item.key} type="button" className="app-mobile-nav-item is-disabled"
              style={itemStyle} disabled>
              {inner}
            </button>
          );
        }

        return (
          <Link key={item.key} to={item.to} className={cls} style={itemStyle}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
