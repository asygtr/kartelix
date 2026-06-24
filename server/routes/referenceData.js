const express = require('express');
const { createRequireAuth } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

const createReferenceDataRouter = ({ db, jwt, jwtSecret }) => {
  const router = express.Router();
  const requireAuth = createRequireAuth({ jwt, jwtSecret });

  router.get('/admin/mamul-turleri', requireAuth(['admin']), (req, res, next) => {
    db.all(`SELECT * FROM mamul_turleri ORDER BY ad ASC`, [], (err, rows) => {
      if (err) return next(err);
      return sendSuccess(res, rows.map((row) => ({ ...row, aktif: Boolean(row.aktif) })));
    });
  });

  router.post('/admin/mamul-turleri', requireAuth(['admin']), (req, res, next) => {
    const { ad, kodPrefix, aciklama, aktif = true } = req.body;

    if (!ad || !String(ad).trim()) {
      return sendError(res, 'Mamul türü adı zorunludur', 400);
    }

    if (!kodPrefix || !String(kodPrefix).trim()) {
      return sendError(res, 'Kod prefix zorunludur', 400);
    }

    db.run(
      `INSERT INTO mamul_turleri (ad, kod_prefix, aciklama, aktif) VALUES (?, ?, ?, ?)`,
      [String(ad).trim(), String(kodPrefix).trim(), String(aciklama || '').trim(), aktif ? 1 : 0],
      function(err) {
        if (err) return next(err);

        return sendSuccess(res, {
          id: this.lastID,
          ad: String(ad).trim(),
          kod_prefix: String(kodPrefix).trim(),
          aciklama: String(aciklama || '').trim(),
          aktif: Boolean(aktif)
        }, 201);
      }
    );
  });

  router.put('/admin/mamul-turleri/:id', requireAuth(['admin']), (req, res, next) => {
    const { ad, kodPrefix, aciklama, aktif = true } = req.body;
    const id = req.params.id;

    if (!ad || !String(ad).trim()) {
      return sendError(res, 'Mamul türü adı zorunludur', 400);
    }

    if (!kodPrefix || !String(kodPrefix).trim()) {
      return sendError(res, 'Kod prefix zorunludur', 400);
    }

    db.run(
      `UPDATE mamul_turleri
       SET ad = ?, kod_prefix = ?, aciklama = ?, aktif = ?
       WHERE id = ?`,
      [String(ad).trim(), String(kodPrefix).trim(), String(aciklama || '').trim(), aktif ? 1 : 0, id],
      function(err) {
        if (err) return next(err);
        return sendSuccess(res, {
          id: Number(id),
          ad: String(ad).trim(),
          kod_prefix: String(kodPrefix).trim(),
          aciklama: String(aciklama || '').trim(),
          aktif: Boolean(aktif)
        });
      }
    );
  });

  router.get('/admin/renkler', requireAuth(['admin']), (req, res, next) => {
    db.all(`SELECT * FROM renk_tanimlari ORDER BY ad ASC`, [], (err, rows) => {
      if (err) return next(err);
      return sendSuccess(res, rows.map((row) => ({ ...row, aktif: Boolean(row.aktif) })));
    });
  });

  router.post('/admin/renkler', requireAuth(['admin']), (req, res, next) => {
    const { ad, kod, aktif = true } = req.body;
    if (!ad || !String(ad).trim()) {
      return sendError(res, 'Renk adı zorunludur', 400);
    }
    if (!kod || !String(kod).trim()) {
      return sendError(res, 'Renk kodu zorunludur', 400);
    }

    db.run(
      `INSERT INTO renk_tanimlari (ad, kod, aktif) VALUES (?, ?, ?)`,
      [String(ad).trim(), String(kod).trim(), aktif ? 1 : 0],
      function(err) {
        if (err) return next(err);
        return sendSuccess(res, { id: this.lastID, ad: String(ad).trim(), kod: String(kod).trim(), aktif: Boolean(aktif) }, 201);
      }
    );
  });

  router.put('/admin/renkler/:id', requireAuth(['admin']), (req, res, next) => {
    const { ad, kod, aktif = true } = req.body;
    const id = req.params.id;

    if (!ad || !String(ad).trim()) {
      return sendError(res, 'Renk adı zorunludur', 400);
    }
    if (!kod || !String(kod).trim()) {
      return sendError(res, 'Renk kodu zorunludur', 400);
    }

    db.run(
      `UPDATE renk_tanimlari SET ad = ?, kod = ?, aktif = ? WHERE id = ?`,
      [String(ad).trim(), String(kod).trim(), aktif ? 1 : 0, id],
      function(err) {
        if (err) return next(err);
        return sendSuccess(res, { id: Number(id), ad: String(ad).trim(), kod: String(kod).trim(), aktif: Boolean(aktif) });
      }
    );
  });

  router.get('/admin/iplikler', requireAuth(['admin']), (req, res, next) => {
    db.all(`SELECT * FROM iplik_tanimlari ORDER BY ad ASC`, [], (err, rows) => {
      if (err) return next(err);
      return sendSuccess(res, rows.map((row) => ({ ...row, aktif: Boolean(row.aktif), birim_fiyat: Number(row.birim_fiyat || 0) })));
    });
  });

  router.post('/admin/iplikler', requireAuth(['admin']), (req, res, next) => {
    const { ad, kod, birim = 'kg', birimFiyat = 0, aktif = true } = req.body;
    if (!ad || !String(ad).trim()) {
      return sendError(res, 'İplik adı zorunludur', 400);
    }

    db.run(
      `INSERT INTO iplik_tanimlari (ad, kod, birim, birim_fiyat, aktif) VALUES (?, ?, ?, ?, ?)`,
      [String(ad).trim(), String(kod || '').trim(), String(birim || 'kg').trim(), Number(birimFiyat || 0), aktif ? 1 : 0],
      function(err) {
        if (err) return next(err);
        return sendSuccess(res, { id: this.lastID, ad: String(ad).trim(), kod: String(kod || '').trim(), birim: String(birim || 'kg').trim(), birim_fiyat: Number(birimFiyat || 0), aktif: Boolean(aktif) }, 201);
      }
    );
  });

  router.put('/admin/iplikler/:id', requireAuth(['admin']), (req, res, next) => {
    const { ad, kod, birim = 'kg', birimFiyat = 0, aktif = true } = req.body;
    const id = req.params.id;

    if (!ad || !String(ad).trim()) {
      return sendError(res, 'İplik adı zorunludur', 400);
    }

    db.run(
      `UPDATE iplik_tanimlari
       SET ad = ?, kod = ?, birim = ?, birim_fiyat = ?, aktif = ?
       WHERE id = ?`,
      [String(ad).trim(), String(kod || '').trim(), String(birim || 'kg').trim(), Number(birimFiyat || 0), aktif ? 1 : 0, id],
      function(err) {
        if (err) return next(err);
        return sendSuccess(res, {
          id: Number(id),
          ad: String(ad).trim(),
          kod: String(kod || '').trim(),
          birim: String(birim || 'kg').trim(),
          birim_fiyat: Number(birimFiyat || 0),
          aktif: Boolean(aktif)
        });
      }
    );
  });

  router.get('/admin/prosesler', requireAuth(['admin']), (req, res, next) => {
    db.all(`SELECT * FROM proses_tanimlari ORDER BY ad ASC`, [], (err, rows) => {
      if (err) return next(err);
      return sendSuccess(res, rows.map((row) => ({ ...row, aktif: Boolean(row.aktif), renk_bazli: Boolean(row.renk_bazli), birim_maliyet: Number(row.birim_maliyet || 0) })));
    });
  });

  router.post('/admin/prosesler', requireAuth(['admin']), (req, res, next) => {
    const { ad, tip, birimMaliyet = 0, renkBazli = false, aktif = true } = req.body;
    if (!ad || !String(ad).trim()) {
      return sendError(res, 'Proses adı zorunludur', 400);
    }

    db.run(
      `INSERT INTO proses_tanimlari (ad, tip, birim_maliyet, renk_bazli, aktif) VALUES (?, ?, ?, ?, ?)`,
      [String(ad).trim(), String(tip || '').trim(), Number(birimMaliyet || 0), renkBazli ? 1 : 0, aktif ? 1 : 0],
      function(err) {
        if (err) return next(err);
        return sendSuccess(res, { id: this.lastID, ad: String(ad).trim(), tip: String(tip || '').trim(), birim_maliyet: Number(birimMaliyet || 0), renk_bazli: Boolean(renkBazli), aktif: Boolean(aktif) }, 201);
      }
    );
  });

  router.put('/admin/prosesler/:id', requireAuth(['admin']), (req, res, next) => {
    const { ad, tip, birimMaliyet = 0, renkBazli = false, aktif = true } = req.body;
    const id = req.params.id;

    if (!ad || !String(ad).trim()) {
      return sendError(res, 'Proses adı zorunludur', 400);
    }

    db.run(
      `UPDATE proses_tanimlari
       SET ad = ?, tip = ?, birim_maliyet = ?, renk_bazli = ?, aktif = ?
       WHERE id = ?`,
      [String(ad).trim(), String(tip || '').trim(), Number(birimMaliyet || 0), renkBazli ? 1 : 0, aktif ? 1 : 0, id],
      function(err) {
        if (err) return next(err);
        return sendSuccess(res, {
          id: Number(id),
          ad: String(ad).trim(),
          tip: String(tip || '').trim(),
          birim_maliyet: Number(birimMaliyet || 0),
          renk_bazli: Boolean(renkBazli),
          aktif: Boolean(aktif)
        });
      }
    );
  });

  return router;
};

module.exports = { createReferenceDataRouter };
