const express = require('express');
const { createRequireAuth } = require('../middleware/auth');
const { createAdminService } = require('../modules/admin/adminService');
const { sendSuccess } = require('../utils/response');

const createAdminRouter = ({ db, jwt, jwtSecret }) => {
  const router = express.Router();
  const requireAuth = createRequireAuth({ jwt, jwtSecret });
  const adminService = createAdminService({ db });

  router.get('/stats', requireAuth(['admin']), async (req, res, next) => {
    try {
      const data = await adminService.getStats();
      return sendSuccess(res, data);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};

module.exports = { createAdminRouter };