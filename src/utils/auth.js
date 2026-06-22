const SESSION_KEY = 'showroomToken';

export const defaultRouteByRole = (role) => {
  if (role === 'staff') return '/staff/orders/new';
  if (role === 'mamul') return '/mamul/labels';
  return '/admin';
};

export const saveSession = (token) => {
  localStorage.setItem(SESSION_KEY, token);
};

export const getToken = () => localStorage.getItem(SESSION_KEY) || null;

export const getSession = () => {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      clearSession();
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const hasRequiredRole = (user, allowedRoles) => {
  if (!user) return false;
  if (user.yetki === 'admin') return true;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(user.yetki);
};

export const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
