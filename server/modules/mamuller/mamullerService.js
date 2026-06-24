const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `mamul-${Date.now()}`;

const calculateYarnCost = (iplikler = []) =>
  iplikler.reduce((sum, item) => {
    const oran = Number(item.oran_yuzde || 0);
    const fiyat = Number(item.birim_fiyat || 0);
    return sum + (oran / 100) * fiyat;
  }, 0);

const calculateProcessCost = (prosesler = []) =>
  prosesler.reduce((sum, item) => sum + Number(item.birim_maliyet || 0), 0);

const mapMamulCard = (row) => ({
  ...row,
  aktif: Boolean(row.aktif),
  yayin_durumu: row.yayin_durumu || (Boolean(row.aktif) ? 'yayinda' : 'taslak'),
  bir_kg_maliyet: Number(row.bir_kg_maliyet || 0),
  bir_kg_satis_fiyati: Number(row.bir_kg_satis_fiyati || 0)
});

const mapMamulDetail = (mamul, iplikler, prosesler) => ({
  ...mapMamulCard(mamul),
  iplikler: iplikler.map((item) => ({
    ...item,
    oran_yuzde: Number(item.oran_yuzde || 0),
    birim_fiyat: Number(item.birim_fiyat || 0),
    maliyet_tutari: Number(item.maliyet_tutari || 0)
  })),
  prosesler: prosesler.map((item) => ({
    ...item,
    renk_bazli: Boolean(item.renk_bazli),
    birim_maliyet: Number(item.birim_maliyet || 0)
  }))
});

const normalizeLookupCode = (input) => {
  const raw = String(input || '').trim();
  if (!raw) return '';

  try {
    const parsedUrl = new URL(raw);
    const parts = parsedUrl.pathname.split('/').filter(Boolean);
    if (parts[0] === 'u' && parts[1]) {
      return decodeURIComponent(parts[1]);
    }
  } catch {}

  if (raw.startsWith('/u/')) {
    return raw.replace(/^\/u\//, '').trim();
  }

  return raw;
};

const createMamullerService = ({ db }) => ({
  slugify,
  calculateYarnCost,
  calculateProcessCost,
  mapMamulCard,
  mapMamulDetail,
  normalizeLookupCode,
  async loadMamulDetailByClause(whereClause, params) {
    const mamul = await new Promise((resolve, reject) => {
      db.get(
        `SELECT mk.*, mt.ad AS mamul_turu_adi, mt.kod_prefix
         FROM mamul_kartlari mk
         INNER JOIN mamul_turleri mt ON mt.id = mk.mamul_turu_id
         WHERE ${whereClause}
         LIMIT 1`,
        params,
        (err, row) => (err ? reject(err) : resolve(row || null))
      );
    });

    if (!mamul) return null;

    const iplikler = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM mamul_iplik_detaylari WHERE mamul_id = ? ORDER BY sira_no ASC, id ASC', [mamul.id], (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });

    const prosesler = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM mamul_proses_detaylari WHERE mamul_id = ? ORDER BY sira_no ASC, id ASC', [mamul.id], (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });

    return mapMamulDetail(mamul, iplikler, prosesler);
  },
  async generateNextArticleNoForType(mamulTuruId) {
    const tur = await new Promise((resolve, reject) => {
      db.get('SELECT id, kod_prefix FROM mamul_turleri WHERE id = ?', [mamulTuruId], (err, row) => (err ? reject(err) : resolve(row || null)));
    });

    if (!tur) throw new Error('Mamul türü bulunamadı');

    const prefix = String(tur.kod_prefix || '').trim();
    const suffixLength = 5 - prefix.length;
    if (suffixLength < 1) throw new Error('Kod prefix 5 haneden kısa olmalıdır');

    const row = await new Promise((resolve, reject) => {
      db.get(
        `SELECT article_no
         FROM mamul_kartlari
         WHERE article_no LIKE ?
         ORDER BY article_no DESC
         LIMIT 1`,
        [`${prefix}%`],
        (err, result) => (err ? reject(err) : resolve(result || null))
      );
    });

    const lastValue = row?.article_no ? String(row.article_no).slice(prefix.length) : '0';
    const nextNumber = String(Number(lastValue || 0) + 1).padStart(suffixLength, '0');

    return { articleNo: `${prefix}${nextNumber}`, articleCode: `${prefix}${nextNumber}`, prefix };
  },
  trackMamulEvent(mamulId, olayTipi, olayKaynagi = '') {
    if (!mamulId || !olayTipi) return;
    db.run(
      `INSERT INTO mamul_analitikleri (mamul_id, olay_tipi, olay_kaynagi) VALUES (?, ?, ?)`,
      [mamulId, String(olayTipi).trim(), String(olayKaynagi || '').trim()],
      () => {}
    );
  }
});

module.exports = { createMamullerService, slugify, calculateYarnCost, calculateProcessCost, mapMamulCard, mapMamulDetail, normalizeLookupCode };
