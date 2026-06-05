import React from 'react';
import { Link } from 'react-router-dom';

const isActiveLink = (pathname, target) => {
  if (target === '/') return pathname === '/';
  if (target === '/admin' || target === '/mamul') {
    return pathname === target;
  }
  return pathname === target || pathname.startsWith(`${target}/`);
};

const isMobileNavActive = (pathname, item, searchOpen) => {
  if (item.action) {
    return searchOpen;
  }

  if (!item.to) {
    return false;
  }

  if (item.key === 'home') {
    return pathname === item.to;
  }

  return isActiveLink(pathname, item.to);
};

const MobileBottomNav = ({ items = [], location, searchOpen, onSearchClick }) => {
  if (searchOpen) {
    return null;
  }

  return (
    <nav className="app-mobile-bottom-nav" aria-label="Mobil alt gezinme">
      {items.map((item) => {
        const isDisabled = !item.to && !item.action;
        const isActive = isMobileNavActive(location.pathname, item, searchOpen);

        if (item.action) {
          return (
            <button
              key={item.key}
              type="button"
              className={`app-mobile-nav-item ${isActive ? 'is-active' : ''}`}
              onClick={() => onSearchClick?.(item)}
            >
              <span className="app-mobile-nav-icon">{item.icon}</span>
              <span className="app-mobile-nav-label">{item.label}</span>
            </button>
          );
        }

        if (isDisabled) {
          return (
            <button key={item.key} type="button" className="app-mobile-nav-item is-disabled" disabled>
              <span className="app-mobile-nav-icon">{item.icon}</span>
              <span className="app-mobile-nav-label">{item.label}</span>
            </button>
          );
        }

        return (
          <Link key={item.key} to={item.to} className={`app-mobile-nav-item ${isActive ? 'is-active' : ''}`}>
            <span className="app-mobile-nav-icon">{item.icon}</span>
            <span className="app-mobile-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
