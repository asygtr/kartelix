import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { defaultRouteByRole, getSession, saveSession } from '../utils/auth';
import { useTheme } from '../theme/ThemeProvider';

const PIN_LENGTH = 4;

const LoginScreen = () => {
  const [step, setStep] = useState('username');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [pins, setPins] = useState(Array(PIN_LENGTH).fill(''));
  const [pinError, setPinError] = useState('');
  const [checking, setChecking] = useState(false);

  const pinRefs = useRef([]);
  const usernameRef = useRef(null);
  const navigate = useNavigate();
  const { appLogo } = useTheme();

  useEffect(() => {
    const session = getSession();
    if (session?.yetki) {
      navigate(defaultRouteByRole(session.yetki), { replace: true });
    }
  }, [navigate]);

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setChecking(true);
    setUsernameError('');
    try {
      const res = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed })
      });
      const result = await res.json();
      if (!result.success) {
        setUsernameError('Kullanıcı bulunamadı.');
        usernameRef.current?.select();
        return;
      }
      setStep('pin');
      setTimeout(() => pinRefs.current[0]?.focus(), 300);
    } catch {
      setUsernameError('Sunucuya bağlanılamadı.');
    } finally {
      setChecking(false);
    }
  };

  const handlePinChange = (index, value) => {
    const char = value.slice(-1);
    if (!char) return;
    const next = [...pins];
    next[index] = char;
    setPins(next);
    setPinError('');
    if (index < PIN_LENGTH - 1) {
      pinRefs.current[index + 1]?.focus();
    } else {
      doLogin(next);
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...pins];
      if (next[index]) {
        next[index] = '';
        setPins(next);
      } else if (index > 0) {
        next[index - 1] = '';
        setPins(next);
        pinRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').slice(0, PIN_LENGTH).split('');
    const next = Array(PIN_LENGTH).fill('');
    pasted.forEach((char, i) => { next[i] = char; });
    setPins(next);
    if (pasted.length === PIN_LENGTH) {
      doLogin(next);
    } else {
      pinRefs.current[pasted.length]?.focus();
    }
  };

  const doLogin = async (pinArray) => {
    const password = pinArray.join('');
    if (password.length < PIN_LENGTH) return;
    setStep('success');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const result = await res.json();
      if (!result.success) {
        setTimeout(() => {
          setStep('pin-error');
          setTimeout(() => {
            setPins(Array(PIN_LENGTH).fill(''));
            setPinError(result.message || 'Şifre hatalı.');
            setStep('pin');
            pinRefs.current[0]?.focus();
          }, 500);
        }, 400);
        return;
      }
      saveSession(result.data.user);
      setTimeout(() => {
        navigate(result.data.redirectTo || defaultRouteByRole(result.data.user?.yetki), { replace: true });
      }, 900);
    } catch {
      setTimeout(() => {
        setPins(Array(PIN_LENGTH).fill(''));
        setPinError('Sunucuya bağlanılamadı.');
        setStep('pin');
        pinRefs.current[0]?.focus();
      }, 500);
    }
  };

  const isSuccess = step === 'success';
  const isError = step === 'pin-error';
  const showPin = step !== 'username';

  return (
    <div className="app-page flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-4">
        <section className="app-panel p-8">
          <div className="flex flex-col items-center text-center">
            <div className="app-login-logo-wrap">
              <img src={appLogo} alt="Kartelix" className="app-login-logo" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-[color:var(--app-text)]">Kartelix</h2>
          </div>

          {/* Kullanıcı adı adımı */}
          {!showPin && (
            <div style={{ animation: 'loginFadeIn 280ms ease both' }}>
              <p className="mt-6 text-center text-sm text-[color:var(--app-text-muted)]">Kullanıcı adınızı girin</p>
              <form onSubmit={handleUsernameSubmit} className="mt-5 space-y-3">
                <input
                  ref={usernameRef}
                  type="text"
                  autoComplete="username"
                  placeholder="Kullanıcı adı"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setUsernameError(''); }}
                  className="app-input text-center text-lg"
                  autoFocus
                />
                {usernameError && (
                  <p className="text-center text-sm" style={{ color: '#c0392b' }}>{usernameError}</p>
                )}
                <button
                  type="submit"
                  disabled={checking || !username.trim()}
                  className="app-btn-primary w-full disabled:opacity-50"
                >
                  {checking ? 'Kontrol ediliyor...' : 'Devam →'}
                </button>
              </form>
            </div>
          )}

          {/* PIN adımı */}
          {showPin && (
            <div style={{ animation: 'loginSlideUp 320ms cubic-bezier(0.2,0.8,0.2,1) both' }}>
              <p className="mt-6 text-center text-sm text-[color:var(--app-text-muted)]">
                <span className="font-semibold text-[color:var(--app-text)]">{username}</span> için şifre
              </p>

              <div className="mt-5 flex justify-center gap-3" style={{ position: 'relative', minHeight: '3.6rem' }}>
                {pins.map((val, i) => (
                  <div
                    key={i}
                    style={{
                      width: '3.2rem',
                      height: '3.6rem',
                      animation: isSuccess
                        ? `pinMerge 380ms cubic-bezier(0.4,0,0.2,1) ${i * 45}ms both`
                        : isError
                        ? 'pinShake 400ms ease both'
                        : 'none',
                      '--tx': `${(PIN_LENGTH / 2 - 0.5 - i) * 3.7}rem`
                    }}
                  >
                    <input
                      ref={el => pinRefs.current[i] = el}
                      type="password"
                      maxLength={2}
                      value={val}
                      onChange={e => handlePinChange(i, e.target.value)}
                      onKeyDown={e => handlePinKeyDown(i, e)}
                      onPaste={i === 0 ? handlePinPaste : undefined}
                      inputMode="numeric"
                      autoComplete="off"
                      disabled={isSuccess || isError}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '0.75rem',
                        border: `2px solid ${val ? 'var(--app-primary)' : 'var(--app-border)'}`,
                        background: val ? 'color-mix(in srgb, var(--app-primary) 8%, white 92%)' : 'rgba(255,253,248,0.9)',
                        color: 'var(--app-text)',
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        outline: 'none',
                        caretColor: 'transparent',
                        transition: 'border-color 160ms, box-shadow 160ms, background 160ms',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => { e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--app-primary) 18%, transparent)'; e.target.style.borderColor = 'var(--app-primary)'; }}
                      onBlur={e => { e.target.style.boxShadow = ''; if (!val) e.target.style.borderColor = 'var(--app-border)'; }}
                    />
                  </div>
                ))}

                {isSuccess && (
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    transform: 'translateX(-50%)',
                    width: '3.2rem',
                    height: '3.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, var(--app-primary), var(--app-accent))',
                    borderRadius: '0.75rem',
                    color: 'white',
                    animation: 'pinCheckIn 400ms cubic-bezier(0.2,0.8,0.2,1) 220ms both'
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.6rem', height: '1.6rem' }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>

              {pinError && !isSuccess && !isError && (
                <p className="mt-3 text-center text-sm" style={{ color: '#c0392b' }}>{pinError}</p>
              )}

              <button
                type="button"
                onClick={() => { setStep('username'); setPins(Array(PIN_LENGTH).fill('')); setPinError(''); }}
                className="mt-5 w-full text-center text-sm"
                style={{ color: 'var(--app-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ← Kullanıcı adını değiştir
              </button>
            </div>
          )}
        </section>
      </div>

      <style>{`
        @keyframes loginFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes loginSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pinMerge {
          0%   { transform: translateX(0) scale(1); opacity: 1; }
          55%  { transform: translateX(var(--tx)) scale(0.8); opacity: 0.5; }
          100% { transform: translateX(var(--tx)) scale(0); opacity: 0; }
        }
        @keyframes pinCheckIn {
          0%   { transform: translateX(-50%) scale(0) rotate(-15deg); opacity: 0; }
          65%  { transform: translateX(-50%) scale(1.15) rotate(3deg); opacity: 1; }
          100% { transform: translateX(-50%) scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          20%      { transform: translateX(-7px); }
          40%      { transform: translateX(7px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
