const express = require('express');
const rateLimit = require('express-rate-limit');
const { createRequireAuth } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const {
  resolveLoginUsername,
  getPasswordLength,
  verifyUserPassword,
  createAuthToken,
  buildRedirectTo,
  changePassword
} = require('../modules/auth/authService');

const createAuthRouter = ({ db, bcrypt, jwt, jwtSecret, bcryptRounds = 12 }) => {
  const router = express.Router();
  const requireAuth = createRequireAuth({ jwt, jwtSecret });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.' }
  });

  router.post('/check-username', async (req, res, next) => {
    try {
      const { username } = req.body;
      if (!username || !String(username).trim()) {
        return sendError(res, 'Kullanıcı adı gereklidir', 400);
      }

      const finalUsername = resolveLoginUsername(username);
      const passwordLength = await getPasswordLength(db, finalUsername);
      return sendSuccess(res, { passwordLength });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/login', loginLimiter, async (req, res, next) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return sendError(res, 'Kullanıcı adı ve şifre gereklidir', 400);
      }

      const finalUsername = resolveLoginUsername(username);
      const row = await verifyUserPassword({ db, username: finalUsername, password, bcrypt, bcryptRounds });
      if (!row) {
        return sendError(res, 'Geçersiz kullanıcı adı veya şifre', 401);
      }

      const token = createAuthToken({ payload: { id: row.id, username: row.username, yetki: row.yetki }, jwt, jwtSecret });
      return sendSuccess(res, {
        token,
        user: { id: row.id, username: row.username, yetki: row.yetki },
        redirectTo: buildRedirectTo(row.yetki)
      }, 200, 'Giriş başarılı');
    } catch (err) {
      return next(err);
    }
  });

  router.put('/change-password', requireAuth(), async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || String(newPassword).length < 4) {
        return sendError(res, 'Yeni şifre en az 4 karakter olmalıdır', 400);
      }

      const result = await changePassword({
        db,
        username: req.user.username,
        currentPassword,
        newPassword,
        bcrypt,
        bcryptRounds
      });

      if (!result.ok) {
        return sendError(res, result.message, result.status);
      }

      return sendSuccess(res, null, 200, result.message);
    } catch (err) {
      return next(err);
    }
  });

  router.put('/admin/change-password', requireAuth(['admin']), async (req, res, next) => {
    try {
      const { username, newPassword } = req.body;
      if (!username || !String(username).trim()) {
        return sendError(res, 'Kullanıcı adı zorunludur', 400);
      }
      if (!newPassword || String(newPassword).length < 4) {
        return sendError(res, 'Yeni şifre en az 4 karakter olmalıdır', 400);
      }

      const result = await changePassword({
        db,
        username: String(username).trim(),
        currentPassword: '',
        newPassword,
        bcrypt,
        bcryptRounds,
        skipCurrentPasswordCheck: true
      });

      if (!result.ok) {
        return sendError(res, result.message, result.status);
      }

      return sendSuccess(res, null, 200, 'Şifre güncellendi');
    } catch (err) {
      return next(err);
    }
  });

  return router;
};

module.exports = createAuthRouter;
