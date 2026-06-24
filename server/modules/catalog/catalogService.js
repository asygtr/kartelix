const createCatalogService = ({ db }) => {
  const dbGetAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
  });

  const dbAllAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

  const dbRunAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

  const generateArticleNo = async (prefix = 'PRD') => {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const row = await dbGetAsync(
      `SELECT COUNT(*) AS count FROM kartelalar WHERE article_no LIKE ?`,
      [`${prefix}-${datePart}-%`]
    );
    const count = Number(row?.count || 0) + 1;
    return `${prefix}-${datePart}-${String(count).padStart(5, '0')}`;
  };

  return {
    async listFirmalar() {
      return dbAllAsync(`SELECT * FROM firmalar ORDER BY ad ASC`, []);
    },

    async createFirma({ ad, telefon, adres }) {
      const trimmedAd = String(ad || '').trim();
      if (!trimmedAd) {
        const error = new Error('Firma adı zorunludur');
        error.statusCode = 400;
        throw error;
      }

      const result = await dbRunAsync(
        `INSERT INTO firmalar (ad, telefon, adres) VALUES (?, ?, ?)`,
        [trimmedAd, String(telefon || '').trim(), String(adres || '').trim()]
      );

      return {
        id: result.lastID,
        ad: trimmedAd,
        telefon: String(telefon || '').trim(),
        adres: String(adres || '').trim()
      };
    },

    async createProses(payload = {}) {
      const ad = String(payload.ad || '').trim();
      if (!ad) {
        const error = new Error('Proses adı zorunludur');
        error.statusCode = 400;
        throw error;
      }

      const result = await dbRunAsync(
        `INSERT INTO proses_tanimlari (ad, tip, birim_maliyet, renk_bazli, aktif) VALUES (?, ?, ?, ?, ?)`,
        [
          ad,
          String(payload.tip || '').trim(),
          Number(payload.birimMaliyet || 0),
          payload.renkBazli ? 1 : 0,
          payload.aktif !== false ? 1 : 0
        ]
      );

      return {
        id: result.lastID,
        ad,
        tip: String(payload.tip || '').trim(),
        birim_maliyet: Number(payload.birimMaliyet || 0),
        renk_bazli: Boolean(payload.renkBazli),
        aktif: payload.aktif !== false
      };
    },

    async updateProses(id, payload = {}) {
      const ad = String(payload.ad || '').trim();
      if (!ad) {
        const error = new Error('Proses adı zorunludur');
        error.statusCode = 400;
        throw error;
      }

      await dbRunAsync(
        `UPDATE proses_tanimlari
         SET ad = ?, tip = ?, birim_maliyet = ?, renk_bazli = ?, aktif = ?
         WHERE id = ?`,
        [
          ad,
          String(payload.tip || '').trim(),
          Number(payload.birimMaliyet || 0),
          payload.renkBazli ? 1 : 0,
          payload.aktif !== false ? 1 : 0,
          id
        ]
      );

      return {
        id: Number(id),
        ad,
        tip: String(payload.tip || '').trim(),
        birim_maliyet: Number(payload.birimMaliyet || 0),
        renk_bazli: Boolean(payload.renkBazli),
        aktif: payload.aktif !== false
      };
    },

    async createKartela(payload = {}) {
      const kod = String(payload.kod || '').trim();
      const mamulAdi = String(payload.mamul_adi || '').trim();
      if (!kod) {
        const error = new Error('Kartela kodu zorunludur');
        error.statusCode = 400;
        throw error;
      }
      if (!mamulAdi) {
        const error = new Error('Mamul adı zorunludur');
        error.statusCode = 400;
        throw error;
      }

      const articleNo = await generateArticleNo(String(payload.prefix || 'PRD').trim() || 'PRD');
      const result = await dbRunAsync(
        `INSERT INTO kartelalar (kod, mamul_adi, tip, kompozisyon, en, gramaj, article_no)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          kod,
          mamulAdi,
          String(payload.tip || '').trim(),
          String(payload.kompozisyon || '').trim(),
          String(payload.en || '').trim(),
          String(payload.gramaj || '').trim(),
          articleNo
        ]
      );

      return { id: result.lastID, articleNo };
    },

    async listKartelalar({ search, page = 1, limit = 10 } = {}) {
      const normalizedPage = Math.max(1, Number(page) || 1);
      const normalizedLimit = Math.max(1, Number(limit) || 10);
      const offset = (normalizedPage - 1) * normalizedLimit;
      const term = String(search || '').trim();
      const params = [];

      let sql = `SELECT * FROM kartelalar`;
      let countSql = `SELECT COUNT(*) as total FROM kartelalar`;

      if (term) {
        const searchTerm = `%${term}%`;
        sql += ` WHERE kod LIKE ? OR mamul_adi LIKE ? OR article_no LIKE ?`;
        countSql += ` WHERE kod LIKE ? OR mamul_adi LIKE ? OR article_no LIKE ?`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;

      const countRow = await dbGetAsync(countSql, params);
      const rows = await dbAllAsync(sql, [...params, normalizedLimit, offset]);

      return {
        kartelalar: rows,
        pagination: {
          page: normalizedPage,
          limit: normalizedLimit,
          total: Number(countRow?.total || 0),
          totalPages: Math.ceil(Number(countRow?.total || 0) / normalizedLimit)
        }
      };
    },

    async getKartelaById(id) {
      return dbGetAsync(`SELECT * FROM kartelalar WHERE id = ?`, [id]);
    },

    async deleteKartela(id) {
      const result = await dbRunAsync(`DELETE FROM kartelalar WHERE id = ?`, [id]);
      return { deleted: result.changes > 0 };
    },

    async searchKartelalar(term) {
      const normalizedTerm = String(term || '').trim();
      if (normalizedTerm.length < 2) {
        return [];
      }

      const searchTerm = `%${normalizedTerm}%`;
      return dbAllAsync(
        `SELECT id, kod, mamul_adi, tip, article_no
         FROM kartelalar
         WHERE kod LIKE ? OR mamul_adi LIKE ? OR article_no LIKE ?
         ORDER BY CASE
           WHEN kod LIKE ? THEN 1
           WHEN mamul_adi LIKE ? THEN 2
           ELSE 3
         END
         LIMIT 20`,
        [searchTerm, searchTerm, searchTerm, `%${normalizedTerm}%`, `%${normalizedTerm}%`]
      );
    },

    async getKartelaByCode(kod) {
      return dbGetAsync(
        `SELECT id, kod, mamul_adi, tip, article_no FROM kartelalar WHERE kod = ?`,
        [kod]
      );
    },

    async checkKartelaCode(kod) {
      const row = await dbGetAsync(`SELECT COUNT(*) as count FROM kartelalar WHERE kod = ?`, [kod]);
      const count = Number(row?.count || 0);
      return {
        mevcut: count > 0,
        mesaj: count > 0 ? 'Bu kartela kodu zaten mevcut' : 'Kod kullanılabilir'
      };
    }
  };
};

module.exports = { createCatalogService };