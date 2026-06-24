const express = require('express');
const { createRequireAuth } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { createMamullerService } = require('../modules/mamuller/mamullerService');

const createMamullerRouter = ({ db, jwt, jwtSecret }) => {
  const router = express.Router();
  const requireAuth = createRequireAuth({ jwt, jwtSecret });
  const mamullerService = createMamullerService({ db });

  router.get('/admin/mamuller', requireAuth(['admin']), async (req, res, next) => {
    try {
      const term = String(req.query.term || '').trim();
      const params = [];
      let sql = `
        SELECT mk.*, mt.ad AS mamul_turu_adi, mt.kod_prefix
        FROM mamul_kartlari mk
        INNER JOIN mamul_turleri mt ON mt.id = mk.mamul_turu_id
      `;

      if (term) {
        sql += ` WHERE mk.mamul_adi LIKE ? OR mk.article_no LIKE ? OR mk.article_code LIKE ? OR mk.renk LIKE ?`;
        const likeTerm = `%${term}%`;
        params.push(likeTerm, likeTerm, likeTerm, likeTerm);
      }

      sql += ` ORDER BY mk.updated_at DESC, mk.created_at DESC`;
      const rows = await new Promise((resolve, reject) => {
        db.all(sql, params, (err, resultRows) => (err ? reject(err) : resolve(resultRows || [])));
      });

      return sendSuccess(res, rows.map(mamullerService.mapMamulCard));
    } catch (err) {
      return next(err);
    }
  });

  router.get('/admin/mamuller/:id', requireAuth(['admin', 'mamul']), async (req, res, next) => {
    try {
      const detail = await mamullerService.loadMamulDetailByClause('mk.id = ?', [req.params.id]);
      if (!detail) return sendError(res, 'Mamul bulunamadi', 404);
      return sendSuccess(res, detail);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/admin/mamul-lookup', requireAuth(['admin', 'staff', 'mamul']), async (req, res, next) => {
    try {
      const normalizedCode = mamullerService.normalizeLookupCode(req.query.code);
      if (!normalizedCode) return sendError(res, 'QR veya kod bilgisi gereklidir', 400);

      const detail = await mamullerService.loadMamulDetailByClause(
        `mk.qr_slug = ? OR mk.article_code = ? OR mk.article_no = ?`,
        [normalizedCode, normalizedCode, normalizedCode]
      );

      if (!detail) return sendError(res, 'QR ile eslesen mamul bulunamadi', 404);
      return sendSuccess(res, detail);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/admin/mamuller', requireAuth(['admin']), async (req, res, next) => {
    try {
      const {
        mamulAdi,
        mamulTuruId,
        koleksiyonAdi,
        yayinDurumu = 'taslak',
        renk,
        renkKodu,
        kompozisyonOzeti,
        en,
        gramaj,
        aciklama,
        tanitimBasligi,
        tanitimHikayesi,
        materyalNotlari,
        gorselUrl,
        vurguEtiketi,
        bakimTalimatlari,
        birKgSatisFiyati,
        paraBirimi = 'TRY',
        aktif = true,
        iplikler = [],
        prosesler = []
      } = req.body;

      if (!mamulAdi || !String(mamulAdi).trim()) return sendError(res, 'Mamul adı zorunludur', 400);
      if (!mamulTuruId) return sendError(res, 'Mamul türü seçilmelidir', 400);

      const articleData = await mamullerService.generateNextArticleNoForType(mamulTuruId);
      const { articleNo, articleCode } = articleData;
      const qrSlug = mamullerService.slugify(`${articleCode}-${mamulAdi}-${renk || ''}`);
      const calculatedYarnCost = mamullerService.calculateYarnCost(Array.isArray(iplikler) ? iplikler : []);
      const calculatedProcessCost = mamullerService.calculateProcessCost(Array.isArray(prosesler) ? prosesler : []);
      const totalCost = Number((calculatedYarnCost + calculatedProcessCost).toFixed(2));
      const normalizedIplikler = (Array.isArray(iplikler) ? iplikler : []).filter((item) => item && item.iplik_adi);
      const normalizedProsesler = (Array.isArray(prosesler) ? prosesler : []).filter((item) => item && item.proses_adi);

      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          db.run(
            `INSERT INTO mamul_kartlari (
              mamul_adi, mamul_turu_id, article_no, article_code, koleksiyon_adi, yayin_durumu, renk, renk_kodu,
              kompozisyon_ozeti, en, gramaj, aciklama, tanitim_basligi, tanitim_hikayesi,
              materyal_notlari, gorsel_url, vurgu_etiketi, bakim_talimatlari, bir_kg_maliyet, bir_kg_satis_fiyati, para_birimi, qr_slug, aktif
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [
              String(mamulAdi).trim(),
              mamulTuruId,
              String(articleNo),
              articleCode,
              String(koleksiyonAdi || '').trim(),
              String(yayinDurumu || 'taslak').trim(),
              String(renk || '').trim(),
              String(renkKodu || '').trim(),
              String(kompozisyonOzeti || '').trim(),
              String(en || '').trim(),
              String(gramaj || '').trim(),
              String(aciklama || '').trim(),
              String(tanitimBasligi || '').trim(),
              String(tanitimHikayesi || '').trim(),
              String(materyalNotlari || '').trim(),
              String(gorselUrl || '').trim(),
              String(vurguEtiketi || '').trim(),
              String(bakimTalimatlari || '').trim(),
              totalCost,
              Number(birKgSatisFiyati || 0),
              String(paraBirimi || 'TRY').trim().toUpperCase(),
              qrSlug,
              aktif ? 1 : 0
            ],
            function(insertErr) {
              if (insertErr) {
                db.run('ROLLBACK');
                return reject(insertErr);
              }

              const mamulId = this.lastID;
              const totalInserts = normalizedIplikler.length + normalizedProsesler.length;

              if (totalInserts === 0) {
                return db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    db.run('ROLLBACK');
                    return reject(commitErr);
                  }
                  resolve({ id: mamulId, articleCode, qrSlug, birKgMaliyet: totalCost });
                });
              }

              let completed = 0;
              let hasErrored = false;
              const maybeCommit = () => {
                completed += 1;
                if (completed === totalInserts && !hasErrored) {
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return reject(commitErr);
                    }
                    resolve({ id: mamulId, articleCode, qrSlug, birKgMaliyet: totalCost });
                  });
                }
              };

              normalizedIplikler.forEach((item, index) => {
                const maliyetTutari = Number((((Number(item.oran_yuzde || 0) / 100) * Number(item.birim_fiyat || 0))).toFixed(2));
                db.run(
                  `INSERT INTO mamul_iplik_detaylari (mamul_id, iplik_adi, oran_yuzde, birim_fiyat, maliyet_tutari, sira_no)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [mamulId, String(item.iplik_adi).trim(), Number(item.oran_yuzde || 0), Number(item.birim_fiyat || 0), maliyetTutari, index + 1],
                  (detailErr) => {
                    if (hasErrored) return;
                    if (detailErr) {
                      hasErrored = true;
                      db.run('ROLLBACK');
                      return reject(detailErr);
                    }
                    maybeCommit();
                  }
                );
              });

              normalizedProsesler.forEach((item, index) => {
                db.run(
                  `INSERT INTO mamul_proses_detaylari (mamul_id, proses_adi, proses_tipi, renk_bazli, birim_maliyet, aciklama, sira_no)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [
                    mamulId,
                    String(item.proses_adi).trim(),
                    String(item.proses_tipi || '').trim(),
                    item.renk_bazli ? 1 : 0,
                    Number(item.birim_maliyet || 0),
                    String(item.aciklama || '').trim(),
                    index + 1
                  ],
                  (detailErr) => {
                    if (hasErrored) return;
                    if (detailErr) {
                      hasErrored = true;
                      db.run('ROLLBACK');
                      return reject(detailErr);
                    }
                    maybeCommit();
                  }
                );
              });
            }
          );
        });
      });

      return sendSuccess(res, { id: result.id, articleCode: result.articleCode, qrSlug: result.qrSlug, birKgMaliyet: result.birKgMaliyet }, 201);
    } catch (err) {
      return next(err);
    }
  });

  router.put('/admin/mamuller/:id', requireAuth(['admin']), async (req, res, next) => {
    try {
      const mamulId = req.params.id;
      const {
        mamulAdi,
        mamulTuruId,
        koleksiyonAdi,
        yayinDurumu = 'taslak',
        renk,
        renkKodu,
        kompozisyonOzeti,
        en,
        gramaj,
        aciklama,
        tanitimBasligi,
        tanitimHikayesi,
        materyalNotlari,
        gorselUrl,
        vurguEtiketi,
        bakimTalimatlari,
        birKgSatisFiyati,
        paraBirimi = 'TRY',
        aktif = true,
        iplikler = [],
        prosesler = []
      } = req.body;

      if (!mamulAdi || !String(mamulAdi).trim()) return sendError(res, 'Mamul adı zorunludur', 400);
      if (!mamulTuruId) return sendError(res, 'Mamul türü seçilmelidir', 400);

      const existing = await new Promise((resolve, reject) => {
        db.get('SELECT article_no, article_code FROM mamul_kartlari WHERE id = ?', [mamulId], (err, row) => (err ? reject(err) : resolve(row || null)));
      });

      if (!existing) return sendError(res, 'Mamül bulunamadı', 404);

      const qrSlug = mamullerService.slugify(`${existing.article_code}-${mamulAdi}-${renk || ''}`);
      const calculatedYarnCost = mamullerService.calculateYarnCost(Array.isArray(iplikler) ? iplikler : []);
      const calculatedProcessCost = mamullerService.calculateProcessCost(Array.isArray(prosesler) ? prosesler : []);
      const totalCost = Number((calculatedYarnCost + calculatedProcessCost).toFixed(2));
      const normalizedIplikler = (Array.isArray(iplikler) ? iplikler : []).filter((item) => item && item.iplik_adi);
      const normalizedProsesler = (Array.isArray(prosesler) ? prosesler : []).filter((item) => item && item.proses_adi);
      const formulJson = JSON.stringify({
        editedAt: new Date().toISOString(),
        source: 'admin_edit',
        iplikler: normalizedIplikler.map((item) => ({
          iplik_adi: item.iplik_adi,
          oran_yuzde: Number(item.oran_yuzde || 0),
          birim_fiyat: Number(item.birim_fiyat || 0),
          maliyet_tutari: Number(((Number(item.oran_yuzde || 0) / 100) * Number(item.birim_fiyat || 0)).toFixed(2))
        })),
        prosesler: normalizedProsesler.map((item) => ({
          proses_adi: item.proses_adi,
          proses_tipi: item.proses_tipi,
          birim_maliyet: Number(item.birim_maliyet || 0)
        }))
      });

      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          db.run(
            `UPDATE mamul_kartlari
             SET mamul_adi = ?,
                 mamul_turu_id = ?,
                 koleksiyon_adi = ?,
                 yayin_durumu = ?,
                 renk = ?,
                 renk_kodu = ?,
                 kompozisyon_ozeti = ?,
                 en = ?,
                 gramaj = ?,
                 aciklama = ?,
                 tanitim_basligi = ?,
                 tanitim_hikayesi = ?,
                 materyal_notlari = ?,
                 gorsel_url = ?,
                 vurgu_etiketi = ?,
                 bakim_talimatlari = ?,
                 bir_kg_maliyet = ?,
                 bir_kg_satis_fiyati = ?,
                 para_birimi = ?,
                 qr_slug = ?,
                 aktif = ?,
                 excel_formul_json = ?,
                 excel_updated_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              String(mamulAdi).trim(),
              mamulTuruId,
              String(koleksiyonAdi || '').trim(),
              String(yayinDurumu || 'taslak').trim(),
              String(renk || '').trim(),
              String(renkKodu || '').trim(),
              String(kompozisyonOzeti || '').trim(),
              String(en || '').trim(),
              String(gramaj || '').trim(),
              String(aciklama || '').trim(),
              String(tanitimBasligi || '').trim(),
              String(tanitimHikayesi || '').trim(),
              String(materyalNotlari || '').trim(),
              String(gorselUrl || '').trim(),
              String(vurguEtiketi || '').trim(),
              String(bakimTalimatlari || '').trim(),
              totalCost,
              Number(birKgSatisFiyati || 0),
              String(paraBirimi || 'TRY').trim().toUpperCase(),
              qrSlug,
              aktif ? 1 : 0,
              formulJson,
              mamulId
            ],
            (updateErr) => {
              if (updateErr) {
                db.run('ROLLBACK');
                return reject(updateErr);
              }

              db.run('DELETE FROM mamul_iplik_detaylari WHERE mamul_id = ?', [mamulId], (deleteYarnErr) => {
                if (deleteYarnErr) {
                  db.run('ROLLBACK');
                  return reject(deleteYarnErr);
                }

                db.run('DELETE FROM mamul_proses_detaylari WHERE mamul_id = ?', [mamulId], (deleteProcessErr) => {
                  if (deleteProcessErr) {
                    db.run('ROLLBACK');
                    return reject(deleteProcessErr);
                  }

                  const totalInserts = normalizedIplikler.length + normalizedProsesler.length;
                  if (totalInserts === 0) {
                    return db.run('COMMIT', (commitErr) => {
                      if (commitErr) {
                        db.run('ROLLBACK');
                        return reject(commitErr);
                      }
                      resolve({ id: Number(mamulId), articleNo: existing.article_no, articleCode: existing.article_code, qrSlug, birKgMaliyet: totalCost });
                    });
                  }

                  let completed = 0;
                  let hasErrored = false;
                  const maybeCommit = () => {
                    completed += 1;
                    if (completed === totalInserts && !hasErrored) {
                      db.run('COMMIT', (commitErr) => {
                        if (commitErr) {
                          db.run('ROLLBACK');
                          return reject(commitErr);
                        }
                        resolve({ id: Number(mamulId), articleNo: existing.article_no, articleCode: existing.article_code, qrSlug, birKgMaliyet: totalCost });
                      });
                    }
                  };

                  normalizedIplikler.forEach((item, index) => {
                    const maliyetTutari = Number((((Number(item.oran_yuzde || 0) / 100) * Number(item.birim_fiyat || 0))).toFixed(2));
                    db.run(
                      `INSERT INTO mamul_iplik_detaylari (mamul_id, iplik_adi, oran_yuzde, birim_fiyat, maliyet_tutari, sira_no)
                       VALUES (?, ?, ?, ?, ?, ?)`,
                      [mamulId, String(item.iplik_adi).trim(), Number(item.oran_yuzde || 0), Number(item.birim_fiyat || 0), maliyetTutari, index + 1],
                      (detailErr) => {
                        if (hasErrored) return;
                        if (detailErr) {
                          hasErrored = true;
                          db.run('ROLLBACK');
                          return reject(detailErr);
                        }
                        maybeCommit();
                      }
                    );
                  });

                  normalizedProsesler.forEach((item, index) => {
                    db.run(
                      `INSERT INTO mamul_proses_detaylari (mamul_id, proses_adi, proses_tipi, renk_bazli, birim_maliyet, aciklama, sira_no)
                       VALUES (?, ?, ?, ?, ?, ?, ?)`,
                      [
                        mamulId,
                        String(item.proses_adi).trim(),
                        String(item.proses_tipi || '').trim(),
                        item.renk_bazli ? 1 : 0,
                        Number(item.birim_maliyet || 0),
                        String(item.aciklama || '').trim(),
                        index + 1
                      ],
                      (detailErr) => {
                        if (hasErrored) return;
                        if (detailErr) {
                          hasErrored = true;
                          db.run('ROLLBACK');
                          return reject(detailErr);
                        }
                        maybeCommit();
                      }
                    );
                  });
                });
              });
            }
          );
        });
      });

      return sendSuccess(res, { id: Number(mamulId), articleNo: existing.article_no, articleCode: existing.article_code, qrSlug, birKgMaliyet: totalCost });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/public/mamuller/:slug', async (req, res, next) => {
    try {
      const slug = req.params.slug;
      const mamul = await new Promise((resolve, reject) => {
        db.get(
          `SELECT mk.*, mt.ad AS mamul_turu_adi, mt.kod_prefix
           FROM mamul_kartlari mk
           INNER JOIN mamul_turleri mt ON mt.id = mk.mamul_turu_id
           WHERE mk.qr_slug = ? AND mk.aktif = 1`,
          [slug],
          (err, row) => (err ? reject(err) : resolve(row || null))
        );
      });

      if (!mamul) return sendError(res, 'Mamul bulunamadı', 404);

      mamullerService.trackMamulEvent(mamul.id, 'public_view', 'public');

      const relatedRows = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, mamul_adi, article_code, qr_slug, renk, tanitim_basligi, gorsel_url
           FROM mamul_kartlari
           WHERE aktif = 1 AND id != ? AND (mamul_turu_id = ? OR koleksiyon_adi = ?)
           ORDER BY updated_at DESC
           LIMIT 4`,
          [mamul.id, mamul.mamul_turu_id, String(mamul.koleksiyon_adi || '').trim()],
          (err, rows) => (err ? reject(err) : resolve(rows || []))
        );
      });

      const yarnRows = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, iplik_adi, oran_yuzde, sira_no
           FROM mamul_iplik_detaylari
           WHERE mamul_id = ?
           ORDER BY sira_no ASC, id ASC`,
          [mamul.id],
          (err, rows) => (err ? reject(err) : resolve(rows || []))
        );
      });

      const processRows = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, proses_adi, proses_tipi, aciklama, sira_no
           FROM mamul_proses_detaylari
           WHERE mamul_id = ?
           ORDER BY sira_no ASC, id ASC`,
          [mamul.id],
          (err, rows) => (err ? reject(err) : resolve(rows || []))
        );
      });

      return sendSuccess(res, {
        id: mamul.id,
        mamul_adi: mamul.mamul_adi,
        article_no: mamul.article_no,
        article_code: mamul.article_code,
        mamul_turu_adi: mamul.mamul_turu_adi,
        koleksiyon_adi: mamul.koleksiyon_adi || '',
        yayin_durumu: mamul.yayin_durumu || 'yayinda',
        renk: mamul.renk,
        kompozisyon_ozeti: mamul.kompozisyon_ozeti,
        en: mamul.en,
        gramaj: mamul.gramaj,
        aciklama: mamul.aciklama,
        qr_slug: mamul.qr_slug,
        tanitim_basligi: mamul.tanitim_basligi,
        tanitim_hikayesi: mamul.tanitim_hikayesi,
        materyal_notlari: mamul.materyal_notlari,
        gorsel_url: mamul.gorsel_url,
        vurgu_etiketi: mamul.vurgu_etiketi,
        bakim_talimatlari: mamul.bakim_talimatlari,
        bir_kg_maliyet: Number(mamul.bir_kg_maliyet || 0),
        bir_kg_satis_fiyati: Number(mamul.bir_kg_satis_fiyati || 0),
        iplikler: yarnRows.map((item) => ({ ...item, oran_yuzde: Number(item.oran_yuzde || 0) })),
        prosesler: processRows,
        benzer_urunler: relatedRows
      });
    } catch (err) {
      return next(err);
    }
  });

  router.put('/admin/mamuller/:id/showcase', requireAuth(['admin']), async (req, res, next) => {
    try {
      const mamulId = req.params.id;
      const { tanitimBasligi, tanitimHikayesi, materyalNotlari, gorselUrl, vurguEtiketi, aciklama } = req.body;
      const result = await new Promise((resolve, reject) => {
        db.run(
          `UPDATE mamul_kartlari
           SET tanitim_basligi = ?,
               tanitim_hikayesi = ?,
               materyal_notlari = ?,
               gorsel_url = ?,
               vurgu_etiketi = ?,
               aciklama = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            String(tanitimBasligi || '').trim(),
            String(tanitimHikayesi || '').trim(),
            String(materyalNotlari || '').trim(),
            String(gorselUrl || '').trim(),
            String(vurguEtiketi || '').trim(),
            String(aciklama || '').trim(),
            mamulId
          ],
          function(err) {
            if (err) return reject(err);
            resolve(this.changes > 0);
          }
        );
      });

      if (!result) return sendError(res, 'Mamul bulunamadi', 404);
      return sendSuccess(res, { id: Number(mamulId) });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/admin/mamuller/:id/duplicate', requireAuth(['admin']), async (req, res, next) => {
    try {
      const mamulId = req.params.id;
      const detail = await mamullerService.loadMamulDetailByClause('mk.id = ?', [mamulId]);
      if (!detail) return sendError(res, 'Mamul bulunamadi', 404);

      const articleData = await mamullerService.generateNextArticleNoForType(detail.mamul_turu_id);
      const articleNo = articleData.articleNo;
      const articleCode = articleData.articleCode;
      const qrSlug = mamullerService.slugify(`${articleCode}-${detail.mamul_adi}-kopya-${detail.renk || ''}`);
      const iplikler = Array.isArray(detail.iplikler) ? detail.iplikler : [];
      const prosesler = Array.isArray(detail.prosesler) ? detail.prosesler : [];
      const totalCost = Number((mamullerService.calculateYarnCost(iplikler) + mamullerService.calculateProcessCost(prosesler)).toFixed(2));

      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          db.run(
            `INSERT INTO mamul_kartlari (
              mamul_adi, mamul_turu_id, article_no, article_code, koleksiyon_adi, yayin_durumu, renk, renk_kodu,
              kompozisyon_ozeti, en, gramaj, aciklama, tanitim_basligi, tanitim_hikayesi,
              materyal_notlari, gorsel_url, vurgu_etiketi, bir_kg_maliyet, bir_kg_satis_fiyati, qr_slug, aktif
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [
              `${detail.mamul_adi} Kopya`,
              detail.mamul_turu_id,
              articleNo,
              articleCode,
              String(detail.koleksiyon_adi || '').trim(),
              'taslak',
              String(detail.renk || '').trim(),
              String(detail.renk_kodu || '').trim(),
              String(detail.kompozisyon_ozeti || '').trim(),
              String(detail.en || '').trim(),
              String(detail.gramaj || '').trim(),
              String(detail.aciklama || '').trim(),
              String(detail.tanitim_basligi || '').trim(),
              String(detail.tanitim_hikayesi || '').trim(),
              String(detail.materyal_notlari || '').trim(),
              String(detail.gorsel_url || '').trim(),
              String(detail.vurgu_etiketi || '').trim(),
              totalCost,
              Number(detail.bir_kg_satis_fiyati || 0),
              qrSlug,
              0
            ],
            function(insertErr) {
              if (insertErr) {
                db.run('ROLLBACK');
                return reject(insertErr);
              }

              const newMamulId = this.lastID;
              let pending = iplikler.length + prosesler.length;

              if (pending === 0) {
                return db.run('COMMIT', (commitErr) => {
                  if (commitErr) return reject(commitErr);
                  resolve({ id: newMamulId, articleNo, articleCode, qrSlug });
                });
              }

              const maybeCommit = () => {
                pending -= 1;
                if (pending === 0) {
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return reject(commitErr);
                    }
                    resolve({ id: newMamulId, articleNo, articleCode, qrSlug });
                  });
                }
              };

              iplikler.forEach((item, index) => {
                db.run(
                  `INSERT INTO mamul_iplik_detaylari (mamul_id, iplik_adi, oran_yuzde, birim_fiyat, maliyet_tutari, sira_no)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [newMamulId, String(item.iplik_adi || '').trim(), Number(item.oran_yuzde || 0), Number(item.birim_fiyat || 0), Number(item.maliyet_tutari || 0), index + 1],
                  (detailErr) => {
                    if (detailErr) {
                      db.run('ROLLBACK');
                      return reject(detailErr);
                    }
                    maybeCommit();
                  }
                );
              });

              prosesler.forEach((item, index) => {
                db.run(
                  `INSERT INTO mamul_proses_detaylari (mamul_id, proses_adi, proses_tipi, renk_bazli, birim_maliyet, aciklama, sira_no)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [newMamulId, String(item.proses_adi || '').trim(), String(item.proses_tipi || '').trim(), item.renk_bazli ? 1 : 0, Number(item.birim_maliyet || 0), String(item.aciklama || '').trim(), index + 1],
                  (detailErr) => {
                    if (detailErr) {
                      db.run('ROLLBACK');
                      return reject(detailErr);
                    }
                    maybeCommit();
                  }
                );
              });
            }
          );
        });
      });

      return sendSuccess(res, { id: result.id, articleNo: result.articleNo, articleCode: result.articleCode, qrSlug: result.qrSlug }, 201);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/mamul-labels', async (req, res, next) => {
    try {
      const term = String(req.query.term || '').trim();
      const params = [];
      let sql = `
        SELECT mk.*, mt.ad AS mamul_turu_adi, mt.kod_prefix
        FROM mamul_kartlari mk
        INNER JOIN mamul_turleri mt ON mt.id = mk.mamul_turu_id
        WHERE 1 = 1
      `;

      if (term) {
        const likeTerm = `%${term}%`;
        sql += ` AND (mk.mamul_adi LIKE ? OR mk.article_no LIKE ? OR mk.article_code LIKE ? OR mk.renk LIKE ?)`;
        params.push(likeTerm, likeTerm, likeTerm, likeTerm);
      }

      sql += ` ORDER BY mk.updated_at DESC, mk.created_at DESC`;
      const rows = await new Promise((resolve, reject) => {
        db.all(sql, params, (err, resultRows) => (err ? reject(err) : resolve(resultRows || [])));
      });

      return sendSuccess(res, rows.map(mamullerService.mapMamulCard));
    } catch (err) {
      return next(err);
    }
  });

  return router;
};

module.exports = { createMamullerRouter };
