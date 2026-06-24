const express = require('express');
const { createRequireAuth } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { createOrdersService } = require('../modules/orders/ordersService');

const createOrdersRouter = ({ db, jwt, jwtSecret, nodemailer }) => {
  const router = express.Router();
  const requireAuth = createRequireAuth({ jwt, jwtSecret });
  const ordersService = createOrdersService({ db, nodemailer });

  router.get('/mamul-labels', async (req, res, next) => {
    try {
      const data = await ordersService.getMamulLabels(req.query.term);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/orders', requireAuth(['admin', 'staff']), async (req, res, next) => {
    try {
      const result = await ordersService.createOrder(req.body);
      return sendSuccess(res, result, 201);
    } catch (err) {
      if (err.statusCode) {
        return sendError(res, err.body?.error || err.message, err.statusCode, err.body?.details);
      }
      return next(err);
    }
  });

  router.post('/orders/:id/complete', requireAuth(['admin']), async (req, res, next) => {
    try {
      const result = await ordersService.completeOrder(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      if (err.statusCode) {
        return sendError(res, err.body?.error || err.message, err.statusCode);
      }
      return next(err);
    }
  });

  router.get('/orders', requireAuth(['admin']), async (req, res, next) => {
    try {
      const data = await ordersService.listOrders();
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/orders/:id', requireAuth(['admin', 'staff']), async (req, res, next) => {
    try {
      const data = await ordersService.getOrderById(req.params.id);
      return sendSuccess(res, data);
    } catch (err) {
      if (err.statusCode) {
        return sendError(res, err.body?.error || err.message, err.statusCode);
      }
      return next(err);
    }
  });

  router.delete('/orders/:id', requireAuth(['admin']), async (req, res, next) => {
    try {
      const result = await ordersService.deleteOrder(req.params.id);
      return sendSuccess(res, result.data || null, 200, result.message);
    } catch (err) {
      if (err.statusCode) {
        return sendError(res, err.body?.error || err.message, err.statusCode);
      }
      return next(err);
    }
  });

  router.put('/orders/:id', requireAuth(['admin', 'staff']), async (req, res, next) => {
    try {
      const result = await ordersService.updateOrder(req.params.id, req.body);
      return sendSuccess(res, result);
    } catch (err) {
      if (err.statusCode) {
        return sendError(res, err.body?.error || err.message, err.statusCode);
      }
      return next(err);
    }
  });

  router.get('/admin/reports/overview', requireAuth(['admin']), async (req, res, next) => {
    try {
      const data = await ordersService.getAdminOverview();
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/yeni-siparis', requireAuth(['admin', 'staff']), async (req, res, next) => {
    try {
      const { musteriAdi, ilgiliKisi, telefon, kartelalar, aciklama } = req.body;

      const errors = [];
      if (!musteriAdi || String(musteriAdi).trim().length < 2) {
        errors.push('Müşteri adı en az 2 karakter olmalıdır');
      }
      if (!kartelalar || !Array.isArray(kartelalar) || kartelalar.length === 0) {
        errors.push('En az bir kartela eklenmelidir');
      }

      if (errors.length > 0) {
        return sendError(res, 'Geçersiz veri', 400, errors);
      }

      const result = await ordersService.createLegacyOrder({ musteriAdi, ilgiliKisi, telefon, kartelalar, aciklama });
      return sendSuccess(res, { siparisId: result.siparisId }, 201, result.message);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/siparisler', requireAuth(['admin']), async (req, res, next) => {
    try {
      const data = await ordersService.listLegacyOrders();
      return sendSuccess(res, { siparisler: data });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/siparis/:id', requireAuth(['admin']), async (req, res, next) => {
    try {
      const data = await ordersService.getLegacyOrderById(req.params.id);
      if (!data) return sendError(res, 'Sipariş bulunamadı', 404);
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/siparis/:id', requireAuth(['admin']), async (req, res, next) => {
    try {
      const result = await ordersService.deleteLegacyOrder(req.params.id);
      return sendSuccess(res, null, 200, result.message);
    } catch (err) {
      if (err.statusCode) {
        return sendError(res, err.message, err.statusCode);
      }
      return next(err);
    }
  });

  router.post('/siparis-email-gonder', requireAuth(['admin']), async (req, res, next) => {
    try {
      const { siparisId, email } = req.body;
      const result = await ordersService.sendOrderEmailNotification(siparisId, email);
      if (result.skipped) {
        return sendSuccess(res, result, 200, result.message);
      }
      return sendSuccess(res, result);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};

module.exports = { createOrdersRouter };