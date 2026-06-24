const createRequireAuth = ({ jwt, jwtSecret }) => (roles = []) => (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Yetkisiz erişim' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (roles.length && payload.yetki !== 'admin' && !roles.includes(payload.yetki)) {
      return res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz yok' });
    }
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Geçersiz veya süresi dolmuş token' });
  }
};

module.exports = { createRequireAuth };
