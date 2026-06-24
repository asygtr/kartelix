const express = require('express');
const { createRequireAuth } = require('../middleware/auth');
const { createCatalogService } = require('../modules/catalog/catalogService');
const { sendSuccess, sendError } = require('../utils/response');

const createCatalogRouter = ({ db, jwt, jwtSecret }) => {
  const router = express.Router();
  const requireAuth = createRequireAuth({ jwt, jwtSecret });
  const catalogService = createCatalogService({ db });

  router.get('/firmalar', async (req, res, next) => {
    try {
      const data = await catalogService.listFirmalar();
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/firmalar', async (req, res, next) => {
    try {
      const data = await catalogService.createFirma(req.body || {});
      return sendSuccess(res, data, 201);
    } catch (err) {
      if (err.statusCode) {
        return sendError(res, err.message, err.statusCode);
      }
      return next(err);
    }
  });

  router.post('/admin/prosesler', requireAuth(['admin']), async (req, res, next) => {
    try {
      const data = await catalogService.createProses(req.body || {});
      return sendSuccess(res, data, 201);
    } catch (err) {
      if (err.statusCode) {
        return sendError(res, err.message, err.statusCode);
      }
      return next(err);
    }
  });

  router.put('/admin/prosesler/:id', requireAuth(['admin']), async (req, res, next) => {
    try {
      const data = await catalogService.updateProses(req.params.id, req.body || {});
      return sendSuccess(res, data);
    } catch (err) {
      if (err.statusCode) {
        return sendError(res, err.message, err.statusCode);
      }
      return next(err);
    }
  });

  router.post('/kartelalar', requireAuth(['admin']), async (req, res, next) => {
    try {
      const data = await catalogService.createKartela(req.body || {});
      return sendSuccess(res, data, 201, 'Kartela başarıyla oluşturuldu');
    } catch (err) {
      if (err.statusCode) {
        return sendError(res, err.message, err.statusCode);
      }
      return next(err);
    }
  });

  router.get('/kartelalar', requireAuth(['admin', 'staff']), async (req, res, next) => {
    try {
      const data = await catalogService.listKartelalar({
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit
      });
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/kartelalar/:id', requireAuth(['admin']), async (req, res, next) => {
    try {
      const row = await catalogService.getKartelaById(req.params.id);
      if (!row) {
        return sendError(res, 'Kartela bulunamadı', 404);
      }
      return sendSuccess(res, row);
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/kartelalar/:id', requireAuth(['admin']), async (req, res, next) => {
    try {
      const result = await catalogService.deleteKartela(req.params.id);
      if (!result.deleted) {
        return sendError(res, 'Kartela bulunamadı', 404);
      }
      return sendSuccess(res, { deleted: true }, 200, 'Kartela başarıyla silindi');
    } catch (err) {
      return next(err);
    }
  });

  router.get('/siparis-kartela-ara', async (req, res, next) => {
    try {
      const data = await catalogService.searchKartelalar(req.query.term);
      return sendSuccess(res, { kartelalar: data });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/siparis-kartela/:kod', async (req, res, next) => {
    try {
      const row = await catalogService.getKartelaByCode(req.params.kod);
      if (!row) {
        return sendError(res, 'Kartela bulunamadı', 404);
      }
      return sendSuccess(res, row);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/kartela-kodu-kontrol/:kod', async (req, res, next) => {
    try {
      const data = await catalogService.checkKartelaCode(req.params.kod);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};

module.exports = { createCatalogRouter };