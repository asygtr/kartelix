import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { defaultRouteByRole, getSession, saveSession } from '../utils/auth';
import { useTheme } from '../theme/ThemeProvider';

const PIN_LENGTH = 4;
const EASE = [0.2, 0.8, 0.2, 1];

const AnimatedCheck = () => (
  <svg viewBox="0 0 40 40" fill="none" style={{ width: '2rem', height: '2rem' }}>
    <motion.polyline
      points="8,20 17,29 32,12"
      stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.45, delay: 0.08, ease: EASE }}
    />
  </svg>
);

const AnimatedX = () => (
  <svg viewBox="0 0 40 40" fill="none" style={{ width: '1.8rem', height: '1.8rem' }}>
    <motion.line x1="12" y1="12" x2="28" y2="28" stroke="white" strokeWidth="3.5" strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.22, ease: EASE }} />
    <motion.line x1="28" y1="12" x2="12" y2="28" stroke="white" strokeWidth="3.5" strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.22, delay: 0.18, ease: EASE }} />
  </svg>
);

const PinBox = ({ value, index, inputRef, onChange, onKeyDown, onPaste, phase }) => {
  const filled = Boolean(value);

  const borderColor = () => {
    if (phase === 'glow-green') return '#22c55e';
    if (phase === 'glow-red' || phase === 'shake') return '#ef4444';
    if (filled) return 'var(--app-primary)';
    return 'var(--app-border)';
  };

  const bgColor = () => {
    if (phase === 'glow-green') return 'rgba(34,197,94,0.12)';
    if (phase === 'glow-red' || phase === 'shake') return 'rgba(239,68,68,0.12)';
    if (filled) return 'color-mix(in srgb, var(--app-primary) 8%, white 92%)';
    return 'rgba(255,253,248,0.9)';
  };

  const glowShadow = () => {
    if (phase === 'glow-green') return '0 0 0 3px rgba(34,197,94,0.3), 0 0 20px rgba(34,197,94,0.25)';
    if (phase === 'glow-red' || phase === 'shake') return '0 0 0 3px rgba(239,68,68,0.3), 0 0 20px rgba(239,68,68,0.22)';
    return 'none';
  };

  // Her kutu merkezden ne kadar uzakta? Merkeze doğru git.
  const center = (PIN_LENGTH - 1) / 2; // 1.5
  const offsetFromCenter = index - center; // -1.5, -0.5, 0.5, 1.5
  const mergeX = -offsetFromCenter * 58;  // merkeze doğru: sol kutular sağa, sağ kutular sola

  const getAnimate = () => {
    if (phase === 'merge') return { x: mergeX, scale: 0, opacity: 0 };
    if (phase === 'shake') return { x: [0, -8, 8, -6, 6, -3, 3, 0], scale: 1, opacity: 1 };
    if (phase === 'glow-green' || phase === 'glow-red') return { x: 0, scale: [1, 1.08, 1], opacity: 1 };
    return { x: 0, scale: 1, opacity: 1 };
  };

  const getTransition = () => {
    if (phase === 'merge') return { duration: 0.42, delay: index * 0.04, ease: [0.4, 0, 0.6, 1] };
    if (phase === 'shake') return { duration: 0.5 };
    if (phase === 'glow-green' || phase === 'glow-red') return { duration: 0.32 };
    return { duration: 0.2 };
  };

  return (
    <motion.div
      style={{ width: '3.4rem', height: '3.8rem', flexShrink: 0 }}
      animate={getAnimate()}
      transition={getTransition()}
    >
      <input
        ref={inputRef}
        type="password"
        maxLength={2}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        inputMode="numeric"
        autoComplete="off"
        disabled={phase !== 'idle'}
        style={{
          width: '100%', height: '100%',
          borderRadius: '0.85rem',
          border: `2.5px solid ${borderColor()}`,
          background: bgColor(),
          boxShadow: glowShadow(),
          color: 'var(--app-text)',
          fontSize: '1.5rem', fontWeight: 700,
          textAlign: 'center',
          outline: 'none',
          caretColor: 'transparent',
          transition: 'border-color 180ms, background 180ms, box-shadow 180ms',
          boxSizing: 'border-box',
        }}
      />
    </motion.div>
  );
};

const LoginScreen = () => {
  const [step, setStep]                   = useState('username');
  const [username, setUsername]           = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checking, setChecking]           = useState(false);
  const [pins, setPins]                   = useState(Array(PIN_LENGTH).fill(''));
  const [pinError, setPinError]           = useState('');
  const [pinPhase, setPinPhase]           = useState('idle');

  const pinRefs     = useRef([]);
  const usernameRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate    = useNavigate();
  const { appLogo } = useTheme();

  useEffect(() => {
    const session = getSession();
    if (session?.yetki) navigate(defaultRouteByRole(session.yetki), { replace: true });
  }, [navigate]);

  // Kullanıcı adı yazınca 600ms debounce ile otomatik kontrol
  const handleUsernameChange = (e) => {
    const val = e.target.value;
    setUsername(val);
    setUsernameError('');
    clearTimeout(debounceRef.current);
    if (!val.trim()) return;
    debounceRef.current = setTimeout(() => checkUsername(val.trim()), 600);
  };

  // Enter'a basınca da çalışsın
  const handleUsernameKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      checkUsername(username.trim());
    }
  };

  const checkUsername = async (trimmed) => {
    if (!trimmed || checking) return;
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
      setTimeout(() => pinRefs.current[0]?.focus(), 320);
    } catch {
      setUsernameError('Sunucuya bağlanılamadı.');
    } finally {
      setChecking(false);
    }
  };

  const handlePinChange = (index, value) => {
    if (pinPhase !== 'idle') return;
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
    if (pinPhase !== 'idle') return;
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
    }
    if (e.key === 'ArrowLeft'  && index > 0)              pinRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) pinRefs.current[index + 1]?.focus();
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    if (pinPhase !== 'idle') return;
    const pasted = e.clipboardData.getData('text').slice(0, PIN_LENGTH).split('');
    const next = Array(PIN_LENGTH).fill('');
    pasted.forEach((c, i) => { next[i] = c; });
    setPins(next);
    if (pasted.length === PIN_LENGTH) doLogin(next);
    else pinRefs.current[pasted.length]?.focus();
  };

  const doLogin = async (pinArray) => {
    const password = pinArray.join('');
    if (password.length < PIN_LENGTH) return;
    setPinPhase('glow-green');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const result = await res.json();

      if (!result.success) {
        setTimeout(() => {
          setPinPhase('glow-red');
          setTimeout(() => {
            setPinPhase('shake');
            setTimeout(() => {
              setPinPhase('show-x');
              setTimeout(() => {
                setPins(Array(PIN_LENGTH).fill(''));
                setPinError(result.message || 'Şifre hatalı.');
                setPinPhase('idle');
                pinRefs.current[0]?.focus();
              }, 700);
            }, 520);
          }, 380);
        }, 350);
        return;
      }

      setTimeout(() => {
        setPinPhase('merge');
        setTimeout(() => {
          setPinPhase('show-check');
          saveSession(result.data.user);
          setTimeout(() => {
            navigate(result.data.redirectTo || defaultRouteByRole(result.data.user?.yetki), { replace: true });
          }, 900);
        }, 520);
      }, 420);

    } catch {
      setTimeout(() => {
        setPinPhase('glow-red');
        setTimeout(() => {
          setPins(Array(PIN_LENGTH).fill(''));
          setPinError('Sunucuya bağlanılamadı.');
          setPinPhase('idle');
          pinRefs.current[0]?.focus();
        }, 600);
      }, 300);
    }
  };

  const showPin   = step !== 'username';
  const showBoxes = showPin && pinPhase !== 'show-check' && pinPhase !== 'show-x';
  const showCheck = pinPhase === 'show-check';
  const showX     = pinPhase === 'show-x';

  return (
    <div className="app-page flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-4">
        <motion.section
          className="app-panel p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              className="app-login-logo-wrap"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <img src={appLogo} alt="Kartelix" className="app-login-logo" />
            </motion.div>
            <motion.h2
              className="mt-5 text-2xl font-bold text-[color:var(--app-text)]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
            >
              Kartelix
            </motion.h2>
          </div>

          <AnimatePresence mode="wait">
            {!showPin && (
              <motion.div
                key="username-step"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.28, ease: EASE }}
              >
                <p className="mt-6 text-center text-sm text-[color:var(--app-text-muted)]">
                  Kullanıcı adınızı girin
                </p>
                <div className="mt-5 space-y-3">
                  <div style={{ position: 'relative' }}>
                    <input
                      ref={usernameRef}
                      type="text"
                      autoComplete="username"
                      placeholder="Kullanıcı adı"
                      value={username}
                      onChange={handleUsernameChange}
                      onKeyDown={handleUsernameKeyDown}
                      className="app-input text-center text-lg"
                      autoFocus
                    />
                    {checking && (
                      <div style={{
                        position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                        width: '1.1rem', height: '1.1rem', borderRadius: '50%',
                        border: '2px solid var(--app-primary)', borderTopColor: 'transparent',
                        animation: 'spin 0.6s linear infinite',
                      }} />
                    )}
                  </div>
                  <AnimatePresence>
                    {usernameError && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-center text-sm" style={{ color: '#c0392b' }}
                      >
                        {usernameError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {showPin && (
              <motion.div
                key="pin-step"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: EASE }}
              >
                <p className="mt-6 text-center text-sm text-[color:var(--app-text-muted)]">
                  <span className="font-semibold text-[color:var(--app-text)]">{username}</span> için şifre
                </p>

                <div className="mt-6 flex justify-center" style={{ minHeight: '4rem', position: 'relative', alignItems: 'center' }}>
                  <AnimatePresence>
                    {showBoxes && (
                      <motion.div
                        style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}
                        exit={{ opacity: 0 }}
                      >
                        {pins.map((val, i) => (
                          <PinBox
                            key={i}
                            index={i}
                            value={val}
                            phase={pinPhase}
                            inputRef={el => pinRefs.current[i] = el}
                            onChange={e => handlePinChange(i, e.target.value)}
                            onKeyDown={e => handlePinKeyDown(i, e)}
                            onPaste={i === 0 ? handlePinPaste : undefined}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showCheck && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0, rotate: -20 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ duration: 0.42, ease: EASE }}
                        style={{
                          position: 'absolute', width: '3.8rem', height: '3.8rem',
                          borderRadius: '1rem',
                          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 8px 30px rgba(34,197,94,0.4)',
                        }}
                      >
                        <AnimatedCheck />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showX && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.15, 1], opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.38, ease: EASE }}
                        style={{
                          position: 'absolute', width: '3.8rem', height: '3.8rem',
                          borderRadius: '1rem',
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 8px 30px rgba(239,68,68,0.4)',
                        }}
                      >
                        <AnimatedX />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {pinError && pinPhase === 'idle' && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-3 text-center text-sm" style={{ color: '#c0392b' }}
                    >
                      {pinError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => { setStep('username'); setPins(Array(PIN_LENGTH).fill('')); setPinError(''); setPinPhase('idle'); }}
                  className="mt-5 w-full text-center text-sm"
                  style={{ color: 'var(--app-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ← Kullanıcı adını değiştir
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </div>
  );
};

export default LoginScreen;
