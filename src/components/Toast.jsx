import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, Info } from './icons.jsx';

const ToastContext = createContext(null);

const DURATION = 4000;

const VARIANTS = {
  success: { bg: 'rgba(22, 163, 74, 0.96)', color: '#fff', icon: <CheckCircle size={18} /> },
  error:   { bg: 'rgba(185, 28, 28, 0.96)',  color: '#fff', icon: <XCircle size={18} /> },
  info:    { bg: 'rgba(15, 76, 79, 0.96)',   color: '#fff', icon: <Info size={18} /> },
};

const Toast = ({ id, message, type = 'info', onClose }) => {
  const v = VARIANTS[type] || VARIANTS.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 32, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      style={{
        background: v.bg,
        color: v.color,
        borderRadius: '0.85rem',
        padding: '0.75rem 1rem 0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 1px 0 rgba(255,255,255,0.12) inset',
        minWidth: '16rem',
        maxWidth: 'min(22rem, calc(100vw - 2rem))',
        overflow: 'hidden',
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={() => onClose(id)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', paddingBottom: '0.65rem' }}>
        <span style={{ marginTop: '0.05rem', opacity: 0.9 }}>{v.icon}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.45, flex: 1 }}>{message}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(id); }}
          style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.55, cursor: 'pointer', padding: '0', lineHeight: 1, fontSize: '1rem', marginTop: '-0.1rem' }}
          aria-label="Kapat"
        >✕</button>
      </div>
      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: DURATION / 1000, ease: 'linear' }}
        style={{
          height: '2.5px',
          background: 'rgba(255,255,255,0.45)',
          transformOrigin: 'left',
          marginLeft: '-1rem',
          marginRight: '-1rem',
          marginBottom: 0,
        }}
      />
    </motion.div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), DURATION);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        right: '1rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        <AnimatePresence mode="sync">
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <Toast {...t} onClose={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
