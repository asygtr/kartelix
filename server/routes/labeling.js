const express = require('express');
const { createRequireAuth } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { createLabelingService } = require('../modules/labeling/labelingService');

const createLabelingRouter = ({ db, jwt, jwtSecret, excelSync }) => {
  const router = express.Router();
  const requireAuth = createRequireAuth({ jwt, jwtSecret });
  const labelingService = createLabelingService({ db });

  router.get('/mamul-labels', async (req, res, next) => {
    try {
      const data = await labelingService.getMamulLabels(req.query.term);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/excel-sync/status', async (req, res) => {
    try {
      const status = await excelSync.getStatus();
      return sendSuccess(res, status);
    } catch (err) {
      return sendError(res, err?.message || 'Excel sync status alinamadi', 500);
    }
  });

  router.get('/excel-sync/latest', async (req, res) => {
    try {
      const snapshot = await excelSync.getLatestSnapshot();
      return sendSuccess(res, snapshot);
    } catch (err) {
      return sendError(res, err?.message || 'Excel snapshot alinamadi', 500);
    }
  });

  router.get('/excel-sync/parse', async (req, res) => {
    try {
      const sourceType = req.query.sourceType ? String(req.query.sourceType) : '';
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const parsed = await excelSync.parseFileBySource(sourceType, limit);
      if (!parsed) {
        return sendError(res, 'Okunacak excel kaynagi bulunamadi', 404);
      }
      return sendSuccess(res, parsed);
    } catch (err) {
      return sendError(res, err?.message || 'Excel parse basarisiz', 500);
    }
  });

  router.get('/admin/label-templates/export', requireAuth(['admin']), async (req, res, next) => {
    try {
      const csv = await labelingService.exportLabelTemplates();
      if (!csv) {
        return sendError(res, 'Aktarılacak şablon bulunamadı', 404);
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="label-templates.csv"');
      return res.send(csv);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/admin/label-templates/active', requireAuth(['admin', 'mamul']), async (req, res, next) => {
    try {
      const data = await labelingService.getActiveLabelTemplate();
      if (!data) {
        return sendSuccess(res, null);
      }
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/admin/label-templates', requireAuth(['admin', 'mamul']), async (req, res, next) => {
    try {
      const data = await labelingService.listLabelTemplates();
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/admin/label-templates/:templateId', requireAuth(['admin', 'mamul']), async (req, res, next) => {
    try {
      const data = await labelingService.getLabelTemplate(req.params.templateId);
      if (!data) {
        return sendError(res, 'Şablon bulunamadı', 404);
      }
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/admin/label-templates', requireAuth(['admin']), async (req, res, next) => {
    try {
      const { templateId, name, template, setActive } = req.body;
      if (!template) {
        return sendError(res, 'Şablon verisi zorunludur', 400);
      }
      const data = await labelingService.saveLabelTemplate({ templateId, name, template, setActive });
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/admin/label-templates/:templateId', requireAuth(['admin']), async (req, res, next) => {
    try {
      const data = await labelingService.deleteLabelTemplate(req.params.templateId);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/admin/label-templates/import', requireAuth(['admin']), express.text({ type: 'text/csv', limit: '2mb' }), async (req, res, next) => {
    try {
      const raw = String(req.body || '').trim();
      if (!raw) {
        return sendError(res, 'CSV içeriği boş', 400);
      }
      const data = await labelingService.importLabelTemplates(raw);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/etiket-ayarlari', requireAuth(['admin', 'mamul']), async (req, res, next) => {
    try {
      const data = await labelingService.getEtiketAyarlari();
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.put('/etiket-ayarlari', requireAuth(['admin']), async (req, res, next) => {
    try {
      const { ayarlar } = req.body;
      if (!Array.isArray(ayarlar)) {
        return sendError(res, 'Geçersiz ayar formatı', 400);
      }
      const data = await labelingService.updateEtiketAyarlari(ayarlar);
      return sendSuccess(res, data, 200, data.message);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/prefix-ayarlari', requireAuth(['admin']), async (req, res, next) => {
    try {
      const data = await labelingService.getPrefixAyarlari();
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/prefix-ayarlari', requireAuth(['admin']), async (req, res, next) => {
    try {
      const { prefix, aciklama } = req.body;
      if (!prefix || prefix.trim().length === 0) {
        return sendError(res, 'Prefix zorunludur', 400);
      }
      const data = await labelingService.createPrefix({ prefix, aciklama });
      return sendSuccess(res, data, 200, 'Prefix başarıyla eklendi');
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/prefix-ayarlari/:id', requireAuth(['admin']), async (req, res, next) => {
    try {
      await labelingService.deletePrefix(req.params.id);
      return sendSuccess(res, null, 200, 'Prefix başarıyla silindi');
    } catch (err) {
      return next(err);
    }
  });

  router.put('/prefix-ayarlari/:id', requireAuth(['admin']), async (req, res, next) => {
    try {
      const { prefix, aciklama } = req.body;
      if (!prefix || prefix.trim().length === 0) {
        return sendError(res, 'Prefix zorunludur', 400);
      }
      await labelingService.updatePrefix(req.params.id, { prefix, aciklama });
      return sendSuccess(res, null, 200, 'Prefix başarıyla güncellendi');
    } catch (err) {
      return next(err);
    }
  });

  return router;
};

module.exports = { createLabelingRouter };
