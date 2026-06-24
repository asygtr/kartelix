const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');

const SOURCE_ORDER = [
  'urge_fiyat_listesi',
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
  if (!(lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.xlsm'))) return false;
  if (path.basename(lower).startsWith('~$')) return false;
  return true;
};

const URGE_TYPE_NAMES = {
  10: 'Suprem',
  20: '2 Iplik',
  30: '3 Iplik',
  40: 'Interlok Double Face',
  50: 'Ribana & Kaskorse',
  60: 'Full Lyc Sup',
  70: 'Pike Fantazi Ozel Grup',
  80: 'Baskili'
};

const URGE_PROCESS_COLUMNS = [
  'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV',
  'AW', 'AX', 'AY', 'AZ', 'BA', 'BB', 'BC', 'BD'
];

const cellValue = (sheet, address, fallback = '') => {
  const cell = sheet?.[address];
  return cell && cell.v !== undefined && cell.v !== null ? cell.v : fallback;
};

const cellNumber = (sheet, address, fallback = 0) => toNumber(cellValue(sheet, address, fallback), fallback);

const compactText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const normalizeHeaderKey = (value) => normalizeHeader(String(value ?? ''));

const findHeaderColumn = (sheet, rowNumber, candidates) => {
  const normalizedCandidates = candidates.map((candidate) => normalizeHeaderKey(candidate));

  if (sheet?.['!ref']) {
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: colIndex });
      const cell = sheet?.[address];
      const value = cell && cell.v !== undefined && cell.v !== null ? cell.v : '';
      if (normalizedCandidates.includes(normalizeHeaderKey(value))) {
        return XLSX.utils.encode_col(colIndex);
      }
    }
  }

  const row = sheet?.[`${rowNumber}`];
  if (!row) return null;

  const headers = Object.keys(row || {})
    .filter((key) => key && key !== '!ref')
    .map((key) => ({ key, normalized: normalizeHeaderKey(key) }));

  const matched = headers.find((header) => normalizedCandidates.includes(header.normalized));
  return matched ? matched.key : null;
};

const getCellValueByHeader = (sheet, rowNumber, candidates, fallback = '') => {
  const column = findHeaderColumn(sheet, rowNumber, candidates);
  if (!column) return fallback;
  return cellValue(sheet, `${column}${rowNumber + 1}`, fallback);
};

const getFileFingerprint = async (filePath) => {
  const stat = await fs.promises.stat(filePath).catch(() => null);
  if (!stat) return null;

  const buffer = await fs.promises.readFile(filePath);
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return {
    size: stat.size,
    sha256: hash.digest('hex')
  };
};

const hasFileChanged = async (filePath, previousFingerprint) => {
  if (!previousFingerprint) return true;
  const fingerprint = await getFileFingerprint(filePath);
  if (!fingerprint) return true;
  return fingerprint.sha256 !== previousFingerprint.sha256 || fingerprint.size !== previousFingerprint.size;
};

const getFileTypePrefix = (fileName) => {
  const match = String(fileName || '').match(/(\d{2})\d{3}/);
  return match ? match[1] : '';
};

const ensureColumn = async (db, tableName, columnName, definition) => {
  const columns = await dbAll(db, `PRAGMA table_info(${tableName})`);
  if (columns.some((column) => column.name === columnName)) return;
  await dbRun(db, `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
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

  await ensureColumn(db, 'mamul_kartlari', 'excel_kaynak_dosyasi', 'TEXT');
  await ensureColumn(db, 'mamul_kartlari', 'excel_satir_no', 'INTEGER');
  await ensureColumn(db, 'mamul_kartlari', 'excel_ham_maliyet', 'REAL DEFAULT 0');
  await ensureColumn(db, 'mamul_kartlari', 'excel_proses_maliyeti', 'REAL DEFAULT 0');
  await ensureColumn(db, 'mamul_kartlari', 'excel_mamul_maliyeti', 'REAL DEFAULT 0');
  await ensureColumn(db, 'mamul_kartlari', 'excel_formul_json', 'TEXT');
  await ensureColumn(db, 'mamul_kartlari', 'excel_updated_at', 'DATETIME');
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

const loadKarYuzdesi = async (db) => {
  const row = await dbGet(db, `SELECT deger FROM ui_ayarlari WHERE anahtar = 'genel_ayarlar'`);
  try {
    const parsed = row?.deger ? JSON.parse(row.deger) : {};
    return Number(parsed.karYuzdesi || 0);
  } catch {
    return 0;
  }
};

const recalculateCosts = async (db, mamulIds) => {
  const karYuzdesi = await loadKarYuzdesi(db);
  for (const mamulId of mamulIds) {
    const yarnCost = await calculateYarnCost(db, mamulId);
    const processCost = await calculateProcessCost(db, mamulId);
    const totalCost = Number((yarnCost + processCost).toFixed(2));
    const satisFiyati = totalCost > 0
      ? Number((totalCost * (1 + karYuzdesi / 100)).toFixed(2))
      : 0;
    await dbRun(
      db,
      `UPDATE mamul_kartlari
       SET bir_kg_maliyet = ?, bir_kg_satis_fiyati = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [totalCost, satisFiyati, mamulId]
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

const upsertUrgeType = async (db, prefix, fileName) => {
  const normalizedPrefix = String(prefix || '').trim();
  if (!normalizedPrefix) return null;

  const fallbackName = compactText(String(fileName || '').replace(/^ÜRGE FİYAT\s+/i, '').replace(/\.xlsm?x?$/i, ''));
  const typeName = URGE_TYPE_NAMES[normalizedPrefix] || fallbackName || `Grup ${normalizedPrefix}`;

  await dbRun(
    db,
    `INSERT INTO mamul_turleri (ad, kod_prefix, aciklama, aktif)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(kod_prefix) DO UPDATE SET
       ad = excluded.ad,
       aciklama = excluded.aciklama,
       aktif = 1`,
    [typeName, normalizedPrefix, `Excel kaynakli urun grubu: ${fileName}`]
  );

  return dbGet(db, `SELECT id, kod_prefix FROM mamul_turleri WHERE kod_prefix = ?`, [normalizedPrefix]);
};

const upsertDefinition = async (db, tableName, uniqueColumn, payload) => {
  if (!payload?.[uniqueColumn]) return;
  const columns = Object.keys(payload);
  const placeholders = columns.map(() => '?').join(', ');
  const updateSql = columns
    .filter((column) => column !== uniqueColumn)
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');

  await dbRun(
    db,
    `INSERT INTO ${tableName} (${columns.join(', ')})
     VALUES (${placeholders})
     ON CONFLICT(${uniqueColumn}) DO UPDATE SET ${updateSql}`,
    columns.map((column) => payload[column])
  );
};

const parseUrgeYarns = (sheet, rowNumber) => {
  const yarns = [];
  const yarnColumns = ['F', 'G', 'H', 'I', 'J', 'K'];
  const ratioColumns = ['U', 'V', 'W', 'X', 'Y', 'Z'];
  const priceColumns = ['AA', 'AB', 'AC', 'AD', 'AE', 'AF'];

  yarnColumns.forEach((column, index) => {
    const yarnName = compactText(cellValue(sheet, `${column}${rowNumber}`));
    if (!yarnName) return;

    const ratio = cellNumber(sheet, `${ratioColumns[index]}${rowNumber}`, 0);
    const price = cellNumber(sheet, `${priceColumns[index]}${rowNumber}`, 0);
    const ratioPercent = ratio > 0 && ratio <= 1 ? ratio * 100 : ratio;
    const cost = Number(((ratioPercent / 100) * price).toFixed(4));

    yarns.push({
      iplikAdi: yarnName,
      oranYuzde: Number(ratioPercent.toFixed(4)),
      birimFiyat: price,
      maliyetTutari: cost,
      siraNo: index + 1
    });
  });

  return yarns;
};

const parseUrgeProcesses = (sheet, rowNumber) => {
  const processes = [];

  URGE_PROCESS_COLUMNS.forEach((column, index) => {
    const processName = compactText(cellValue(sheet, `${column}2`));
    if (!processName) return;

    const selectedValue = cellNumber(sheet, `${column}${rowNumber}`, 0);
    if (!selectedValue) return;

    const unitCost = cellNumber(sheet, `${column}1`, 0);
    const cost = Number((selectedValue * unitCost).toFixed(4));

    processes.push({
      prosesAdi: processName,
      prosesTipi: 'Excel',
      birimMaliyet: cost,
      renkBazli: 0,
      aciklama: `${column}${rowNumber}: ${selectedValue} x ${unitCost}`,
      siraNo: index + 1
    });
  });

  return processes;
};

const importUrgeWorkbook = async (db, configuredFile, workbook, sheetName) => {
  const sheet = workbook.Sheets?.[sheetName] || workbook.Sheets?.[workbook.SheetNames[0]];
  if (!sheet) return { importedRows: 0, skippedRows: 0, typePrefix: '' };

  const fileName = path.basename(configuredFile.filePath);
  const typePrefix = getFileTypePrefix(fileName);
  const typeInfo = await upsertUrgeType(db, typePrefix, fileName);
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const karYuzdesi = await loadKarYuzdesi(db);
  let imported = 0;
  let skipped = 0;
  const skippedDetails = [];

  const headerRowNumber = 2;
  const articleColumn = findHeaderColumn(sheet, headerRowNumber, ['article no', 'article_no', 'articleno', 'article']);
  const productColumn = findHeaderColumn(sheet, headerRowNumber, ['product', 'urun', 'urun_adi', 'mamul']);
  const colorColumn = findHeaderColumn(sheet, headerRowNumber, ['color', 'renk', 'renk_adi']);
  const compositionColumn = findHeaderColumn(sheet, headerRowNumber, ['kompozisyon', 'kompozisyon_ozeti', 'composition']);
  const dyeProcessColumn = findHeaderColumn(sheet, headerRowNumber, ['dye_process', 'boya_proses', 'boya_islemleri', 'proses']);
  const descriptionColumn = findHeaderColumn(sheet, headerRowNumber, ['description', 'aciklama', 'not']);
  const widthColumn = findHeaderColumn(sheet, headerRowNumber, ['width', 'en', 'cm']);
  const weightColumn = findHeaderColumn(sheet, headerRowNumber, ['weight', 'gramaj', 'gr_m2']);
  const yarnDescriptionColumn = findHeaderColumn(sheet, headerRowNumber, ['iplik_tanimi', 'iplik_tanimi', 'tanimi']);
  const hamCostColumn = findHeaderColumn(sheet, headerRowNumber, ['ham_maliyet', 'ham_kumas_maliyeti', 'ham fiyat', 'aj']);
  const processCostColumn = findHeaderColumn(sheet, headerRowNumber, ['proses_maliyeti', 'proses', 'an']);
  const mamulCostColumn = findHeaderColumn(sheet, headerRowNumber, ['mamul_maliyeti', 'mamul_kumas_maliyeti', 'am']);
  const fasonOrguColumn = findHeaderColumn(sheet, headerRowNumber, ['fason_orgu', 'orgu', 'ai']);

  if (process.env.DEBUG_EXCEL_IMPORT === '1') {
    console.log(`[excel-import] file=${fileName} headerRow=${headerRowNumber} articleColumn=${articleColumn || 'fallback(D)'} productColumn=${productColumn || 'fallback(N)'} articleHeader=${articleColumn || 'D'} productHeader=${productColumn || 'N'} range=${range.e.r + 1}`);
  }

  for (let rowNumber = 3; rowNumber <= range.e.r + 1; rowNumber += 1) {
    const rawArticleNo = compactText(cellValue(sheet, articleColumn ? `${articleColumn}${rowNumber}` : `D${rowNumber}`));
    const product = compactText(cellValue(sheet, productColumn ? `${productColumn}${rowNumber}` : `N${rowNumber}`));

    // Allow article values that contain prefixes/letters by extracting first continuous digit sequence
    const articleDigitsMatch = String(rawArticleNo || '').match(/\d+/);
    if (!articleDigitsMatch) {
      skipped += 1;
      skippedDetails.push({ row: rowNumber, reason: 'invalid_article_no', rawArticleNo, product });
      if (process.env.DEBUG_EXCEL_IMPORT === '1') {
        console.log(`[excel-import] skip row=${rowNumber} reason=invalid_article_no article=${JSON.stringify(rawArticleNo)} product=${JSON.stringify(product)} file=${fileName}`);
      }
      continue;
    }
    const rawArticleDigits = articleDigitsMatch[0];
    if (!product) {
      skipped += 1;
      skippedDetails.push({ row: rowNumber, reason: 'missing_product', rawArticleNo, product });
      if (process.env.DEBUG_EXCEL_IMPORT === '1') {
        console.log(`[excel-import] skip row=${rowNumber} reason=missing_product article=${JSON.stringify(rawArticleNo)} product=${JSON.stringify(product)} file=${fileName}`);
      }
      continue;
    }

    const articlePrefix = rawArticleDigits.slice(0, 2);
    const articleNo = typePrefix && articlePrefix !== typePrefix
      ? `${typePrefix}${rawArticleDigits.slice(typePrefix.length)}`
      : rawArticleDigits;

    const resolvedType = typeInfo || await upsertUrgeType(db, articleNo.slice(0, 2), fileName);
    if (!resolvedType) {
      skipped += 1;
      continue;
    }

    const color = compactText(cellValue(sheet, colorColumn ? `${colorColumn}${rowNumber}` : `E${rowNumber}`));
    const composition = compactText(cellValue(sheet, compositionColumn ? `${compositionColumn}${rowNumber}` : `AK${rowNumber}`));
    const dyeProcesses = compactText(cellValue(sheet, dyeProcessColumn ? `${dyeProcessColumn}${rowNumber}` : `AL${rowNumber}`));
    const description = compactText(cellValue(sheet, descriptionColumn ? `${descriptionColumn}${rowNumber}` : `BI${rowNumber}`));
    const width = compactText(cellValue(sheet, widthColumn ? `${widthColumn}${rowNumber}` : `R${rowNumber}`));
    const weight = compactText(cellValue(sheet, weightColumn ? `${weightColumn}${rowNumber}` : `Q${rowNumber}`));
    const yarnDescription = compactText(cellValue(sheet, yarnDescriptionColumn ? `${yarnDescriptionColumn}${rowNumber}` : `M${rowNumber}`));
    const hamMaliyet = cellNumber(sheet, hamCostColumn ? `${hamCostColumn}${rowNumber}` : `AJ${rowNumber}`, 0);
    const prosesMaliyeti = cellNumber(sheet, processCostColumn ? `${processCostColumn}${rowNumber}` : `AN${rowNumber}`, 0);
    const mamulMaliyeti = cellNumber(sheet, mamulCostColumn ? `${mamulCostColumn}${rowNumber}` : `AM${rowNumber}`, 0) || (hamMaliyet + prosesMaliyeti);
    const satisFiyati = mamulMaliyeti > 0 ? Number((mamulMaliyeti * (1 + karYuzdesi / 100)).toFixed(2)) : 0;
    const fasonOrgu = cellNumber(sheet, fasonOrguColumn ? `${fasonOrguColumn}${rowNumber}` : `AI${rowNumber}`, 0);
    const qrSlug = slugify(`${articleNo}-${product}-${color}`);
    const yarns = parseUrgeYarns(sheet, rowNumber);
    const processes = parseUrgeProcesses(sheet, rowNumber);
    const formulJson = safeJson({
      source: 'urge_fiyat_listesi',
      row: rowNumber,
      rawArticleNo,
      yarnDescription,
      dyeProcesses,
      fasonOrgu,
      hamKumasMaliyeti: hamMaliyet,
      prosesMaliyeti,
      mamulKumasMaliyeti: mamulMaliyeti,
      formulas: {
        hamKumasMaliyeti: sheet[`AJ${rowNumber}`]?.f || '',
        mamulKumasMaliyeti: sheet[`AM${rowNumber}`]?.f || ''
      }
    });

    if (color) {
      await upsertDefinition(db, 'renk_tanimlari', 'kod', {
        ad: color,
        kod: color,
        aktif: 1
      });
    }

    for (const yarn of yarns) {
      await upsertDefinition(db, 'iplik_tanimlari', 'ad', {
        ad: yarn.iplikAdi,
        kod: yarn.iplikAdi,
        birim: 'kg',
        birim_fiyat: yarn.birimFiyat,
        aktif: 1
      });
    }

    for (const process of processes) {
      await upsertDefinition(db, 'proses_tanimlari', 'ad', {
        ad: process.prosesAdi,
        tip: process.prosesTipi,
        birim_maliyet: process.birimMaliyet,
        renk_bazli: process.renkBazli,
        aktif: 1
      });
    }

    const existing = await dbGet(
      db,
      `SELECT id FROM mamul_kartlari WHERE article_code = ? OR article_no = ? LIMIT 1`,
      [articleNo, articleNo]
    );

    let mamulId = existing?.id;
    if (existing) {
      await dbRun(
        db,
        `UPDATE mamul_kartlari
         SET mamul_adi = ?, mamul_turu_id = ?, article_no = ?, article_code = ?, koleksiyon_adi = ?,
             yayin_durumu = ?, renk = ?, renk_kodu = ?, kompozisyon_ozeti = ?, en = ?, gramaj = ?,
             aciklama = ?, tanitim_basligi = ?, tanitim_hikayesi = ?, materyal_notlari = ?,
             gorsel_url = ?, vurgu_etiketi = ?, bir_kg_maliyet = ?, bir_kg_satis_fiyati = ?,
             qr_slug = ?, aktif = 1, excel_kaynak_dosyasi = ?, excel_satir_no = ?,
             excel_ham_maliyet = ?, excel_proses_maliyeti = ?, excel_mamul_maliyeti = ?,
             excel_formul_json = ?, excel_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          product,
          resolvedType.id,
          articleNo,
          articleNo,
          `Excel ${typePrefix || articlePrefix}`,
          'yayinda',
          color,
          color,
          composition,
          width,
          weight,
          description,
          product,
          dyeProcesses,
          yarnDescription,
          '',
          'Excel',
          mamulMaliyeti,
          satisFiyati,
          qrSlug,
          fileName,
          rowNumber,
          hamMaliyet,
          prosesMaliyeti,
          mamulMaliyeti,
          formulJson,
          mamulId
        ]
      );
    } else {
      const result = await dbRun(
        db,
        `INSERT INTO mamul_kartlari (
          mamul_adi, mamul_turu_id, article_no, article_code, koleksiyon_adi, yayin_durumu,
          renk, renk_kodu, kompozisyon_ozeti, en, gramaj, aciklama, tanitim_basligi,
          tanitim_hikayesi, materyal_notlari, gorsel_url, vurgu_etiketi, bir_kg_maliyet,
          bir_kg_satis_fiyati, qr_slug, aktif, excel_kaynak_dosyasi, excel_satir_no,
          excel_ham_maliyet, excel_proses_maliyeti, excel_mamul_maliyeti, excel_formul_json,
          excel_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          product,
          resolvedType.id,
          articleNo,
          articleNo,
          `Excel ${typePrefix || articlePrefix}`,
          'yayinda',
          color,
          color,
          composition,
          width,
          weight,
          description,
          product,
          dyeProcesses,
          yarnDescription,
          '',
          'Excel',
          mamulMaliyeti,
          satisFiyati,
          qrSlug,
          fileName,
          rowNumber,
          hamMaliyet,
          prosesMaliyeti,
          mamulMaliyeti,
          formulJson
        ]
      );
      mamulId = result.lastID;
    }

    await dbRun(db, `DELETE FROM mamul_iplik_detaylari WHERE mamul_id = ?`, [mamulId]);
    for (const yarn of yarns) {
      await dbRun(
        db,
        `INSERT INTO mamul_iplik_detaylari (mamul_id, iplik_adi, oran_yuzde, birim_fiyat, maliyet_tutari, sira_no)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [mamulId, yarn.iplikAdi, yarn.oranYuzde, yarn.birimFiyat, yarn.maliyetTutari, yarn.siraNo]
      );
    }

    await dbRun(db, `DELETE FROM mamul_proses_detaylari WHERE mamul_id = ?`, [mamulId]);
    for (const process of processes) {
      await dbRun(
        db,
        `INSERT INTO mamul_proses_detaylari (mamul_id, proses_adi, proses_tipi, renk_bazli, birim_maliyet, aciklama, sira_no)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [mamulId, process.prosesAdi, process.prosesTipi, process.renkBazli, process.birimMaliyet, process.aciklama, process.siraNo]
      );
    }

    imported += 1;
  }

  return { importedRows: imported, skippedRows: skipped, skippedDetails, typePrefix };
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
    lastSeenBySource: {},
    lastFingerprintBySource: {}
  };

  let timer = null;
  let watcher = null;

  const processConfiguredSources = async () => {
    const sources = await loadSources(db);
    let importedRows = 0;
    const previews = [];

    for (const source of sources) {
      if (source.sourceType === 'urge_fiyat_listesi') continue;

      const configuredFile = findConfiguredFile(directory, source.fileName, source.extension);
      if (!configuredFile) continue;

      const stat = fs.statSync(configuredFile.filePath);
      const sourceKey = `source:${source.id}`;
      const alreadySeen = state.lastSeenBySource[sourceKey];
      const previousFingerprint = state.lastFingerprintBySource[sourceKey];
      const fingerprint = await getFileFingerprint(configuredFile.filePath);
      const changed = !alreadySeen || alreadySeen.filePath !== configuredFile.filePath || !previousFingerprint || fingerprint?.sha256 !== previousFingerprint?.sha256;

      if (!changed) {
        continue;
      }

      const workbook = XLSX.readFile(configuredFile.filePath, { cellDates: true, cellFormula: true });
      const targetSheet = source.sheetName && workbook.SheetNames.includes(source.sheetName)
        ? source.sheetName
        : workbook.SheetNames[0];
      const sheet = workbook.Sheets?.[targetSheet];
      if (!sheet) continue;

      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const importer = importers[source.sourceType];

      let result = { importedRows: 0 };
      let error = null;

      if (importer) {
        try {
          result = await importer(db, rows);
        } catch (err) {
          error = err?.message || String(err);
        }
      }

      importedRows += result.importedRows || 0;
      const preview = {
        sourceType: source.sourceType,
        fileName: configuredFile.fileName,
        sheetName: targetSheet,
        importedRows: result.importedRows || 0
      };
      if (error) preview.error = error;
      previews.push(preview);

      await insertSnapshot(db, {
        filePath: configuredFile.filePath,
        fileMtimeMs: stat.mtimeMs || 0,
        fileSize: stat.size || 0,
        sourceType: source.sourceType,
        sourceId: source.id,
        status: error ? 'error' : 'imported',
        importedRows: result.importedRows || 0,
        message: error || `${configuredFile.fileName} icin ${source.sourceType} import tamamlandi`,
        summary: parseWorkbookSummary(workbook),
        preview
      });

      state.lastSeenBySource[sourceKey] = {
        filePath: configuredFile.filePath,
        mtimeMs: stat.mtimeMs || 0
      };
      state.lastFingerprintBySource[sourceKey] = fingerprint;
    }

    return { importedRows, files: previews };
  };

  const processUrgeDirectory = async () => {
    const entries = fs.readdirSync(directory)
      .filter((fileName) => isExcelFile(fileName))
      .sort((left, right) => left.localeCompare(right, 'tr'));

    let importedRows = 0;
    let skippedRows = 0;
    const previews = [];

    for (const fileName of entries) {
      const filePath = path.join(directory, fileName);
      const stat = fs.statSync(filePath);
      const sourceKey = `urge:${fileName}`;
      const alreadySeen = state.lastSeenBySource[sourceKey];
      const previousFingerprint = state.lastFingerprintBySource[sourceKey];
      const fingerprint = await getFileFingerprint(filePath);
      const changed = !alreadySeen || alreadySeen.filePath !== filePath || !previousFingerprint || fingerprint?.sha256 !== previousFingerprint?.sha256;

      if (!changed) {
        continue;
      }

      const workbook = XLSX.readFile(filePath, { cellDates: true, cellFormula: true });
      const targetSheet = workbook.SheetNames.includes('SIRA LİSTESİ')
        ? 'SIRA LİSTESİ'
        : workbook.SheetNames[0];

      const result = await importUrgeWorkbook(
        db,
        {
          filePath,
          fileName,
          mtimeMs: stat.mtimeMs || 0,
          size: stat.size || 0
        },
        workbook,
        targetSheet
      );

      importedRows += result.importedRows || 0;
      skippedRows += result.skippedRows || 0;
      previews.push({
        fileName,
        sheetName: targetSheet,
        importedRows: result.importedRows || 0,
        skippedRows: result.skippedRows || 0,
        skippedDetails: result.skippedDetails || [],
        typePrefix: result.typePrefix || ''
      });

      await insertSnapshot(db, {
        filePath,
        fileMtimeMs: stat.mtimeMs || 0,
        fileSize: stat.size || 0,
        sourceType: 'urge_fiyat_listesi',
        sourceId: null,
        status: 'imported',
        importedRows: result.importedRows || 0,
        message: `${fileName} icin URGE fiyat listesi import tamamlandi`,
        summary: parseWorkbookSummary(workbook),
        preview: previews[previews.length - 1]
      });

      state.lastSeenBySource[sourceKey] = {
        filePath,
        mtimeMs: stat.mtimeMs || 0
      };
      state.lastFingerprintBySource[sourceKey] = fingerprint;
    }

    return { importedRows, skippedRows, files: previews };
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
      state.sources = [];

      const urgeResult = await processUrgeDirectory();
      state.urgeLastResult = urgeResult;

      const sourcesResult = await processConfiguredSources();
      state.sources = sourcesResult.files || [];

      state.lastError = null;
    } catch (err) {
      state.lastError = err?.message || String(err);
    } finally {
      state.running = false;
      scheduleNext();
    }
  };

  runOnce();

  // Start a filesystem watcher to trigger immediate sync when Excel files change.
  const startWatcher = () => {
    try {
      if (watcher) return;
      watcher = fs.watch(directory, { persistent: false }, (eventType, filename) => {
        if (!filename) return;
        if (!isExcelFile(filename)) return;
        if (state._watchDebounce) clearTimeout(state._watchDebounce);
        state._watchDebounce = setTimeout(() => {
          runOnce();
        }, 500);
      });
    } catch (err) {
      // non-fatal: if watcher can't be created, rely on polling
    }
  };

  // ensure directory exists then start watcher
  try {
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
    startWatcher();
  } catch (e) {
    // ignore
  }

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
        urgeLastResult: state.urgeLastResult || null,
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
    stop: () => {
      clearTimeout(timer);
      if (watcher) {
        try { watcher.close(); } catch (e) {}
        watcher = null;
      }
      if (state._watchDebounce) {
        clearTimeout(state._watchDebounce);
        state._watchDebounce = null;
      }
    }
  };
};

module.exports = {
  startExcelSync,
  SOURCE_ORDER,
  getFileFingerprint,
  hasFileChanged,
  findHeaderColumn,
  importUrgeWorkbook
};
