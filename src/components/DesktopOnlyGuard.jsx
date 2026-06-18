import React, { useEffect, useState } from 'react';

const DesktopOnlyGuard = ({ children, pageName = 'Bu sayfa' }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 992);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isMobile) return children;

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--app-bg)',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '22rem' }}>
        <div style={{
          width: '4rem', height: '4rem', margin: '0 auto 1.5rem',
          borderRadius: '1.2rem',
          background: 'linear-gradient(135deg, var(--app-primary), var(--app-accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" strokeWidth="1.8">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
        <h1 style={{
          margin: 0, fontSize: '1.25rem', fontWeight: 800,
          color: 'var(--app-text)', letterSpacing: '-0.01em',
        }}>
          Bilgisayar gerekli
        </h1>
        <p style={{
          margin: '0.75rem 0 0', fontSize: '0.9rem', lineHeight: 1.7,
          color: 'var(--app-text-muted)',
        }}>
          <strong style={{ color: 'var(--app-text)' }}>{pageName}</strong>, mobil cihazlarda
          desteklenmemektedir. Lütfen bir bilgisayar tarayıcısından erişin.
        </p>
        <div style={{
          marginTop: '1.5rem', padding: '0.85rem 1rem',
          borderRadius: '0.75rem',
          background: 'color-mix(in srgb, var(--app-accent) 10%, white 90%)',
          border: '1px solid color-mix(in srgb, var(--app-accent) 30%, white 70%)',
          fontSize: '0.8rem', color: 'var(--app-text-muted)', lineHeight: 1.6,
        }}>
          💡 Chrome, Firefox veya Safari ile masaüstünden açın.
        </div>
      </div>
    </div>
  );
};

export default DesktopOnlyGuard;
