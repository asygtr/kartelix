const SESSION_KEY = 'showroomSession';

export const defaultRouteByRole = (role) => {
  if (role === 'staff') return '/staff/orders/new';
  if (role === 'mamul') return '/mamul/labels';
  return '/admin';
};

export const saveSession = (user) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('authToken');
};

export const hasRequiredRole = (user, allowedRoles) => {
  if (!user) return false;
  if (user.yetki === 'admin') return true;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(user.yetki);
};
