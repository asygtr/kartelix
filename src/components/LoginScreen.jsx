import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { defaultRouteByRole, getSession, saveSession } from '../utils/auth';
import { useTheme } from '../theme/ThemeProvider';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { appLogo } = useTheme();

  useEffect(() => {
    const session = getSession();
    if (session?.yetki) {
      navigate(defaultRouteByRole(session.yetki), { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Giris basarisiz');
      }

      saveSession(result.data.user);
      navigate(result.data.redirectTo || defaultRouteByRole(result.data.user?.yetki), { replace: true });
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="app-page flex items-center justify-center">
      <div className="app-container max-w-xl">
        <section className="app-panel p-8 md:p-10">
          <div className="mx-auto flex max-w-sm flex-col items-center text-center">
            <div className="app-login-logo-wrap">
              <img src={appLogo} alt="Kartelix logo" className="app-login-logo" />
            </div>
            <h2 className="mt-5 text-3xl font-bold text-[color:var(--app-text)]">Kartelix Girişi</h2>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="text"
              placeholder="Kullanıcı adı"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="app-input"
              required
            />
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="app-input"
              required
            />
            <button type="submit" className="app-btn-primary w-full">
              Giriş yap
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default LoginScreen;
