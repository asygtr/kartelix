const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const SOURCE_ORDER = [
  'mamul_turleri',
  'renkler',
  'iplikler',
  'prosesler',
  'mamuller',
  'mamul_iplikleri',
  'mamul_prosesleri'
];

const dbRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const dbGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

const dbAll = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

const toBool = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'evet', 'yes', 'aktif', 'on'].includes(normalized);
};

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const normalized = String(value).replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `mamul-${Date.now()}`;

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const getRowValue = (row, keys, fallback = '') => {
  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);
    const match = Object.keys(row).find((candidate) => normalizeHeader(candidate) === normalizedKey);
    if (match && row[match] !== undefined && row[match] !== null && row[match] !== '') {
      return row[match];
    }
  }
  return fallback;
};

const isExcelFile = (filename) => {
  const lower = String(filename || '').toLowerCase();
  if (!(lower.endsWith('.xlsx') || lower.endsWith('.xls'))) return false;
  if (path.basename(lower).startsWith('~$')) return false;
  return true;
};

const ensureExcelTables = async (db) => {
  await dbRun(
    db,
    `CREATE TABLE IF NOT EXISTS excel_kaynaklari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kaynak_tipi TEXT NOT NULL UNIQUE,
      dosya_adi TEXT NOT NULL,
      uzanti TEXT NOT NULL DEFAULT '.xlsx',
      sheet_adi TEXT,
      aktif BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await dbRun(
    db,
    `CREATE TABLE IF NOT EXISTS excel_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      file_mtime_ms INTEGER NOT NULL,
      file_size INTEGER DEFAULT 0,
      summary_json TEXT,
      preview_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );
};

const safeJson = (value) => {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return JSON.stringify(null);
  }
};

const parseWorkbookSummary = (workbook) => {
  const summary = { sheetNames: workbook.SheetNames || [], sheets: {} };
  summary.sheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets?.[sheetName];
    const matrix = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) : [];
    const headers = Array.isArray(matrix[0]) ? matrix[0].map((cell) => String(cell ?? '').trim()) : [];
    summary.sheets[sheetName] = {
      rows: Math.max(0, matrix.length - 1),
      cols: headers.length,
      headers
    };
  });
  return summary;
};

const parseWorkbookPreview = (workbook, sheetName, previewLimit = 20) => {
  const targetSheet = sheetName && workbook.SheetNames.includes(sheetName) ? sheetName : workbook.SheetNames[0];
  const sheet = workbook.Sheets?.[targetSheet];
  if (!sheet) return { sheetName: targetSheet || '', rows: [] };
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return {
    sheetName: targetSheet || '',
    rows: rows.slice(0, Math.max(0, Number(previewLimit) || 0))
  };
};

const findConfiguredFile = (directory, fileName, extension) => {
  const normalizedFileName = String(fileName || '').trim();
  const normalizedExtension = String(extension || '').trim() || '.xlsx';
  const fullName = normalizedFileName.endsWith(normalizedExtension)
    ? normalizedFileName
    : `${normalizedFileName}${normalizedExtension}`;
  const fullPath = path.join(directory, fullName);
  if (!isExcelFile(fullPath) || !fs.existsSync(fullPath)) return null;
  const stat = fs.statSync(fullPath);
  return {
    filePath: fullPath,
    fileName: fullName,
    mtimeMs: stat.mtimeMs || 0,
    size: stat.size || 0
  };
};

const loadSources = async (db) => {
  const rows = await dbAll(
    db,
    `SELECT id, kaynak_tipi, dosya_adi, uzanti, sheet_adi, aktif
     FROM excel_kaynaklari
     WHERE aktif = 1`
  );

  return rows
    .map((row) => ({
      id: row.id,
      sourceType: row.kaynak_tipi,
      fileName: row.dosya_adi,
      extension: row.uzanti || '.xlsx',
      sheetName: row.sheet_adi || '',
      active: Boolean(row.aktif)
    }))
    .sort((left, right) => SOURCE_ORDER.indexOf(left.sourceType) - SOURCE_ORDER.indexOf(right.sourceType));
};

const loadPollMs = async (db, fallbackMs) => {
  const row = await dbGet(db, `SELECT deger FROM ui_ayarlari WHERE anahtar = 'excel_poll_ms'`);
  const value = Number(row?.deger || fallbackMs);
  return Number.isFinite(value) && value >= 5_000 ? value : fallbackMs;
};

const resolveTypeId = async (db, row) => {
  const idValue = getRowValue(row, ['mamul_turu_id', 'urun_grubu_id'], '');
  if (idValue) {
    const direct = await dbGet(db, `SELECT id, kod_prefix FROM mamul_turleri WHERE id = ?`, [idValue]);
    if (direct) return direct;
  }

  const prefix = String(getRowValue(row, ['mamul_turu_kod_prefix', 'kod_prefix', 'prefix'], '')).trim();
  if (prefix) {
    const byPrefix = await dbGet(db, `SELECT id, kod_prefix FROM mamul_turleri WHERE kod_prefix = ?`, [prefix]);
    if (byPrefix) return byPrefix;
  }

  const typeName = String(getRowValue(row, ['mamul_turu', 'mamul_turu_adi', 'urun_grubu', 'tur_adi'], '')).trim();
  if (typeName) {
    const byName = await dbGet(db, `SELECT id, kod_prefix FROM mamul_turleri WHERE lower(ad) = lower(?)`, [typeName]);
    if (byName) return byName;
  }

  return null;
};

const resolveArticleFields = (row, typeInfo) => {
  const rawArticleCode = String(getRowValue(row, ['article_code', 'article_no', 'article', 'kod'], '')).trim();
  const rawArticleNo = String(getRowValue(row, ['article_no', 'article_code', 'article', 'kod'], '')).trim();

  if (!rawArticleCode && !rawArticleNo) {
    throw new Error('Mamuller satirinda article_code veya article_no zorunludur');
  }

  const prefix = String(typeInfo?.kod_prefix || '').trim();
  let articleCode = rawArticleCode || rawArticleNo;
  let articleNo = rawArticleNo || rawArticleCode;

  if (prefix && articleCode && !String(articleCode).startsWith(prefix)) {
    articleCode = `${prefix}${String(articleCode).replace(/^\D+/, '')}`;
  }

  if (prefix && articleNo && !String(articleNo).startsWith(prefix)) {
    articleNo = `${prefix}${String(articleNo).replace(/^\D+/, '')}`;
  }

  return {
    articleCode: String(articleCode).trim(),
    articleNo: String(articleNo).trim()
  };
};

const calculateYarnCost = async (db, mamulId) => {
  const row = await dbGet(
    db,
    `SELECT SUM(maliyet_tutari) AS total
     FROM mamul_iplik_detaylari
     WHERE mamul_id = ?`,
    [mamulId]
  );
  return Number(row?.total || 0);
};

const calculateProcessCost = async (db, mamulId) => {
  const row = await dbGet(
    db,
    `SELECT SUM(birim_maliyet) AS total
     FROM mamul_proses_detaylari
     WHERE mamul_id = ?`,
    [mamulId]
  );
  return Number(row?.total || 0);
};

const recalculateCosts = async (db, mamulIds) => {
  for (const mamulId of mamulIds) {
    const yarnCost = await calculateYarnCost(db, mamulId);
    const processCost = await calculateProcessCost(db, mamulId);
    const totalCost = Number((yarnCost + processCost).toFixed(2));
    await dbRun(
      db,
      `UPDATE mamul_kartlari
       SET bir_kg_maliyet = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [totalCost, mamulId]
    );
  }
};

const importMamulTurleri = async (db, rows) => {
  let imported = 0;
  for (const row of rows) {
    const ad = String(getRowValue(row, ['ad', 'mamul_turu', 'urun_grubu'], '')).trim();
    const kodPrefix = String(getRowValue(row, ['kod_prefix', 'prefix'], '')).trim();
    if (!ad || !kodPrefix) continue;

    await dbRun(
      db,
      `INSERT INTO mamul_turleri (ad, kod_prefix, aciklama, aktif)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(kod_prefix) DO UPDATE SET
         ad = excluded.ad,
         aciklama = excluded.aciklama,
         aktif = excluded.aktif`,
      [
        ad,
        kodPrefix,
        String(getRowValue(row, ['aciklama', 'description'], '')).trim(),
        toBool(getRowValue(row, ['aktif', 'active'], 1)) ? 1 : 0
      ]
    );
    imported += 1;
  }
  return { importedRows: imported };
};

const importRenkler = async (db, rows) => {
  let imported = 0;
  for (const row of rows) {
    const ad = String(getRowValue(row, ['ad', 'renk', 'renk_adi'], '')).trim();
    const kod = String(getRowValue(row, ['kod', 'renk_kodu'], '')).trim();
    if (!ad || !kod) continue;
    await dbRun(
      db,
      `INSERT INTO renk_tanimlari (ad, kod, aktif)
       VALUES (?, ?, ?)
       ON CONFLICT(kod) DO UPDATE SET
         ad = excluded.ad,
         aktif = excluded.aktif`,
      [ad, kod, toBool(getRowValue(row, ['aktif', 'active'], 1)) ? 1 : 0]
    );
    imported += 1;
  }
  return { importedRows: imported };
};

const importIplikler = async (db, rows) => {
  let imported = 0;
  for (const row of rows) {
    const ad = String(getRowValue(row, ['ad', 'iplik_adi', 'iplik'], '')).trim();
    if (!ad) continue;
    const kod = String(getRowValue(row, ['kod', 'iplik_kodu'], '')).trim();
    await dbRun(
      db,
      `INSERT INTO iplik_tanimlari (ad, kod, birim, birim_fiyat, aktif)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(ad) DO UPDATE SET
         kod = excluded.kod,
         birim = excluded.birim,
         birim_fiyat = excluded.birim_fiyat,
         aktif = excluded.aktif`,
      [
        ad,
        kod,
        String(getRowValue(row, ['birim'], 'kg') || 'kg').trim(),
        toNumber(getRowValue(row, ['birim_fiyat', 'fiyat', 'varsayilan_fiyat'], 0)),
        toBool(getRowValue(row, ['aktif', 'active'], 1)) ? 1 : 0
      ]
    );
    imported += 1;
  }
  return { importedRows: imported };
};

const importProsesler = async (db, rows) => {
  let imported = 0;
  for (const row of rows) {
    const ad = String(getRowValue(row, ['ad', 'proses_adi', 'proses'], '')).trim();
    if (!ad) continue;
    await dbRun(
      db,
      `INSERT INTO proses_tanimlari (ad, tip, birim_maliyet, renk_bazli, aktif)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(ad) DO UPDATE SET
         tip = excluded.tip,
         birim_maliyet = excluded.birim_maliyet,
         renk_bazli = excluded.renk_bazli,
         aktif = excluded.aktif`,
      [
        ad,
        String(getRowValue(row, ['tip', 'proses_tipi'], '')).trim(),
        toNumber(getRowValue(row, ['birim_maliyet', 'maliyet'], 0)),
        toBool(getRowValue(row, ['renk_bazli'], 0), false) ? 1 : 0,
        toBool(getRowValue(row, ['aktif', 'active'], 1)) ? 1 : 0
      ]
    );
    imported += 1;
  }
  return { importedRows: imported };
};

const importMamuller = async (db, rows) => {
  let imported = 0;
  const touchedMamulIds = [];

  for (const row of rows) {
    const mamulAdi = String(getRowValue(row, ['mamul_adi', 'ad', 'urun_adi'], '')).trim();
    if (!mamulAdi) continue;

    const typeInfo = await resolveTypeId(db, row);
    if (!typeInfo) {
      throw new Error(`Mamül için ürün grubu bulunamadi: ${mamulAdi}`);
    }

    const { articleCode, articleNo } = resolveArticleFields(row, typeInfo);
    const existing = await dbGet(
      db,
      `SELECT id FROM mamul_kartlari WHERE article_code = ? OR article_no = ?`,
      [articleCode, articleNo]
    );

    const payload = {
      mamulAdi,
      mamulTuruId: typeInfo.id,
      articleNo,
      articleCode,
      koleksiyonAdi: String(getRowValue(row, ['koleksiyon_adi'], '')).trim(),
      yayinDurumu: String(getRowValue(row, ['yayin_durumu'], 'taslak') || 'taslak').trim(),
      renk: String(getRowValue(row, ['renk', 'renk_adi'], '')).trim(),
      renkKodu: String(getRowValue(row, ['renk_kodu', 'kod'], '')).trim(),
      kompozisyonOzeti: String(getRowValue(row, ['kompozisyon_ozeti', 'kompozisyon'], '')).trim(),
      en: String(getRowValue(row, ['en', 'width'], '')).trim(),
      gramaj: String(getRowValue(row, ['gramaj', 'weight'], '')).trim(),
      aciklama: String(getRowValue(row, ['aciklama', 'description'], '')).trim(),
      tanitimBasligi: String(getRowValue(row, ['tanitim_basligi'], '')).trim(),
      tanitimHikayesi: String(getRowValue(row, ['tanitim_hikayesi'], '')).trim(),
      materyalNotlari: String(getRowValue(row, ['materyal_notlari'], '')).trim(),
      gorselUrl: String(getRowValue(row, ['gorsel_url'], '')).trim(),
      vurguEtiketi: String(getRowValue(row, ['vurgu_etiketi'], '')).trim(),
      birKgSatisFiyati: toNumber(getRowValue(row, ['bir_kg_satis_fiyati', 'birim_satis_fiyati'], 0)),
      aktif: toBool(getRowValue(row, ['aktif', 'active'], 1)) ? 1 : 0,
      qrSlug: slugify(`${articleCode}-${mamulAdi}-${String(getRowValue(row, ['renk', 'renk_adi'], '') || '').trim()}`)
    };

    if (existing) {
      await dbRun(
        db,
        `UPDATE mamul_kartlari
         SET mamul_adi = ?, mamul_turu_id = ?, article_no = ?, article_code = ?, koleksiyon_adi = ?, yayin_durumu = ?,
             renk = ?, renk_kodu = ?, kompozisyon_ozeti = ?, en = ?, gramaj = ?, aciklama = ?, tanitim_basligi = ?,
             tanitim_hikayesi = ?, materyal_notlari = ?, gorsel_url = ?, vurgu_etiketi = ?, bir_kg_satis_fiyati = ?,
             aktif = ?, qr_slug = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          payload.mamulAdi,
          payload.mamulTuruId,
          payload.articleNo,
          payload.articleCode,
          payload.koleksiyonAdi,
          payload.yayinDurumu,
          payload.renk,
          payload.renkKodu,
          payload.kompozisyonOzeti,
          payload.en,
          payload.gramaj,
          payload.aciklama,
          payload.tanitimBasligi,
          payload.tanitimHikayesi,
          payload.materyalNotlari,
          payload.gorselUrl,
          payload.vurguEtiketi,
          payload.birKgSatisFiyati,
          payload.aktif,
          payload.qrSlug,
          existing.id
        ]
      );
      touchedMamulIds.push(existing.id);
    } else {
      const result = await dbRun(
        db,
        `INSERT INTO mamul_kartlari (
          mamul_adi, mamul_turu_id, article_no, article_code, koleksiyon_adi, yayin_durumu, renk, renk_kodu,
          kompozisyon_ozeti, en, gramaj, aciklama, tanitim_basligi, tanitim_hikayesi, materyal_notlari,
          gorsel_url, vurgu_etiketi, bir_kg_maliyet, bir_kg_satis_fiyati, qr_slug, aktif
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.mamulAdi,
          payload.mamulTuruId,
          payload.articleNo,
          payload.articleCode,
          payload.koleksiyonAdi,
          payload.yayinDurumu,
          payload.renk,
          payload.renkKodu,
          payload.kompozisyonOzeti,
          payload.en,
          payload.gramaj,
          payload.aciklama,
          payload.tanitimBasligi,
          payload.tanitimHikayesi,
          payload.materyalNotlari,
          payload.gorselUrl,
          payload.vurguEtiketi,
          0,
          payload.birKgSatisFiyati,
          payload.qrSlug,
          payload.aktif
        ]
      );
      touchedMamulIds.push(result.lastID);
    }

    imported += 1;
  }

  await recalculateCosts(db, touchedMamulIds);
  return { importedRows: imported };
};

const importMamulIplikleri = async (db, rows) => {
  const grouped = new Map();
  for (const row of rows) {
    const articleCode = String(getRowValue(row, ['article_code', 'article_no', 'article'], '')).trim();
    const iplikAdi = String(getRowValue(row, ['iplik_adi', 'ad', 'iplik'], '')).trim();
    if (!articleCode || !iplikAdi) continue;
    if (!grouped.has(articleCode)) grouped.set(articleCode, []);
    grouped.get(articleCode).push({
      iplikAdi,
      oranYuzde: toNumber(getRowValue(row, ['oran_yuzde', 'oran'], 0)),
      birimFiyat: toNumber(getRowValue(row, ['birim_fiyat', 'fiyat'], 0)),
      siraNo: toNumber(getRowValue(row, ['sira_no', 'sira'], grouped.get(articleCode).length + 1))
    });
  }

  let imported = 0;
  const touchedMamulIds = [];

  for (const [articleCode, details] of grouped.entries()) {
    const mamul = await dbGet(
      db,
      `SELECT id FROM mamul_kartlari WHERE article_code = ? OR article_no = ? LIMIT 1`,
      [articleCode, articleCode]
    );
    if (!mamul) continue;

    await dbRun(db, `DELETE FROM mamul_iplik_detaylari WHERE mamul_id = ?`, [mamul.id]);
    for (const detail of details) {
      const maliyetTutari = Number(((detail.oranYuzde / 100) * detail.birimFiyat).toFixed(2));
      await dbRun(
        db,
        `INSERT INTO mamul_iplik_detaylari (mamul_id, iplik_adi, oran_yuzde, birim_fiyat, maliyet_tutari, sira_no)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [mamul.id, detail.iplikAdi, detail.oranYuzde, detail.birimFiyat, maliyetTutari, detail.siraNo]
      );
      imported += 1;
    }
    touchedMamulIds.push(mamul.id);
  }

  await recalculateCosts(db, touchedMamulIds);
  return { importedRows: imported };
};

const importMamulProsesleri = async (db, rows) => {
  const grouped = new Map();
  for (const row of rows) {
    const articleCode = String(getRowValue(row, ['article_code', 'article_no', 'article'], '')).trim();
    const prosesAdi = String(getRowValue(row, ['proses_adi', 'ad', 'proses'], '')).trim();
    if (!articleCode || !prosesAdi) continue;
    if (!grouped.has(articleCode)) grouped.set(articleCode, []);
    grouped.get(articleCode).push({
      prosesAdi,
      prosesTipi: String(getRowValue(row, ['proses_tipi', 'tip'], '')).trim(),
      birimMaliyet: toNumber(getRowValue(row, ['birim_maliyet', 'maliyet'], 0)),
      renkBazli: toBool(getRowValue(row, ['renk_bazli'], 0), false),
      aciklama: String(getRowValue(row, ['aciklama', 'description'], '')).trim(),
      siraNo: toNumber(getRowValue(row, ['sira_no', 'sira'], grouped.get(articleCode).length + 1))
    });
  }

  let imported = 0;
  const touchedMamulIds = [];

  for (const [articleCode, details] of grouped.entries()) {
    const mamul = await dbGet(
      db,
      `SELECT id FROM mamul_kartlari WHERE article_code = ? OR article_no = ? LIMIT 1`,
      [articleCode, articleCode]
    );
    if (!mamul) continue;

    await dbRun(db, `DELETE FROM mamul_proses_detaylari WHERE mamul_id = ?`, [mamul.id]);
    for (const detail of details) {
      await dbRun(
        db,
        `INSERT INTO mamul_proses_detaylari (mamul_id, proses_adi, proses_tipi, renk_bazli, birim_maliyet, aciklama, sira_no)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [mamul.id, detail.prosesAdi, detail.prosesTipi, detail.renkBazli ? 1 : 0, detail.birimMaliyet, detail.aciklama, detail.siraNo]
      );
      imported += 1;
    }
    touchedMamulIds.push(mamul.id);
  }

  await recalculateCosts(db, touchedMamulIds);
  return { importedRows: imported };
};

const importers = {
  mamul_turleri: importMamulTurleri,
  renkler: importRenkler,
  iplikler: importIplikler,
  prosesler: importProsesler,
  mamuller: importMamuller,
  mamul_iplikleri: importMamulIplikleri,
  mamul_prosesleri: importMamulProsesleri
};

const insertSnapshot = async (db, payload) => {
  await dbRun(
    db,
    `INSERT INTO excel_snapshots (
      file_path, file_mtime_ms, file_size, summary_json, preview_json
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      payload.filePath,
      payload.fileMtimeMs,
      payload.fileSize,
      safeJson({
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        status: payload.status,
        importedRows: payload.importedRows,
        message: payload.message,
        workbook: payload.summary
      }),
      safeJson(payload.preview)
    ]
  );
};

const startExcelSync = ({
  db,
  directory,
  defaultIntervalMs = 60_000,
  previewLimit = 20
}) => {
  const state = {
    directory,
    defaultIntervalMs,
    previewLimit,
    lastError: null,
    lastRunAt: null,
    running: false,
    pollMs: defaultIntervalMs,
    sources: [],
    lastSeenBySource: {}
  };

  let timer = null;

  const processSource = async (source) => {
    const configuredFile = findConfiguredFile(directory, source.fileName, source.extension);
    if (!configuredFile) {
      await insertSnapshot(db, {
        filePath: path.join(directory, `${source.fileName}${source.extension}`),
        fileMtimeMs: 0,
        fileSize: 0,
        sourceType: source.sourceType,
        sourceId: source.id,
        status: 'missing',
        importedRows: 0,
        message: 'Dosya bulunamadi',
        summary: null,
        preview: null
      });
      return;
    }

    const alreadySeen = state.lastSeenBySource[source.sourceType];
    if (
      alreadySeen &&
      alreadySeen.filePath === configuredFile.filePath &&
      Number(alreadySeen.mtimeMs) === Number(configuredFile.mtimeMs)
    ) {
      return;
    }

    const workbook = XLSX.readFile(configuredFile.filePath, { cellDates: true });
    const targetSheet = source.sheetName && workbook.SheetNames.includes(source.sheetName)
      ? source.sheetName
      : workbook.SheetNames[0];

    if (!targetSheet) {
      throw new Error(`Sheet bulunamadi: ${source.fileName}${source.extension}`);
    }

    const sheet = workbook.Sheets?.[targetSheet];
    const rows = sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '' }) : [];
    const importer = importers[source.sourceType];

    if (!importer) {
      throw new Error(`Desteklenmeyen kaynak tipi: ${source.sourceType}`);
    }

    const result = await importer(db, rows);
    const summary = parseWorkbookSummary(workbook);
    const preview = parseWorkbookPreview(workbook, targetSheet, previewLimit);

    await insertSnapshot(db, {
      filePath: configuredFile.filePath,
      fileMtimeMs: configuredFile.mtimeMs,
      fileSize: configuredFile.size,
      sourceType: source.sourceType,
      sourceId: source.id,
      status: 'imported',
      importedRows: result.importedRows || 0,
      message: `${source.sourceType} icin import tamamlandi`,
      summary,
      preview
    });

    state.lastSeenBySource[source.sourceType] = {
      filePath: configuredFile.filePath,
      mtimeMs: configuredFile.mtimeMs
    };
  };

  const scheduleNext = () => {
    clearTimeout(timer);
    timer = setTimeout(runOnce, Math.max(5_000, Number(state.pollMs) || defaultIntervalMs));
  };

  const runOnce = async () => {
    if (state.running) return;
    state.running = true;
    state.lastRunAt = new Date().toISOString();

    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      await ensureExcelTables(db);
      state.pollMs = await loadPollMs(db, defaultIntervalMs);
      state.sources = await loadSources(db);

      for (const source of state.sources) {
        await processSource(source);
      }

      state.lastError = null;
    } catch (err) {
      state.lastError = err?.message || String(err);
    } finally {
      state.running = false;
      scheduleNext();
    }
  };

  runOnce();

  return {
    getStatus: async () => {
      const snapshots = await dbAll(
        db,
        `SELECT id, file_path, file_mtime_ms, file_size, summary_json, created_at
         FROM excel_snapshots
         ORDER BY id DESC
         LIMIT 10`
      );

      return {
        directory: state.directory,
        pollMs: state.pollMs,
        running: state.running,
        lastRunAt: state.lastRunAt,
        lastError: state.lastError,
        sources: state.sources,
        latestSnapshots: snapshots.map((row) => {
          let parsedSummary = null;
          try {
            parsedSummary = row.summary_json ? JSON.parse(row.summary_json) : null;
          } catch {
            parsedSummary = null;
          }
          return {
            id: row.id,
            filePath: row.file_path,
            fileMtimeMs: row.file_mtime_ms,
            fileSize: row.file_size,
            createdAt: row.created_at,
            summary: parsedSummary
          };
        })
      };
    },
    getLatestSnapshot: async () => {
      const row = await dbGet(
        db,
        `SELECT id, file_path, file_mtime_ms, file_size, summary_json, preview_json, created_at
         FROM excel_snapshots
         ORDER BY id DESC
         LIMIT 1`
      );
      if (!row) return null;
      return {
        id: row.id,
        filePath: row.file_path,
        fileMtimeMs: row.file_mtime_ms,
        fileSize: row.file_size,
        createdAt: row.created_at,
        summary: row.summary_json ? JSON.parse(row.summary_json) : null,
        preview: row.preview_json ? JSON.parse(row.preview_json) : null
      };
    },
    parseFileBySource: async (sourceType, limit) => {
      const source = (await loadSources(db)).find((item) => item.sourceType === sourceType);
      if (!source) return null;
      const configuredFile = findConfiguredFile(directory, source.fileName, source.extension);
      if (!configuredFile) return null;

      const workbook = XLSX.readFile(configuredFile.filePath, { cellDates: true });
      const targetSheet = source.sheetName && workbook.SheetNames.includes(source.sheetName)
        ? source.sheetName
        : workbook.SheetNames[0];
      const rows = targetSheet && workbook.Sheets?.[targetSheet]
        ? XLSX.utils.sheet_to_json(workbook.Sheets[targetSheet], { defval: '' })
        : [];

      return {
        sourceType,
        filePath: configuredFile.filePath,
        sheetName: targetSheet || '',
        total: rows.length,
        rows: limit ? rows.slice(0, limit) : rows
      };
    },
    runNow: async () => {
      await runOnce();
      return true;
    },
    stop: () => clearTimeout(timer)
  };
};

module.exports = { startExcelSync, SOURCE_ORDER };
