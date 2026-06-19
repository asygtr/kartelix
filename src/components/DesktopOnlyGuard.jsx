import React, { useEffect, useState } from 'react';

const DesktopOnlyGuard = ({ children, pageName = 'Bu sayfa' }) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 992);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isMobile) return children;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '22rem' }}>
        <div style={{
          width: '3.5rem', height: '3.5rem', margin: '0 auto 1.25rem',
          borderRadius: '1rem',
          background: 'linear-gradient(135deg, var(--app-primary), var(--app-accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="1.8">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
        <h2 style={{
          margin: 0, fontSize: '1.1rem', fontWeight: 800,
          color: 'var(--app-text)', letterSpacing: '-0.01em',
        }}>
          Bilgisayar gerekli
        </h2>
        <p style={{
          margin: '0.65rem 0 0', fontSize: '0.88rem', lineHeight: 1.7,
          color: 'var(--app-text-muted)',
        }}>
          <strong style={{ color: 'var(--app-text)' }}>{pageName}</strong> mobil cihazlarda
          desteklenmez. Lütfen bir bilgisayar tarayıcısından erişin.
        </p>
        <div style={{
          marginTop: '1.25rem', padding: '0.75rem 1rem',
          borderRadius: '0.75rem',
          background: 'color-mix(in srgb, var(--app-accent) 10%, white 90%)',
          border: '1px solid color-mix(in srgb, var(--app-accent) 28%, white 72%)',
          fontSize: '0.78rem', color: 'var(--app-text-muted)', lineHeight: 1.6,
        }}>
          💡 Chrome, Firefox veya Safari ile masaüstünden açın.
        </div>
      </div>
    </div>
  );
};

export default DesktopOnlyGuard;
