import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHaptic } from '../utils/useHaptic';

const THRESHOLD = 72;
const MAX_PULL  = 110;

const PullToRefresh = ({ onRefresh, children, disabled = false }) => {
  const [pullY, setPullY]       = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY   = useRef(null);
  const startX   = useRef(null);
  const pulling  = useRef(false);
  const fired    = useRef(false);
  const haptic   = useHaptic();

  const onTouchStart = useCallback((e) => {
    if (disabled || refreshing) return;
    const scrollEl = e.currentTarget.querySelector('.app-page') || e.currentTarget;
    if (scrollEl.scrollTop > 0) return;
    const target = e.target;
    const isInteractive = target instanceof HTMLElement && (target.closest('input, textarea, select, button, a, [role="button"]') || target.dataset?.ptrIgnore === 'true');
    if (isInteractive) return;
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    pulling.current = true;
    fired.current   = false;
  }, [disabled, refreshing]);

  const onTouchMove = useCallback((e) => {
    if (!pulling.current || startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    const dx = e.touches[0].clientX - startX.current;
    if (dy <= 0 || Math.abs(dx) > 18) { pulling.current = false; return; }
    const clamped = Math.min(dy * 0.45, MAX_PULL);
    setPullY(clamped);
    if (clamped >= THRESHOLD && !fired.current) {
      fired.current = true;
      haptic.light();
    }
  }, [haptic]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullY >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      setPullY(THRESHOLD * 0.6);
      haptic.success();
      try { await onRefresh(); } finally {
        setRefreshing(false);
        setPullY(0);
      }
    } else {
      setPullY(0);
    }
    startY.current = null;
    startX.current = null;
  }, [pullY, onRefresh, haptic]);

  useEffect(() => {
    if (!pulling.current && !refreshing) setPullY(0);
  }, [refreshing]);

  const progress = Math.min(pullY / THRESHOLD, 1);
  const show = pullY > 4 || refreshing;

  return (
    <div
      className="app-pull-shell"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ position: 'relative' }}
    >
      {show && (
        <div
          className="ptr-indicator"
          style={{ height: pullY, opacity: Math.min(progress * 1.4, 1) }}
        >
          <div
            className={`ptr-spinner${refreshing ? ' is-spinning' : ''}`}
            style={{ transform: `rotate(${progress * 270}deg)` }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

export default PullToRefresh;
