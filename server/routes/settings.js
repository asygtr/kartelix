const express = require('express');
const { createRequireAuth } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const {
  loadOrderEmailSettings,
  saveOrderEmailSettings,
  loadGenelAyarlar,
  saveGenelAyarlar,
  parseEmailList,
  sendSmtpMail,
  classifyEmailError
} = require('../modules/settings/settingsService');

const createSettingsRouter = ({ db, jwt, jwtSecret, nodemailer }) => {
  const router = express.Router();
  const requireAuth = createRequireAuth({ jwt, jwtSecret });

  router.get('/theme-settings', async (req, res, next) => {
    try {
      const rows = await new Promise((resolve, reject) => {
        db.all(
          `SELECT anahtar, deger FROM ui_ayarlari WHERE anahtar IN ('active_palette', 'app_logo', 'app_background')`,
          [],
          (err, resultRows) => (err ? reject(err) : resolve(resultRows || []))
        );
      });

      const data = rows.reduce((acc, row) => {
        acc[row.anahtar] = row.deger;
        return acc;
      }, {});

      return sendSuccess(res, {
        activePalette: data.active_palette || 'atelier',
        appLogo: data.app_logo || '/nevres.png',
        appBackground: data.app_background || '/showroom-bg.png'
      });
    } catch (err) {
      return next(err);
    }
  });

  router.put('/admin/theme-settings', requireAuth(['admin']), async (req, res, next) => {
    try {
      const { activePalette, appLogo, appBackground } = req.body;

      if (!activePalette || !String(activePalette).trim()) {
        return sendError(res, 'Tema seçimi zorunludur', 400);
      }

      const updates = [
        ['active_palette', String(activePalette).trim()],
        ['app_logo', String(appLogo || '/nevres.png').trim()],
        ['app_background', String(appBackground || '/showroom-bg.png').trim()]
      ];

      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');

          let completed = 0;
          let hasError = false;

          updates.forEach(([key, value]) => {
            db.run(
              `INSERT INTO ui_ayarlari (anahtar, deger)
               VALUES (?, ?)
               ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger, updated_at = CURRENT_TIMESTAMP`,
              [key, value],
              (err) => {
                if (hasError) return;
                if (err) {
                  hasError = true;
                  db.run('ROLLBACK');
                  return reject(err);
                }

                completed += 1;
                if (completed === updates.length) {
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return reject(commitErr);
                    }
                    resolve();
                  });
                }
              }
            );
          });
        });
      });

      return sendSuccess(res, {
        activePalette: String(activePalette).trim(),
        appLogo: String(appLogo || '/nevres.png').trim(),
        appBackground: String(appBackground || '/showroom-bg.png').trim()
      });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/admin/order-email-settings', requireAuth(['admin']), async (req, res, next) => {
    try {
      const settings = await loadOrderEmailSettings(db, false);
      return sendSuccess(res, settings);
    } catch (err) {
      return next(err);
    }
  });

  router.put('/admin/order-email-settings', requireAuth(['admin']), async (req, res, next) => {
    try {
      const settings = await saveOrderEmailSettings(db, req.body || {});
      return sendSuccess(res, settings);
    } catch (err) {
      return sendError(res, err?.message || 'E-posta ayarları kaydedilemedi', 400);
    }
  });

  router.post('/admin/order-email-settings/test', requireAuth(['admin']), async (req, res) => {
    try {
      const settings = await loadOrderEmailSettings(db, true);
      const testRecipient = String(req.body?.testRecipient || '').trim();
      const recipients = parseEmailList(testRecipient || settings.recipientEmails);

      if (!recipients.length) {
        return sendError(res, 'Test alıcı e-postası zorunludur', 400);
      }
      if (!settings.smtpHost || !(settings.smtpUser || settings.senderEmail) || !settings.smtpPassword) {
        return sendError(res, 'Gmail SMTP ayarları eksik', 400);
      }

      const info = await sendSmtpMail(nodemailer, settings, recipients, 'Kartelix Gmail test', 'Kartelix sipariş e-posta ayarları başarıyla test edildi.', '<div style="font-family:Arial,sans-serif">Kartelix sipariş e-posta ayarları başarıyla test edildi.</div>');

      return sendSuccess(res, {
        messageId: info.messageId || '',
        accepted: info.accepted || recipients,
        rejected: info.rejected || []
      });
    } catch (err) {
      const emailError = classifyEmailError(err);
      return res.status(emailError.status).json({
        success: false,
        error: emailError.message,
        code: err?.code || '',
        responseCode: err?.responseCode || 0,
        stage: err?.stage || '',
        command: err?.command || '',
        response: String(err?.response || '').trim()
      });
    }
  });

  router.get('/genel-ayarlar', async (req, res, next) => {
    try {
      const settings = await loadGenelAyarlar(db);
      return sendSuccess(res, settings);
    } catch (err) {
      return next(err);
    }
  });

  router.put('/genel-ayarlar', requireAuth(['admin']), async (req, res, next) => {
    try {
      const settings = await saveGenelAyarlar(db, req.body || {});
      return sendSuccess(res, settings);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};

module.exports = { createSettingsRouter };
