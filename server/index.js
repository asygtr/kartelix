require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const { startExcelSync, SOURCE_ORDER } = require('./excelSync');
const createAuthRouter = require('./routes/auth');
const { createSettingsRouter } = require('./routes/settings');
const { createReferenceDataRouter } = require('./routes/referenceData');
const { createMamullerRouter } = require('./routes/mamuller');
const { createOrdersRouter } = require('./routes/orders');
const { createLabelingRouter } = require('./routes/labeling');
const { createCatalogRouter } = require('./routes/catalog');
const { createAdminRouter } = require('./routes/admin');

const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const BCRYPT_ROUNDS = 12;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN;

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json());

// Veritabanı bağlantısı
const databaseDir = path.join(__dirname, '..', 'database');
const databasePath = path.join(databaseDir, 'showroom.db');
const backupDir = path.join(databaseDir, 'backups');
const buildDir = path.join(__dirname, '..', 'build');

if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

try {
  fs.chmodSync(databaseDir, 0o777);
} catch (err) {
  console.warn('Unable to adjust database directory permissions:', err.message);
}

if (fs.existsSync(databasePath)) {
  try {
    fs.chmodSync(databasePath, 0o666);
  } catch (err) {
    console.warn('Unable to adjust database file permissions:', err.message);
  }
}

const db = new sqlite3.Database(
  databasePath,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error('SQLite open failed:', databasePath, err);
      process.exit(1);
    }
  }
);

const excelInboxDir = process.env.EXCEL_INBOX_DIR || path.join(__dirname, '..', 'xls');
const excelPollMs = Number(process.env.EXCEL_POLL_MS || 60_000);
const excelPreviewLimit = Number(process.env.EXCEL_PREVIEW_LIMIT || 50);
const excelSync = startExcelSync({
  db,
  directory: excelInboxDir,
  defaultIntervalMs: excelPollMs,
  previewLimit: excelPreviewLimit
});

app.use('/api', createAuthRouter({ db, bcrypt, jwt, jwtSecret: JWT_SECRET }));
app.use('/api', createSettingsRouter({ db, jwt, jwtSecret: JWT_SECRET, nodemailer }));
app.use('/api', createReferenceDataRouter({ db, jwt, jwtSecret: JWT_SECRET }));
app.use('/api', createMamullerRouter({ db, jwt, jwtSecret: JWT_SECRET }));
app.use('/api', createOrdersRouter({ db, jwt, jwtSecret: JWT_SECRET, nodemailer }));
app.use('/api', createLabelingRouter({ db, jwt, jwtSecret: JWT_SECRET, excelSync }));
app.use('/api', createCatalogRouter({ db, jwt, jwtSecret: JWT_SECRET }));
app.use('/api', createAdminRouter({ db, jwt, jwtSecret: JWT_SECRET }));

// Veritabanı tablolarını başlat
const initDatabase = () => {
  db.serialize(() => {
    // Siparişler tablosu (yeni yapı)
    db.run(`CREATE TABLE IF NOT EXISTS siparisler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      musteri_adi TEXT NOT NULL,
      ilgili_kisi TEXT,
      telefon TEXT,
      aciklama TEXT,
      durum TEXT DEFAULT 'bekliyor',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Sipariş kartelaları tablosu
    db.run(`CREATE TABLE IF NOT EXISTS siparis_kartelalari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      siparis_id INTEGER,
      kartela_kodu TEXT NOT NULL,
      mamul_adi TEXT,
      article_no TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (siparis_id) REFERENCES siparisler(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS siparis_kalemleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      siparis_id INTEGER NOT NULL,
      mamul_id INTEGER,
      mamul_adi TEXT NOT NULL,
      article_no TEXT NOT NULL,
      article_code TEXT NOT NULL,
      renk TEXT,
      miktar_kg REAL DEFAULT 0,
      birim_fiyat REAL DEFAULT 0,
      tutar REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (siparis_id) REFERENCES siparisler(id),
      FOREIGN KEY (mamul_id) REFERENCES mamul_kartlari(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS kartelix_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      musteri_adi TEXT,
      firma_adi TEXT,
      ilgili_kisi TEXT,
      telefon TEXT,
      email TEXT,
      fuar_adi TEXT,
      aciklama TEXT,
      kartvizit_gorsel TEXT,
      kartvizit_notu TEXT,
      kartvizit_ocr_firma TEXT,
      kartvizit_ocr_kisi TEXT,
      kartvizit_ocr_telefon TEXT,
      kartvizit_ocr_email TEXT,
      kartvizit_ocr_durumu TEXT DEFAULT 'bekleniyor',
      durum TEXT DEFAULT 'kaydedildi',
      personel_username TEXT,
      toplam_tutar REAL DEFAULT 0,
      para_birimi TEXT DEFAULT 'TRY',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS kartelix_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      siparis_id INTEGER NOT NULL,
      mamul_id INTEGER,
      mamul_adi TEXT NOT NULL,
      article_no TEXT NOT NULL,
      article_code TEXT NOT NULL,
      renk TEXT,
      miktar_kg REAL DEFAULT 0,
      birim_fiyat REAL DEFAULT 0,
      tutar REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (siparis_id) REFERENCES kartelix_orders(id),
      FOREIGN KEY (mamul_id) REFERENCES mamul_kartlari(id)
    )`);

    // Etiket ayarları tablosu
    db.run(`CREATE TABLE IF NOT EXISTS etiket_ayarlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alan_adi TEXT UNIQUE NOT NULL,
      sira_no INTEGER NOT NULL,
      aktif BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Prefix ayarları tablosu
    db.run(`CREATE TABLE IF NOT EXISTS prefix_ayarlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prefix TEXT UNIQUE NOT NULL,
      aciklama TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS firmalar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT UNIQUE NOT NULL,
      telefon TEXT,
      adres TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS kullanicilar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      password_length INTEGER DEFAULT 4,
      yetki TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS kartelalar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kod TEXT UNIQUE NOT NULL,
      mamul_adi TEXT NOT NULL,
      tip TEXT,
      kompozisyon TEXT,
      en TEXT,
      gramaj TEXT,
      article_no TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mamul_turleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT UNIQUE NOT NULL,
      kod_prefix TEXT UNIQUE NOT NULL,
      aciklama TEXT,
      aktif BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mamul_kartlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mamul_adi TEXT NOT NULL,
      mamul_turu_id INTEGER NOT NULL,
      article_no TEXT UNIQUE NOT NULL,
      article_code TEXT UNIQUE NOT NULL,
      koleksiyon_adi TEXT,
      yayin_durumu TEXT DEFAULT 'taslak',
      renk TEXT,
      renk_kodu TEXT,
      kompozisyon_ozeti TEXT,
      en TEXT,
      gramaj TEXT,
      aciklama TEXT,
      bir_kg_maliyet REAL DEFAULT 0,
      bir_kg_satis_fiyati REAL DEFAULT 0,
      qr_slug TEXT UNIQUE NOT NULL,
      aktif BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mamul_turu_id) REFERENCES mamul_turleri(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mamul_iplik_detaylari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mamul_id INTEGER NOT NULL,
      iplik_adi TEXT NOT NULL,
      oran_yuzde REAL NOT NULL,
      birim_fiyat REAL DEFAULT 0,
      maliyet_tutari REAL DEFAULT 0,
      sira_no INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mamul_id) REFERENCES mamul_kartlari(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mamul_proses_detaylari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mamul_id INTEGER NOT NULL,
      proses_adi TEXT NOT NULL,
      proses_tipi TEXT,
      renk_bazli BOOLEAN DEFAULT 0,
      birim_maliyet REAL DEFAULT 0,
      aciklama TEXT,
      sira_no INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mamul_id) REFERENCES mamul_kartlari(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mamul_varyantlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mamul_id INTEGER NOT NULL,
      varyant_tipi TEXT NOT NULL,
      varyant_adi TEXT NOT NULL,
      varyant_kodu TEXT,
      fark_gramaj TEXT,
      fark_en TEXT,
      ek_fiyat REAL DEFAULT 0,
      aktif BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mamul_id) REFERENCES mamul_kartlari(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mamul_analitikleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mamul_id INTEGER NOT NULL,
      olay_tipi TEXT NOT NULL,
      olay_kaynagi TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mamul_id) REFERENCES mamul_kartlari(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS renk_tanimlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT UNIQUE NOT NULL,
      kod TEXT UNIQUE NOT NULL,
      aktif BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS iplik_tanimlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT UNIQUE NOT NULL,
      kod TEXT UNIQUE,
      birim TEXT DEFAULT 'kg',
      birim_fiyat REAL DEFAULT 0,
      aktif BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS proses_tanimlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT UNIQUE NOT NULL,
      tip TEXT,
      birim_maliyet REAL DEFAULT 0,
      renk_bazli BOOLEAN DEFAULT 0,
      aktif BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

db.run(`CREATE TABLE IF NOT EXISTS ui_ayarlari (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       anahtar TEXT UNIQUE NOT NULL,
       deger TEXT,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
     )`);

    db.run(`CREATE TABLE IF NOT EXISTS label_templates (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       template_id TEXT UNIQUE NOT NULL,
       name TEXT NOT NULL,
       template_json TEXT NOT NULL,
       is_active INTEGER DEFAULT 0,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
     )`);

    db.run(`CREATE TABLE IF NOT EXISTS excel_kaynaklari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kaynak_tipi TEXT NOT NULL UNIQUE,
      dosya_adi TEXT NOT NULL,
      uzanti TEXT NOT NULL DEFAULT '.xlsx',
      sheet_adi TEXT,
      aktif BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS excel_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      file_mtime_ms INTEGER NOT NULL,
      file_size INTEGER DEFAULT 0,
      summary_json TEXT,
      preview_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  // Varsayılan etiket ayarlarını ekle
  const defaultEtiketAyarlari = [
    { alan_adi: 'ARTICLE NR', sira_no: 1, aktif: 1 },
    { alan_adi: 'PRODUCT', sira_no: 2, aktif: 1 },
    { alan_adi: 'COMPOSITION', sira_no: 3, aktif: 1 },
    { alan_adi: 'WEIGHT', sira_no: 4, aktif: 0 },
    { alan_adi: 'WIDTH', sira_no: 5, aktif: 0 },
    { alan_adi: '1 KG FABRIC METER', sira_no: 6, aktif: 0 }
  ];

    defaultEtiketAyarlari.forEach(ayar => {
      db.run(
        `INSERT OR IGNORE INTO etiket_ayarlari (alan_adi, sira_no, aktif) VALUES (?, ?, ?)`,
        [ayar.alan_adi, ayar.sira_no, ayar.aktif]
      );
    });

  // Varsayılan prefix ayarlarını ekle
  const defaultPrefixler = [
    { prefix: 'PRD', aciklama: 'Standart Ürün' },
    { prefix: 'SMP', aciklama: 'Numune' },
    { prefix: 'SPR', aciklama: 'Özel Üretim' }
  ];

    defaultPrefixler.forEach(prefix => {
      db.run(
        `INSERT OR IGNORE INTO prefix_ayarlari (prefix, aciklama) VALUES (?, ?)`,
        [prefix.prefix, prefix.aciklama]
      );
    });

    db.run(`DELETE FROM kullanicilar WHERE username NOT IN ('yonetici', 'satici', 'mamul')`);
    db.run(`DELETE FROM kullanicilar WHERE yetki NOT IN ('admin', 'staff', 'mamul')`);

    // Varsayılan kullanıcıları sadece yoksa oluştur (şifrelerini ASLA sıfırlama)
    const defaultUsers = [
      { username: 'yonetici', password: '1234', yetki: 'admin' },
      { username: 'satici',   password: '1234', yetki: 'staff' },
      { username: 'mamul',    password: '1234', yetki: 'mamul' }
    ];

    defaultUsers.forEach(({ username, password, yetki }) => {
      db.get(`SELECT id, password FROM kullanicilar WHERE username = ?`, [username], async (err, row) => {
        if (err) return;
        if (!row) {
          // Kullanici yok — olustur
          const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
          db.run(
            `INSERT OR IGNORE INTO kullanicilar (username, password, yetki, password_length) VALUES (?, ?, ?, ?)`,
            [username, hash, yetki, password.length]
          );
        } else if (!row.password.startsWith('$2')) {
          // Sifre duz metin — hash'le
          const hash = await bcrypt.hash(row.password, BCRYPT_ROUNDS);
          db.run(
            `UPDATE kullanicilar SET password = ?, password_length = ? WHERE username = ?`,
            [hash, row.password.length, username]
          );
        }
      });
    });

  const defaultMamulTurleri = [
    { ad: 'Suprem', kod_prefix: '10', aciklama: 'Örnek varsayılan mamul türü' },
    { ad: '2 İplik', kod_prefix: '20', aciklama: 'Örnek varsayılan mamul türü' },
    { ad: '3 İplik', kod_prefix: '30', aciklama: 'Örnek varsayılan mamul türü' }
  ];

    defaultMamulTurleri.forEach((tur) => {
      db.run(
        `INSERT OR IGNORE INTO mamul_turleri (ad, kod_prefix, aciklama) VALUES (?, ?, ?)`,
        [tur.ad, tur.kod_prefix, tur.aciklama]
      );
    });

    const defaultRenkler = [
      { ad: 'Ham', kod: 'HM-00' },
      { ad: 'Ekru', kod: 'EKR-01' },
      { ad: 'Antrasit', kod: 'ANT-01' },
      { ad: 'Indigo', kod: 'IND-07' },
      { ad: 'Tas', kod: 'TAS-12' },
      { ad: 'Siyah', kod: 'SYH-99' }
    ];

    defaultRenkler.forEach((renk) => {
      db.run(
        `INSERT OR IGNORE INTO renk_tanimlari (ad, kod) VALUES (?, ?)`,
        [renk.ad, renk.kod]
      );
    });

    const defaultIplikler = [
      { ad: 'Pamuk 30/1', kod: 'PMK-301', birim_fiyat: 5.5 },
      { ad: 'Polyester', kod: 'POL-001', birim_fiyat: 4.25 },
      { ad: 'Viskon', kod: 'VIS-001', birim_fiyat: 6.1 },
      { ad: 'Elastan', kod: 'ELS-001', birim_fiyat: 8.2 },
      { ad: 'Organik Pamuk 24/1', kod: 'OPM-241', birim_fiyat: 6.85 }
    ];

    defaultIplikler.forEach((iplik) => {
      db.run(
        `INSERT OR IGNORE INTO iplik_tanimlari (ad, kod, birim_fiyat) VALUES (?, ?, ?)`,
        [iplik.ad, iplik.kod, iplik.birim_fiyat]
      );
    });

    const defaultProsesler = [
      { ad: 'Boyama', tip: 'Renk', birim_maliyet: 1.4, renk_bazli: 1 },
      { ad: 'Sanfor', tip: 'Finisaj', birim_maliyet: 0.8, renk_bazli: 0 },
      { ad: 'Compact', tip: 'Finisaj', birim_maliyet: 0.65, renk_bazli: 0 },
      { ad: 'Enzim Yikama', tip: 'Yikama', birim_maliyet: 1.1, renk_bazli: 0 },
      { ad: 'Soft Touch', tip: 'Apre', birim_maliyet: 0.55, renk_bazli: 0 }
    ];

    defaultProsesler.forEach((proses) => {
      db.run(
        `INSERT OR IGNORE INTO proses_tanimlari (ad, tip, birim_maliyet, renk_bazli) VALUES (?, ?, ?, ?)`,
        [proses.ad, proses.tip, proses.birim_maliyet, proses.renk_bazli]
      );
    });

    db.run(
      `INSERT OR IGNORE INTO ui_ayarlari (anahtar, deger) VALUES (?, ?)`,
      ['active_palette', 'atelier']
    );

    db.run(
      `INSERT OR IGNORE INTO ui_ayarlari (anahtar, deger) VALUES (?, ?)`,
      ['app_logo', '/nevres.png']
    );

    db.run(
      `INSERT OR IGNORE INTO ui_ayarlari (anahtar, deger) VALUES (?, ?)`,
      ['app_background', '/showroom-bg.png']
);

    // Mock/demo veriler kaldırıldı - sadece Excel'den gelen veriler kullanılacak

    ensureColumnExists('siparisler', 'created_at', `DATETIME DEFAULT CURRENT_TIMESTAMP`);
    ensureColumnExists('siparisler', 'firma_adi', `TEXT`);
    ensureColumnExists('siparisler', 'fuar_adi', `TEXT`);
    ensureColumnExists('siparisler', 'personel_username', `TEXT`);
    ensureColumnExists('siparisler', 'toplam_tutar', `REAL DEFAULT 0`);
    ensureColumnExists('siparisler', 'para_birimi', `TEXT DEFAULT 'TRY'`);
    ensureColumnExists('siparis_kartelalari', 'created_at', `DATETIME DEFAULT CURRENT_TIMESTAMP`);
    ensureColumnExists('siparis_kalemleri', 'created_at', `DATETIME DEFAULT CURRENT_TIMESTAMP`);
    ensureColumnExists('kartelix_orders', 'created_at', `DATETIME DEFAULT CURRENT_TIMESTAMP`);
    ensureColumnExists('kartelix_orders', 'onay_email', `TEXT`);
    ensureColumnExists('kartelix_orders', 'tamamlandi_at', `DATETIME`);
    ensureColumnExists('kartelix_orders', 'email', `TEXT`);
    ensureColumnExists('kartelix_orders', 'kartvizit_gorsel', `TEXT`);
    ensureColumnExists('kartelix_orders', 'kartvizit_notu', `TEXT`);
    ensureColumnExists('kartelix_orders', 'kartvizit_ocr_firma', `TEXT`);
    ensureColumnExists('kartelix_orders', 'kartvizit_ocr_kisi', `TEXT`);
    ensureColumnExists('kartelix_orders', 'kartvizit_ocr_telefon', `TEXT`);
    ensureColumnExists('kartelix_orders', 'kartvizit_ocr_email', `TEXT`);
    ensureColumnExists('kartelix_orders', 'kartvizit_ocr_durumu', `TEXT DEFAULT 'bekleniyor'`);
    ensureColumnExists('kartelix_order_items', 'created_at', `DATETIME DEFAULT CURRENT_TIMESTAMP`);
    ensureColumnExists('kartelalar', 'created_at', `DATETIME DEFAULT CURRENT_TIMESTAMP`);
    ensureColumnExists('mamul_kartlari', 'tanitim_basligi', `TEXT`);
    ensureColumnExists('mamul_kartlari', 'tanitim_hikayesi', `TEXT`);
    ensureColumnExists('mamul_kartlari', 'materyal_notlari', `TEXT`);
    ensureColumnExists('mamul_kartlari', 'gorsel_url', `TEXT`);
    ensureColumnExists('mamul_kartlari', 'vurgu_etiketi', `TEXT`);
    ensureColumnExists('mamul_kartlari', 'koleksiyon_adi', `TEXT`);
    ensureColumnExists('mamul_kartlari', 'yayin_durumu', `TEXT DEFAULT 'taslak'`);
    ensureColumnExists('mamul_kartlari', 'bakim_talimatlari', `TEXT`);
    ensureColumnExists('mamul_kartlari', 'para_birimi', `TEXT DEFAULT 'TRY'`);

    ensureColumnExists('kullanicilar', 'password_length', 'INTEGER DEFAULT 4');
  });
};

// Veritabanı başlatma
initDatabase();

// --- AUTH MIDDLEWARE ---

const requireAuth = (roles = []) => (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'Kimlik doğrulaması gereklidir' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    if (roles.length && !roles.includes(payload.yetki) && payload.yetki !== 'admin') {
      return res.status(403).json({ success: false, error: 'Yetkisiz erişim' });
    }
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Geçersiz veya süresi dolmuş oturum' });
  }
};

// --- YARDIMCI FONKSİYONLAR ---

const secureLikeParam = (term) => {
  return `%${String(term || '').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
};

const isValidArticleNo = (value) => /^\d{5}$/.test(String(value || ''));

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

const mapSiparisSummary = (row) => ({
  ...row,
  toplam_tutar: Number(row.toplam_tutar || 0),
  kalem_sayisi: Number(row.kalem_sayisi || 0)
});

const mapSiparisKalemi = (row) => ({
  ...row,
  miktar_kg: Number(row.miktar_kg || 0),
  birim_fiyat: Number(row.birim_fiyat || 0),
  tutar: Number(row.tutar || 0)
});

const defaultOrderEmailSettings = {
  enabled: false,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpSecure: false,
  senderName: 'Kartelix Siparis',
  senderEmail: '',
  smtpUser: '',
  smtpPassword: '',
  recipientEmails: '',
  approvalEmails: '',
  approvalShowPrices: true,
  testRecipient: '',
  replyTo: '',
  lastAuthError: ''
};

const dbGetAsync = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
});

const dbAllAsync = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
});

const dbRunAsync = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const parseJsonValue = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const parseEmailList = (value) =>
  String(value || '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const isFiniteTimestamp = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

const sanitizeOrderEmailSettings = (settings) => ({
  ...settings,
  enabled: Boolean(settings.enabled),
  smtpHost: String(settings.smtpHost || defaultOrderEmailSettings.smtpHost).trim(),
  smtpPort: Number(settings.smtpPort || defaultOrderEmailSettings.smtpPort),
  smtpSecure: Boolean(settings.smtpSecure),
  senderName: String(settings.senderName || defaultOrderEmailSettings.senderName).trim(),
  senderEmail: String(settings.senderEmail || '').trim(),
  smtpUser: String(settings.smtpUser || '').trim(),
  smtpPassword: '',
  recipientEmails: String(settings.recipientEmails || '').trim(),
  approvalEmails: String(settings.approvalEmails || '').trim(),
  approvalShowPrices: settings.approvalShowPrices !== undefined ? Boolean(settings.approvalShowPrices) : true,
  testRecipient: String(settings.testRecipient || '').trim(),
  replyTo: String(settings.replyTo || '').trim(),
  lastAuthError: String(settings.lastAuthError || '').trim()
});

const classifyEmailError = (err) => {
  const code = String(err?.code || '').toUpperCase();
  const responseCode = Number(err?.responseCode || 0);
  const responseText = String(err?.response || err?.body || err?.message || '').trim();

  if (code === 'EAUTH' || responseCode === 401 || responseCode === 403 || responseCode === 535 || responseCode === 534 || responseText.toLowerCase().includes('app password') || responseText.toLowerCase().includes('username and password not accepted')) {
    return { status: 401, message: 'Gmail kimlik doğrulaması başarısız. Uygulama parolası veya kullanıcı bilgileri kontrol edilmeli.', code: code || 'AUTH' };
  }

  if (code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ECONNREFUSED') {
    return { status: 502, message: 'Gmail SMTP sunucusuna bağlanılamadı. Host veya port kontrol edilmeli.', code: code || 'NETWORK' };
  }

  return {
    status: responseCode >= 400 ? 502 : 500,
    message: responseText || err?.message || 'Gmail SMTP işlemi başarısız oldu',
    code: code || `HTTP_${responseCode || 500}`
  };
};

async function loadOrderEmailSettings(includeSecrets = false) {
  const row = await dbGetAsync(`SELECT deger FROM ui_ayarlari WHERE anahtar = 'order_email_settings'`, []);
  const parsed = parseJsonValue(row?.deger, {});
  const merged = {
    enabled: Boolean(parsed.enabled),
    smtpHost: String(parsed.smtpHost || defaultOrderEmailSettings.smtpHost).trim() || defaultOrderEmailSettings.smtpHost,
    smtpPort: Number(parsed.smtpPort || defaultOrderEmailSettings.smtpPort),
    smtpSecure: Boolean(parsed.smtpSecure),
    senderName: String(parsed.senderName || defaultOrderEmailSettings.senderName).trim(),
    senderEmail: String(parsed.senderEmail || '').trim(),
    smtpUser: String(parsed.smtpUser || '').trim(),
    smtpPassword: String(parsed.smtpPassword || '').trim(),
    recipientEmails: String(parsed.recipientEmails || '').trim(),
    approvalEmails: String(parsed.approvalEmails || '').trim(),
    approvalShowPrices: parsed.approvalShowPrices !== undefined ? Boolean(parsed.approvalShowPrices) : true,
    testRecipient: String(parsed.testRecipient || '').trim(),
    replyTo: String(parsed.replyTo || '').trim(),
    lastAuthError: String(parsed.lastAuthError || '').trim()
  };

  return includeSecrets ? merged : sanitizeOrderEmailSettings(merged);
}

async function saveOrderEmailSettings(incomingSettings) {
  const existing = await loadOrderEmailSettings(true);
  const next = {
    enabled: Boolean(incomingSettings.enabled),
    smtpHost: String(incomingSettings.smtpHost || existing.smtpHost || defaultOrderEmailSettings.smtpHost).trim() || defaultOrderEmailSettings.smtpHost,
    smtpPort: Number(incomingSettings.smtpPort || existing.smtpPort || defaultOrderEmailSettings.smtpPort),
    smtpSecure: Boolean(incomingSettings.smtpSecure),
    senderName: String(incomingSettings.senderName || existing.senderName || defaultOrderEmailSettings.senderName).trim(),
    senderEmail: String(incomingSettings.senderEmail || existing.senderEmail || '').trim(),
    smtpUser: String(incomingSettings.smtpUser || existing.smtpUser || '').trim(),
    smtpPassword: String(incomingSettings.smtpPassword || existing.smtpPassword || '').trim(),
    recipientEmails: String(incomingSettings.recipientEmails || existing.recipientEmails || '').trim(),
    approvalEmails: String(incomingSettings.approvalEmails !== undefined ? incomingSettings.approvalEmails : (existing.approvalEmails || '')).trim(),
    approvalShowPrices: incomingSettings.approvalShowPrices !== undefined ? Boolean(incomingSettings.approvalShowPrices) : (existing.approvalShowPrices !== undefined ? Boolean(existing.approvalShowPrices) : true),
    testRecipient: String(incomingSettings.testRecipient || existing.testRecipient || '').trim(),
    replyTo: String(incomingSettings.replyTo || existing.replyTo || '').trim(),
    lastAuthError: ''
  };

  await dbRunAsync(
    `INSERT INTO ui_ayarlari (anahtar, deger)
     VALUES ('order_email_settings', ?)
     ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger, updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(next)]
  );

  return sanitizeOrderEmailSettings(next);
}

const resolveOrderEmailSender = (settings) =>
  String(settings.senderEmail || settings.smtpUser || '').trim();

function createOrderEmailTransport(settings) {
  const host = String(settings.smtpHost || 'smtp.gmail.com').trim() || 'smtp.gmail.com';
  const port = Number(settings.smtpPort || 587);
  const secure = Boolean(settings.smtpSecure);
  const user = String(settings.smtpUser || settings.senderEmail || '').trim();
  const pass = String(settings.smtpPassword || '').trim();

  if (!user) {
    const error = new Error('SMTP kullanıcı veya gönderici e-posta boş');
    error.code = 'ESETTINGS';
    error.responseCode = 400;
    throw error;
  }
  if (!pass) {
    const error = new Error('SMTP parola / uygulama parolası boş');
    error.code = 'ESETTINGS';
    error.responseCode = 400;
    throw error;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    requireTLS: !secure && port === 587,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

function buildApprovalEmailContent(order, items = [], showPrices = true) {
  const siparisNo = `#${order.id}`;
  const firma = order.firma_adi || order.musteri_adi || '-';
  const colSpan = showPrices ? 5 : 4;
  const itemRows = items.length
    ? items.map((item) => [
        '<tr>',
        `<td style="padding:8px;border-bottom:1px solid #e8e0d4">${item.article_code || item.article_no || '-'}</td>`,
        `<td style="padding:8px;border-bottom:1px solid #e8e0d4">${item.mamul_adi || '-'}</td>`,
        `<td style="padding:8px;border-bottom:1px solid #e8e0d4">${item.renk || '-'}</td>`,
        `<td style="padding:8px;border-bottom:1px solid #e8e0d4;text-align:right">${Number(item.miktar_kg || 0).toFixed(2)} kg</td>`,
        showPrices ? `<td style="padding:8px;border-bottom:1px solid #e8e0d4;text-align:right">${Number(item.tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}</td>` : '',
        '</tr>'
      ].join('')).join('')
    : `<tr><td colspan="${colSpan}" style="padding:8px;color:#888">-</td></tr>`;

  const priceTh = showPrices ? '<th align="right" style="padding:8px">Tutar</th>' : '';
  const totalRow = showPrices
    ? `<tr><td style="padding:4px 0;color:#666">Toplam Tutar</td><td style="padding:4px 0;font-weight:700;font-size:15px">${Number(order.toplam_tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}</td></tr>`
    : '';

  const html = [
    '<div style="font-family:Arial,sans-serif;color:#1a2024;line-height:1.6;max-width:640px">',
    '<div style="background:#1a2024;padding:24px 32px;border-radius:8px 8px 0 0">',
    '<div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:0.04em">SİPARİŞ ONAYLANDI</div>',
    `<div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:4px">Sipariş ${siparisNo} – ${firma}</div>`,
    '</div>',
    '<div style="background:#faf8f5;padding:24px 32px;border:1px solid #e8e0d4;border-top:none">',
    '<p style="margin:0 0 16px">Sayın İlgili,</p>',
    `<p style="margin:0 0 16px"><strong>${firma}</strong> firmasına ait <strong>${siparisNo}</strong> numaralı sipariş tarafımızca incelenmiş ve <strong>onaylanmıştır</strong>. Siparişin üretim sürecine alınması için bilgilerinizi paylaşıyoruz.</p>`,
    '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">',
    `<thead><tr style="background:#ede8df"><th align="left" style="padding:8px">Article</th><th align="left" style="padding:8px">Mamül</th><th align="left" style="padding:8px">Renk</th><th align="right" style="padding:8px">Miktar</th>${priceTh}</tr></thead>`,
    `<tbody>${itemRows}</tbody>`,
    '</table>',
    '<table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;margin-bottom:16px">',
    `<tr><td style="padding:4px 0;color:#666">Firma</td><td style="padding:4px 0;font-weight:600">${order.firma_adi || '-'}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#666">İlgili Kişi</td><td style="padding:4px 0">${order.ilgili_kisi || '-'}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#666">Telefon</td><td style="padding:4px 0">${order.telefon || '-'}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#666">Fuar / Kaynak</td><td style="padding:4px 0">${order.fuar_adi || '-'}</td></tr>`,
    totalRow,
    '</table>',
    order.aciklama ? `<p style="margin:0 0 16px;font-size:13px;color:#555"><strong>Not:</strong> ${order.aciklama}</p>` : '',
    '<p style="margin:16px 0 0;font-size:13px;color:#888">Bu e-posta otomatik olarak gönderilmiştir.</p>',
    '</div></div>'
  ].join('');

  const text = [
    `SİPARİŞ ONAYLANDI – ${siparisNo}`,
    `Firma: ${firma}`,
    `İlgili Kişi: ${order.ilgili_kisi || '-'}`,
    `Telefon: ${order.telefon || '-'}`,
    ...(showPrices ? [`Toplam: ${Number(order.toplam_tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}`] : []),
    '',
    'Kalemler:',
    ...(items.length ? items.map((i) => showPrices
      ? `${i.article_code} - ${i.mamul_adi} - ${Number(i.miktar_kg || 0).toFixed(2)} kg - ${Number(i.tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}`
      : `${i.article_code} - ${i.mamul_adi} - ${Number(i.miktar_kg || 0).toFixed(2)} kg`) : ['-'])
  ].join('\n');

  return { subject: `Sipariş Onaylandı ${siparisNo} – ${firma}`, html, text };
}

function buildOrderEmailContent(order, items = []) {
  const title = `Kartelix Siparis #${order.id}`;
  const lines = items.map((item) =>
    `${item.article_code || item.article_no} - ${item.mamul_adi} - ${Number(item.miktar_kg || 0).toFixed(2)} kg`
  );
  const text = [
    title,
    '',
    `Firma: ${order.firma_adi || order.musteri_adi || '-'}`,
    `İlgili kişi: ${order.ilgili_kisi || '-'}`,
    `Telefon: ${order.telefon || '-'}`,
    `E-posta: ${order.email || '-'}`,
    `Fuar: ${order.fuar_adi || '-'}`,
    `Personel: ${order.personel_username || '-'}`,
    `Durum: ${order.durum || '-'}`,
    `Toplam: ${Number(order.toplam_tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}`,
    '',
    'Kalemler:',
    ...(lines.length ? lines : ['-']),
    '',
    order.aciklama ? `Not: ${order.aciklama}` : ''
  ].filter((line, index, array) => line || array[index - 1] !== '').join('\n');

  const itemRows = items.length
    ? items.map((item) => `
        <tr>
          <td>${item.article_code || item.article_no || '-'}</td>
          <td>${item.mamul_adi || '-'}</td>
          <td>${item.renk || '-'}</td>
          <td style="text-align:right">${Number(item.miktar_kg || 0).toFixed(2)} kg</td>
          <td style="text-align:right">${Number(item.tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="5">-</td></tr>';

  const html = `
    <div style="font-family:Arial,sans-serif;color:#172023;line-height:1.5">
      <h2>${title}</h2>
      <p><strong>Firma:</strong> ${order.firma_adi || order.musteri_adi || '-'}</p>
      <p><strong>İlgili kişi:</strong> ${order.ilgili_kisi || '-'}<br>
      <strong>Telefon:</strong> ${order.telefon || '-'}<br>
      <strong>E-posta:</strong> ${order.email || '-'}<br>
      <strong>Fuar:</strong> ${order.fuar_adi || '-'}<br>
      <strong>Personel:</strong> ${order.personel_username || '-'}</p>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid #d7c5ad">
        <thead>
          <tr style="background:#f3efe7">
            <th align="left">Article</th>
            <th align="left">Mamül</th>
            <th align="left">Renk</th>
            <th align="right">Miktar</th>
            <th align="right">Tutar</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p><strong>Toplam:</strong> ${Number(order.toplam_tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}</p>
      ${order.aciklama ? `<p><strong>Not:</strong> ${order.aciklama}</p>` : ''}
    </div>
  `;

  return { subject: `${title} - ${order.firma_adi || order.musteri_adi || '-'}`, text, html };
}

async function loadOrderForEmail(siparisId) {
  const order = await dbGetAsync(`SELECT * FROM kartelix_orders WHERE id = ?`, [siparisId]);
  if (!order) throw new Error('Siparis bulunamadi');
  const items = await dbAllAsync(
    `SELECT * FROM kartelix_order_items WHERE siparis_id = ? ORDER BY id ASC`,
    [siparisId]
  );
  return { order, items: items.map(mapSiparisKalemi) };
}

async function sendSmtpMail({ settings, recipients, subject, html, text }) {
  const transporter = createOrderEmailTransport(settings);
  const fromEmail = resolveOrderEmailSender(settings);
  if (!fromEmail) {
    const error = new Error('Gönderici e-posta veya SMTP kullanıcı alanı boş');
    error.code = 'ESETTINGS';
    error.responseCode = 400;
    throw error;
  }

  const info = await transporter.sendMail({
    from: `"${settings.senderName || 'Kartelix'}" <${fromEmail}>`,
    to: recipients.join(', '),
    replyTo: settings.replyTo || fromEmail,
    subject,
    text,
    html
  });

  return {
    accepted: info.accepted || recipients,
    rejected: info.rejected || [],
    messageId: info.messageId || ''
  };
}

async function sendOrderEmailNotification(siparisId, overrideRecipients = '') {
  const settings = await loadOrderEmailSettings(true);
  if (!settings.enabled && !overrideRecipients) {
    return { skipped: true, message: 'E-posta bildirimi pasif' };
  }

  const recipients = parseEmailList(overrideRecipients || settings.recipientEmails);
  if (!recipients.length) {
    return { skipped: true, message: 'Sipariş alıcı e-postası tanımlı değil' };
  }

  if (!settings.smtpHost || !(settings.smtpUser || settings.senderEmail) || !settings.smtpPassword) {
    return { skipped: true, message: 'Gmail SMTP ayarları eksik' };
  }

  const { order, items } = await loadOrderForEmail(siparisId);
  const content = buildOrderEmailContent(order, items);
  const result = await sendSmtpMail({
    settings,
    recipients,
    subject: content.subject,
    html: content.html,
    text: content.text
  });

  return {
    skipped: false,
    message: 'E-posta gönderildi',
    ...result
  };
}

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

function ensureColumnExists(tableName, columnName, definition) {
  db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
    if (err) {
      console.error(`Kolon kontrol hatasi (${tableName}.${columnName}):`, err);
      return;
    }

    const hasColumn = rows.some((row) => row.name === columnName);
    if (!hasColumn) {
      const fallbackDefinition = definition.includes('CURRENT_TIMESTAMP')
        ? definition.replace(/\s+DEFAULT\s+CURRENT_TIMESTAMP/i, '')
        : definition;

      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${fallbackDefinition}`, (alterErr) => {
        if (alterErr) {
          console.error(`Kolon ekleme hatasi (${tableName}.${columnName}):`, alterErr);
        }
      });
    }
  });
}

function loadMamulDetailByClause(whereClause, params, callback) {
  db.get(
    `SELECT mk.*, mt.ad AS mamul_turu_adi, mt.kod_prefix
     FROM mamul_kartlari mk
     INNER JOIN mamul_turleri mt ON mt.id = mk.mamul_turu_id
     WHERE ${whereClause}
     LIMIT 1`,
    params,
    (err, mamul) => {
      if (err) return callback(err);
      if (!mamul) return callback(null, null);

      db.all(
        `SELECT * FROM mamul_iplik_detaylari WHERE mamul_id = ? ORDER BY sira_no ASC, id ASC`,
        [mamul.id],
        (iplikErr, iplikler) => {
          if (iplikErr) return callback(iplikErr);

          db.all(
            `SELECT * FROM mamul_proses_detaylari WHERE mamul_id = ? ORDER BY sira_no ASC, id ASC`,
            [mamul.id],
            (prosesErr, prosesler) => {
              if (prosesErr) return callback(prosesErr);
              callback(null, mapMamulDetail(mamul, iplikler, prosesler));
            }
          );
        }
      );
    }
  );
}

function trackMamulEvent(mamulId, olayTipi, olayKaynagi = '') {
  if (!mamulId || !olayTipi) return;
  db.run(
    `INSERT INTO mamul_analitikleri (mamul_id, olay_tipi, olay_kaynagi) VALUES (?, ?, ?)`,
    [mamulId, String(olayTipi).trim(), String(olayKaynagi || '').trim()],
    () => {}
  );
}

function normalizeLookupCode(input) {
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
}

function generateNextArticleNoForType(mamulTuruId, callback) {
  db.get(`SELECT id, kod_prefix FROM mamul_turleri WHERE id = ?`, [mamulTuruId], (turErr, tur) => {
    if (turErr) return callback(turErr);
    if (!tur) return callback(new Error('Mamul türü bulunamadı'));

    const prefix = String(tur.kod_prefix || '').trim();
    const suffixLength = 5 - prefix.length;

    if (suffixLength < 1) {
      return callback(new Error('Kod prefix 5 haneden kısa olmalıdır'));
    }

    db.get(
      `SELECT article_no
       FROM mamul_kartlari
       WHERE article_no LIKE ?
       ORDER BY article_no DESC
       LIMIT 1`,
      [`${prefix}%`],
      (err, row) => {
        if (err) return callback(err);

        const lastValue = row?.article_no ? String(row.article_no).slice(prefix.length) : '0';
        const nextNumber = String(Number(lastValue || 0) + 1).padStart(suffixLength, '0');
        callback(null, {
          articleNo: `${prefix}${nextNumber}`,
          articleCode: `${prefix}${nextNumber}`,
          prefix
        });
      }
    );
  });
}

// Benzersiz Article No üretimi
function generateArticleNo(prefix = 'PRD', callback) {
  const tarih = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  db.get(
    `SELECT COUNT(*) AS count FROM siparis_kartelalari WHERE article_no LIKE ?`,
    [`${prefix}-${tarih}-%`],
    (err, row) => {
      if (err) return callback(err);
      
      const count = row.count + 1;
      const articleNo = `${prefix}-${tarih}-${String(count).padStart(5, '0')}`;
      callback(null, articleNo);
    }
  );
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Server Error:', err);
  
  if (err.message.includes('SQLITE_CONSTRAINT')) {
    return res.status(409).json({ 
      error: 'Veri çakışması',
      message: 'Bu kayıt zaten mevcut' 
    });
  }
  
  res.status(500).json({ 
    error: 'Sunucu hatası',
    message: 'İşlem sırasında bir hata oluştu' 
  });
};

const excelOwnedMutationGuard = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const excelOwnedPaths = [
    '/api/admin/mamul-turleri',
    '/api/admin/renkler',
    '/api/admin/iplikler',
    '/api/admin/prosesler',
    '/api/admin/mamuller',
    '/api/admin/excel-sources'
  ];

  const isExcelOwned = excelOwnedPaths.some((routePath) => req.path === routePath || req.path.startsWith(`${routePath}/`));
  const isAllowedOperation = req.path === '/api/admin/excel-sync/run' || req.path === '/api/admin/excel-settings/poll'
    || /^\/api\/admin\/mamuller\/\d+(\/gorsel|\/showcase|\/duplicate)?$/.test(req.path)
    || req.path === '/api/admin/mamuller-lookup';

  if (isExcelOwned && !isAllowedOperation) {
    return res.status(403).json({
      success: false,
      error: 'Bu veri Excel kaynaklidir. Uygulama arayuzunden manuel kayit veya guncelleme yapilamaz.'
    });
  }

  return next();
};

app.use(excelOwnedMutationGuard);

// --- MEVCUT API ROTLARI ---

app.get('/api/admin/excel-settings', requireAuth(['admin']), async (req, res, next) => {
  try {
    const sources = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, kaynak_tipi, dosya_adi, uzanti, sheet_adi, aktif, updated_at
         FROM excel_kaynaklari
         ORDER BY CASE kaynak_tipi
           ${SOURCE_ORDER.map((type, index) => `WHEN '${type}' THEN ${index + 1}`).join(' ')}
           ELSE 999 END, id ASC`,
        [],
        (err, rows) => (err ? reject(err) : resolve(rows || []))
      );
    });

    const pollRow = await new Promise((resolve, reject) => {
      db.get(
        `SELECT deger FROM ui_ayarlari WHERE anahtar = 'excel_poll_ms'`,
        [],
        (err, row) => (err ? reject(err) : resolve(row || null))
      );
    });

    res.json({
      success: true,
      data: {
        pollMs: Number(pollRow?.deger || 60000),
        sources: sources.map((row) => ({
          id: row.id,
          kaynak_tipi: row.kaynak_tipi,
          dosya_adi: row.dosya_adi,
          uzanti: row.uzanti || '.xlsx',
          sheet_adi: row.sheet_adi || '',
          aktif: Boolean(row.aktif),
          updated_at: row.updated_at
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

app.put('/api/admin/excel-settings/poll', requireAuth(['admin']), (req, res, next) => {
  const pollMs = Number(req.body?.pollMs || 0);
  if (!Number.isFinite(pollMs) || pollMs < 5000) {
    return res.status(400).json({ error: 'Excel okuma sıklığı en az 5000 ms olmalıdır' });
  }

  db.run(
    `INSERT INTO ui_ayarlari (anahtar, deger)
     VALUES ('excel_poll_ms', ?)
     ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger, updated_at = CURRENT_TIMESTAMP`,
    [String(Math.round(pollMs))],
    (err) => {
      if (err) return next(err);
      res.json({ success: true, data: { pollMs: Math.round(pollMs) } });
    }
  );
});

app.post('/api/admin/excel-sources', requireAuth(['admin']), (req, res, next) => {
  const { kaynakTipi, dosyaAdi, uzanti = '.xlsx', sheetAdi = '', aktif = true } = req.body;

  if (!kaynakTipi || !SOURCE_ORDER.includes(String(kaynakTipi).trim())) {
    return res.status(400).json({ error: 'Geçerli bir kaynak tipi seçilmelidir' });
  }
  if (!dosyaAdi || !String(dosyaAdi).trim()) {
    return res.status(400).json({ error: 'Dosya adı zorunludur' });
  }
  if (!['.xls', '.xlsx'].includes(String(uzanti).trim().toLowerCase())) {
    return res.status(400).json({ error: 'Uzantı .xls veya .xlsx olmalıdır' });
  }

  db.run(
    `INSERT INTO excel_kaynaklari (kaynak_tipi, dosya_adi, uzanti, sheet_adi, aktif)
     VALUES (?, ?, ?, ?, ?)`,
    [
      String(kaynakTipi).trim(),
      String(dosyaAdi).trim(),
      String(uzanti).trim().toLowerCase(),
      String(sheetAdi || '').trim(),
      aktif ? 1 : 0
    ],
    function(err) {
      if (err) return next(err);
      res.status(201).json({
        success: true,
        data: {
          id: this.lastID,
          kaynak_tipi: String(kaynakTipi).trim(),
          dosya_adi: String(dosyaAdi).trim(),
          uzanti: String(uzanti).trim().toLowerCase(),
          sheet_adi: String(sheetAdi || '').trim(),
          aktif: Boolean(aktif)
        }
      });
    }
  );
});

app.put('/api/admin/excel-sources/:id', requireAuth(['admin']), (req, res, next) => {
  const { kaynakTipi, dosyaAdi, uzanti = '.xlsx', sheetAdi = '', aktif = true } = req.body;
  const id = req.params.id;

  if (!kaynakTipi || !SOURCE_ORDER.includes(String(kaynakTipi).trim())) {
    return res.status(400).json({ error: 'Geçerli bir kaynak tipi seçilmelidir' });
  }
  if (!dosyaAdi || !String(dosyaAdi).trim()) {
    return res.status(400).json({ error: 'Dosya adı zorunludur' });
  }
  if (!['.xls', '.xlsx'].includes(String(uzanti).trim().toLowerCase())) {
    return res.status(400).json({ error: 'Uzantı .xls veya .xlsx olmalıdır' });
  }

  db.run(
    `UPDATE excel_kaynaklari
     SET kaynak_tipi = ?, dosya_adi = ?, uzanti = ?, sheet_adi = ?, aktif = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      String(kaynakTipi).trim(),
      String(dosyaAdi).trim(),
      String(uzanti).trim().toLowerCase(),
      String(sheetAdi || '').trim(),
      aktif ? 1 : 0,
      id
    ],
    function(err) {
      if (err) return next(err);
      res.json({
        success: true,
        data: {
          id: Number(id),
          kaynak_tipi: String(kaynakTipi).trim(),
          dosya_adi: String(dosyaAdi).trim(),
          uzanti: String(uzanti).trim().toLowerCase(),
          sheet_adi: String(sheetAdi || '').trim(),
          aktif: Boolean(aktif)
        }
      });
    }
  );
});

app.delete('/api/admin/excel-sources/:id', requireAuth(['admin']), (req, res, next) => {
  db.run(`DELETE FROM excel_kaynaklari WHERE id = ?`, [req.params.id], function(err) {
    if (err) return next(err);
    res.json({ success: true, data: { deleted: this.changes > 0 } });
  });
});

app.post('/api/admin/excel-sync/run', requireAuth(['admin']), async (req, res) => {
  try {
    await excelSync.runNow();
    const status = await excelSync.getStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || 'Excel sync calistirilamadi' });
  }
});

app.get('/api/admin/mamuller/next-article-no/:mamulTuruId', requireAuth(['admin']), (req, res, next) => {
  generateNextArticleNoForType(req.params.mamulTuruId, (err, data) => {
    if (err) return next(err);
    res.json({ success: true, data });
  });
});

app.get('/api/admin/mamuller', requireAuth(['admin']), (req, res, next) => {
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

  db.all(sql, params, (err, rows) => {
    if (err) return next(err);

    res.json({
      success: true,
      data: rows.map(mapMamulCard)
    });
  });
});

app.get('/api/admin/mamuller/:id', requireAuth(['admin', 'mamul']), (req, res, next) => {
  const mamulId = req.params.id;

  loadMamulDetailByClause(`mk.id = ?`, [mamulId], (err, detail) => {
    if (err) return next(err);
    if (!detail) return res.status(404).json({ error: 'Mamul bulunamadi' });
    res.json({ success: true, data: detail });
  });
});

app.get('/api/admin/mamul-lookup', requireAuth(['admin', 'staff', 'mamul']), (req, res, next) => {
  const normalizedCode = normalizeLookupCode(req.query.code);

  if (!normalizedCode) {
    return res.status(400).json({ error: 'QR veya kod bilgisi gereklidir' });
  }

  loadMamulDetailByClause(
    `mk.qr_slug = ? OR mk.article_code = ? OR mk.article_no = ?`,
    [normalizedCode, normalizedCode, normalizedCode],
    (err, detail) => {
      if (err) return next(err);
      if (!detail) return res.status(404).json({ error: 'QR ile eslesen mamul bulunamadi' });
      res.json({ success: true, data: detail });
    }
  );
});

app.post('/api/admin/mamuller', requireAuth(['admin']), (req, res, next) => {
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

  if (!mamulAdi || !String(mamulAdi).trim()) {
    return res.status(400).json({ error: 'Mamul adı zorunludur' });
  }

  if (!mamulTuruId) {
    return res.status(400).json({ error: 'Mamul türü seçilmelidir' });
  }

  generateNextArticleNoForType(mamulTuruId, (articleErr, articleData) => {
    if (articleErr) return next(articleErr);

    const { articleNo, articleCode } = articleData;
    const qrSlug = slugify(`${articleCode}-${mamulAdi}-${renk || ''}`);
    const calculatedYarnCost = calculateYarnCost(iplikler);
    const calculatedProcessCost = calculateProcessCost(prosesler);
    const totalCost = Number((calculatedYarnCost + calculatedProcessCost).toFixed(2));

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
            return next(insertErr);
          }

          const mamulId = this.lastID;
          const normalizedIplikler = iplikler.filter((item) => item.iplik_adi);
          const normalizedProsesler = prosesler.filter((item) => item.proses_adi);
          const totalInserts = normalizedIplikler.length + normalizedProsesler.length;

          if (totalInserts === 0) {
            return db.run('COMMIT', (commitErr) => {
              if (commitErr) return next(commitErr);
              res.status(201).json({
                success: true,
                data: { id: mamulId, articleCode, qrSlug, birKgMaliyet: totalCost }
              });
            });
          }

          let completed = 0;
          const maybeCommit = () => {
            completed += 1;
            if (completed === totalInserts) {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  db.run('ROLLBACK');
                  return next(commitErr);
                }

                res.status(201).json({
                  success: true,
                  data: { id: mamulId, articleCode, qrSlug, birKgMaliyet: totalCost }
                });
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
                if (detailErr) {
                  db.run('ROLLBACK');
                  return next(detailErr);
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
                if (detailErr) {
                  db.run('ROLLBACK');
                  return next(detailErr);
                }
                maybeCommit();
              }
            );
          });
        }
      );
    });
  });
});

app.put('/api/admin/mamuller/:id', requireAuth(['admin']), (req, res, next) => {
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

  if (!mamulAdi || !String(mamulAdi).trim()) {
    return res.status(400).json({ error: 'Mamul adı zorunludur' });
  }

  if (!mamulTuruId) {
    return res.status(400).json({ error: 'Mamul türü seçilmelidir' });
  }

  db.get(`SELECT article_no, article_code FROM mamul_kartlari WHERE id = ?`, [mamulId], (findErr, existing) => {
    if (findErr) return next(findErr);
    if (!existing) return res.status(404).json({ error: 'Mamül bulunamadı' });

const qrSlug = slugify(`${existing.article_code}-${mamulAdi}-${renk || ''}`);
        const calculatedYarnCost = calculateYarnCost(iplikler);
        const calculatedProcessCost = calculateProcessCost(prosesler);
        const totalCost = Number((calculatedYarnCost + calculatedProcessCost).toFixed(2));
        const normalizedIplikler = iplikler.filter((item) => item.iplik_adi);
        const normalizedProsesler = prosesler.filter((item) => item.proses_adi);
        const formulJson = JSON.stringify({
          editedAt: new Date().toISOString(),
          source: 'admin_edit',
          iplikler: normalizedIplikler.map(item => ({
            iplik_adi: item.iplik_adi,
            oran_yuzde: Number(item.oran_yuzde || 0),
            birim_fiyat: Number(item.birim_fiyat || 0),
            maliyet_tutari: Number(((Number(item.oran_yuzde || 0) / 100) * Number(item.birim_fiyat || 0)).toFixed(2))
          })),
          prosesler: normalizedProsesler.map(item => ({
            proses_adi: item.proses_adi,
            proses_tipi: item.proses_tipi,
            birim_maliyet: Number(item.birim_maliyet || 0)
          }))
        });

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
            return next(updateErr);
          }

          db.run(`DELETE FROM mamul_iplik_detaylari WHERE mamul_id = ?`, [mamulId], (deleteYarnErr) => {
            if (deleteYarnErr) {
              db.run('ROLLBACK');
              return next(deleteYarnErr);
            }

            db.run(`DELETE FROM mamul_proses_detaylari WHERE mamul_id = ?`, [mamulId], (deleteProcessErr) => {
              if (deleteProcessErr) {
                db.run('ROLLBACK');
                return next(deleteProcessErr);
              }

              const totalInserts = normalizedIplikler.length + normalizedProsesler.length;

              if (totalInserts === 0) {
                return db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    db.run('ROLLBACK');
                    return next(commitErr);
                  }

                  res.json({
                    success: true,
                    data: {
                      id: Number(mamulId),
                      articleNo: existing.article_no,
                      articleCode: existing.article_code,
                      qrSlug,
                      birKgMaliyet: totalCost
                    }
                  });
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
                      return next(commitErr);
                    }

                    res.json({
                      success: true,
                      data: {
                        id: Number(mamulId),
                        articleNo: existing.article_no,
                        articleCode: existing.article_code,
                        qrSlug,
                        birKgMaliyet: totalCost
                      }
                    });
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
                      return next(detailErr);
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
                      return next(detailErr);
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
});

app.get('/api/public/mamuller/:slug', (req, res, next) => {
  const slug = req.params.slug;

  db.get(
    `SELECT mk.*, mt.ad AS mamul_turu_adi, mt.kod_prefix
     FROM mamul_kartlari mk
     INNER JOIN mamul_turleri mt ON mt.id = mk.mamul_turu_id
     WHERE mk.qr_slug = ? AND mk.aktif = 1`,
    [slug],
    (err, mamul) => {
      if (err) return next(err);
      if (!mamul) return res.status(404).json({ error: 'Mamul bulunamadı' });

      trackMamulEvent(mamul.id, 'public_view', 'public');

      db.all(
        `SELECT id, mamul_adi, article_code, qr_slug, renk, tanitim_basligi, gorsel_url
         FROM mamul_kartlari
         WHERE aktif = 1 AND id != ? AND (mamul_turu_id = ? OR koleksiyon_adi = ?)
         ORDER BY updated_at DESC
         LIMIT 4`,
        [mamul.id, mamul.mamul_turu_id, String(mamul.koleksiyon_adi || '').trim()],
        (relatedErr, relatedRows) => {
          if (relatedErr) return next(relatedErr);

          db.all(
            `SELECT id, iplik_adi, oran_yuzde, sira_no
             FROM mamul_iplik_detaylari
             WHERE mamul_id = ?
             ORDER BY sira_no ASC, id ASC`,
            [mamul.id],
            (yarnErr, yarnRows) => {
              if (yarnErr) return next(yarnErr);

              db.all(
                `SELECT id, proses_adi, proses_tipi, aciklama, sira_no
                 FROM mamul_proses_detaylari
                 WHERE mamul_id = ?
                 ORDER BY sira_no ASC, id ASC`,
                [mamul.id],
                (processErr, processRows) => {
                  if (processErr) return next(processErr);

                  res.json({
                    success: true,
                    data: {
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
                      iplikler: yarnRows.map((item) => ({
                        ...item,
                        oran_yuzde: Number(item.oran_yuzde || 0)
                      })),
                      prosesler: processRows,
                      benzer_urunler: relatedRows
                    }
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

app.put('/api/admin/mamuller/:id/showcase', requireAuth(['admin']), (req, res, next) => {
  const mamulId = req.params.id;
  const {
    tanitimBasligi,
    tanitimHikayesi,
    materyalNotlari,
    gorselUrl,
    vurguEtiketi,
    aciklama
  } = req.body;

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
      if (err) return next(err);
      if (this.changes === 0) return res.status(404).json({ error: 'Mamul bulunamadi' });
      res.json({ success: true, data: { id: Number(mamulId) } });
    }
  );
});

app.post('/api/admin/mamuller/:id/duplicate', requireAuth(['admin']), (req, res, next) => {
  const mamulId = req.params.id;

  loadMamulDetailByClause(`mk.id = ?`, [mamulId], (err, detail) => {
    if (err) return next(err);
    if (!detail) return res.status(404).json({ error: 'Mamul bulunamadi' });

    generateNextArticleNoForType(detail.mamul_turu_id, (articleErr, articleData) => {
      if (articleErr) return next(articleErr);
      const articleNo = articleData.articleNo;
      const articleCode = articleData.articleCode;
      const qrSlug = slugify(`${articleCode}-${detail.mamul_adi}-kopya-${detail.renk || ''}`);
      const iplikler = Array.isArray(detail.iplikler) ? detail.iplikler : [];
      const prosesler = Array.isArray(detail.prosesler) ? detail.prosesler : [];
      const totalCost = Number((calculateYarnCost(iplikler) + calculateProcessCost(prosesler)).toFixed(2));

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
              return next(insertErr);
            }

            const newMamulId = this.lastID;
            let pending = iplikler.length + prosesler.length;

            if (pending === 0) {
              return db.run('COMMIT', (commitErr) => {
                if (commitErr) return next(commitErr);
                res.status(201).json({ success: true, data: { id: newMamulId, articleNo, articleCode, qrSlug } });
              });
            }

            const maybeCommit = () => {
              pending -= 1;
              if (pending === 0) {
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    db.run('ROLLBACK');
                    return next(commitErr);
                  }
                  res.status(201).json({ success: true, data: { id: newMamulId, articleNo, articleCode, qrSlug } });
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
                    return next(detailErr);
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
                    return next(detailErr);
                  }
                  maybeCommit();
                }
              );
            });
          }
        );
      });
    });
  });
});

// /api/mamul-labels route moved to server/routes/labeling.js

/*
app.post('/api/orders', requireAuth(['admin', 'staff']), (req, res, next) => {
  const {
    musteriAdi,
    firmaAdi,
    ilgiliKisi,
    telefon,
    email,
    fuarAdi,
    aciklama,
    personelUsername,
    durum = 'kaydedildi',
    paraBirimi = 'TRY',
    items = [],
    kartvizit = {}
  } = req.body;

  const normalizedItems = Array.isArray(items)
    ? items.filter((item) => item && item.mamulId && Number(item.miktarKg || 0) > 0)
    : [];

  if (normalizedItems.length === 0) {
    return res.status(400).json({ error: 'Siparise en az bir mamul eklenmelidir' });
  }

  const normalizedKartvizit = {
    imageDataUrl: String(kartvizit.imageDataUrl || '').trim(),
    note: String(kartvizit.note || '').trim(),
    ocrFirma: String(kartvizit.ocrFirma || '').trim(),
    ocrKisi: String(kartvizit.ocrKisi || '').trim(),
    ocrTelefon: String(kartvizit.ocrTelefon || '').trim(),
    ocrEmail: String(kartvizit.ocrEmail || '').trim(),
    ocrDurumu: String(kartvizit.ocrDurumu || (kartvizit.imageDataUrl ? 'hazir' : 'bekleniyor')).trim()
  };

  const resolvedMusteriAdi = String(
    musteriAdi || firmaAdi || normalizedKartvizit.ocrFirma || (normalizedKartvizit.imageDataUrl ? 'Kartvizit eklendi' : 'Firma adı bilinmiyor')
  ).trim();

  const mamulIds = normalizedItems.map((item) => Number(item.mamulId));
  const placeholders = mamulIds.map(() => '?').join(', ');

  db.all(
    `SELECT id, mamul_adi, article_no, article_code, renk, bir_kg_satis_fiyati
     FROM mamul_kartlari
     WHERE id IN (${placeholders})`,
    mamulIds,
    (mamulErr, mamuller) => {
      if (mamulErr) return next(mamulErr);

      if (mamuller.length !== normalizedItems.length) {
        return res.status(400).json({ error: 'Secilen mamullerden biri bulunamadi' });
      }

      const mamulMap = new Map(mamuller.map((item) => [Number(item.id), item]));
      const enrichedItems = normalizedItems.map((item) => {
        const mamul = mamulMap.get(Number(item.mamulId));
        const birimFiyat = Number(item.birimFiyat || mamul.bir_kg_satis_fiyati || 0);
        const miktarKg = Number(item.miktarKg || 0);
        return {
          mamulId: Number(item.mamulId),
          mamul_adi: mamul.mamul_adi,
          article_no: mamul.article_no,
          article_code: mamul.article_code,
          renk: mamul.renk,
          miktar_kg: miktarKg,
          birim_fiyat: birimFiyat,
          tutar: Number((miktarKg * birimFiyat).toFixed(2))
        };
      });

      const toplamTutar = Number(
        enrichedItems.reduce((sum, item) => sum + item.tutar, 0).toFixed(2)
      );

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run(
          `INSERT INTO kartelix_orders (
            musteri_adi, ilgili_kisi, telefon, email, aciklama, durum,
            kartvizit_gorsel, kartvizit_notu, kartvizit_ocr_firma, kartvizit_ocr_kisi, kartvizit_ocr_telefon, kartvizit_ocr_email, kartvizit_ocr_durumu,
            firma_adi, fuar_adi, personel_username, toplam_tutar, para_birimi
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            resolvedMusteriAdi,
            String(ilgiliKisi || '').trim(),
            String(telefon || '').trim(),
            String(email || '').trim(),
            String(aciklama || '').trim(),
            String(durum || 'kaydedildi').trim(),
            normalizedKartvizit.imageDataUrl,
            normalizedKartvizit.note,
            normalizedKartvizit.ocrFirma,
            normalizedKartvizit.ocrKisi,
            normalizedKartvizit.ocrTelefon,
            normalizedKartvizit.ocrEmail,
            normalizedKartvizit.ocrDurumu,
            String(firmaAdi || '').trim(),
            String(fuarAdi || '').trim(),
            String(personelUsername || '').trim(),
            toplamTutar,
            String(paraBirimi || 'TRY').trim().toUpperCase()
          ],
          function(insertErr) {
            if (insertErr) {
              db.run('ROLLBACK');
              return next(insertErr);
            }

            const siparisId = this.lastID;
            let completed = 0;

            enrichedItems.forEach((item) => {
              db.run(
                `INSERT INTO kartelix_order_items (
                  siparis_id, mamul_id, mamul_adi, article_no, article_code, renk,
                  miktar_kg, birim_fiyat, tutar
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  siparisId,
                  item.mamulId,
                  item.mamul_adi,
                  item.article_no,
                  item.article_code,
                  item.renk || '',
                  item.miktar_kg,
                  item.birim_fiyat,
                  item.tutar
                ],
                (itemErr) => {
                  if (itemErr) {
                    db.run('ROLLBACK');
                    return next(itemErr);
                  }

                  completed += 1;
                  if (completed === enrichedItems.length) {
                    db.run('COMMIT', (commitErr) => {
                      if (commitErr) {
                        db.run('ROLLBACK');
                        return next(commitErr);
                      }

                      res.status(201).json({
                        success: true,
                        data: {
                          siparisId,
                          toplamTutar,
                          kalemSayisi: enrichedItems.length,
                          emailStatus: { skipped: true, message: 'E-posta arka planda gönderiliyor' }
                        }
                      });

                      sendOrderEmailNotification(siparisId).catch((emailErr) => {
                        console.error('Siparis email gonderme hatasi:', emailErr?.message || emailErr);
                      });
                    });
                  }
                }
              );
            });
          }
        );
      });
    }
  );
});

app.put('/api/orders/:id', requireAuth(['admin', 'staff']), (req, res, next) => {
  const siparisId = req.params.id;
  const {
    musteriAdi,
    firmaAdi,
    ilgiliKisi,
    telefon,
    email,
    fuarAdi,
    aciklama,
    durum = 'kaydedildi',
    personelUsername,
    paraBirimi = 'TRY',
    items = [],
    kartvizit = {}
  } = req.body;

  const normalizedItems = Array.isArray(items)
    ? items.filter((item) => item && item.mamulId && Number(item.miktarKg || 0) > 0)
    : [];

  if (normalizedItems.length === 0) {
    return res.status(400).json({ error: 'Sipariste en az bir mamul olmalidir' });
  }

  const normalizedKartvizit = {
    imageDataUrl: String(kartvizit.imageDataUrl || '').trim(),
    note: String(kartvizit.note || '').trim(),
    ocrFirma: String(kartvizit.ocrFirma || '').trim(),
    ocrKisi: String(kartvizit.ocrKisi || '').trim(),
    ocrTelefon: String(kartvizit.ocrTelefon || '').trim(),
    ocrEmail: String(kartvizit.ocrEmail || '').trim(),
    ocrDurumu: String(kartvizit.ocrDurumu || (kartvizit.imageDataUrl ? 'hazir' : 'bekleniyor')).trim()
  };

  const resolvedMusteriAdi = String(
    musteriAdi || firmaAdi || normalizedKartvizit.ocrFirma || (normalizedKartvizit.imageDataUrl ? 'Kartvizit eklendi' : 'Firma adı bilinmiyor')
  ).trim();

  const mamulIds = normalizedItems.map((item) => Number(item.mamulId));
  const placeholders = mamulIds.map(() => '?').join(', ');

  db.get(`SELECT id FROM kartelix_orders WHERE id = ?`, [siparisId], (findErr, existingOrder) => {
    if (findErr) return next(findErr);
    if (!existingOrder) return res.status(404).json({ error: 'Siparis bulunamadi' });

    db.all(
      `SELECT id, mamul_adi, article_no, article_code, renk, bir_kg_satis_fiyati
       FROM mamul_kartlari
       WHERE id IN (${placeholders})`,
      mamulIds,
      (mamulErr, mamuller) => {
        if (mamulErr) return next(mamulErr);
        if (mamuller.length !== normalizedItems.length) {
          return res.status(400).json({ error: 'Secilen mamullerden biri bulunamadi' });
        }

        const mamulMap = new Map(mamuller.map((item) => [Number(item.id), item]));
        const enrichedItems = normalizedItems.map((item) => {
          const mamul = mamulMap.get(Number(item.mamulId));
          const miktarKg = Number(item.miktarKg || 0);
          const birimFiyat = Number(item.birimFiyat || mamul.bir_kg_satis_fiyati || 0);
          return {
            mamulId: Number(item.mamulId),
            mamul_adi: mamul.mamul_adi,
            article_no: mamul.article_no,
            article_code: mamul.article_code,
            renk: mamul.renk,
            miktar_kg: miktarKg,
            birim_fiyat: birimFiyat,
            tutar: Number((miktarKg * birimFiyat).toFixed(2))
          };
        });

        const toplamTutar = Number(enrichedItems.reduce((sum, item) => sum + item.tutar, 0).toFixed(2));

        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          db.run(
            `UPDATE kartelix_orders
             SET musteri_adi = ?, firma_adi = ?, ilgili_kisi = ?, telefon = ?, email = ?, fuar_adi = ?, aciklama = ?,
                 kartvizit_gorsel = ?, kartvizit_notu = ?, kartvizit_ocr_firma = ?, kartvizit_ocr_kisi = ?, kartvizit_ocr_telefon = ?, kartvizit_ocr_email = ?, kartvizit_ocr_durumu = ?,
                 durum = ?, personel_username = ?, toplam_tutar = ?, para_birimi = ?
             WHERE id = ?`,
            [
              resolvedMusteriAdi,
              String(firmaAdi || '').trim(),
              String(ilgiliKisi || '').trim(),
              String(telefon || '').trim(),
              String(email || '').trim(),
              String(fuarAdi || '').trim(),
              String(aciklama || '').trim(),
              normalizedKartvizit.imageDataUrl,
              normalizedKartvizit.note,
              normalizedKartvizit.ocrFirma,
              normalizedKartvizit.ocrKisi,
              normalizedKartvizit.ocrTelefon,
              normalizedKartvizit.ocrEmail,
              normalizedKartvizit.ocrDurumu,
              String(durum || 'kaydedildi').trim(),
              String(personelUsername || '').trim(),
              toplamTutar,
              String(paraBirimi || 'TRY').trim().toUpperCase(),
              siparisId
            ],
            (updateErr) => {
              if (updateErr) {
                db.run('ROLLBACK');
                return next(updateErr);
              }

              db.run(`DELETE FROM kartelix_order_items WHERE siparis_id = ?`, [siparisId], (deleteErr) => {
                if (deleteErr) {
                  db.run('ROLLBACK');
                  return next(deleteErr);
                }

                let completed = 0;
                enrichedItems.forEach((item) => {
                  db.run(
                    `INSERT INTO kartelix_order_items (
                      siparis_id, mamul_id, mamul_adi, article_no, article_code, renk,
                      miktar_kg, birim_fiyat, tutar
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [siparisId, item.mamulId, item.mamul_adi, item.article_no, item.article_code, item.renk || '', item.miktar_kg, item.birim_fiyat, item.tutar],
                    (itemErr) => {
                      if (itemErr) {
                        db.run('ROLLBACK');
                        return next(itemErr);
                      }
                      completed += 1;
                      if (completed === enrichedItems.length) {
                        db.run('COMMIT', (commitErr) => {
                          if (commitErr) {
                            db.run('ROLLBACK');
                            return next(commitErr);
                          }
                          res.json({ success: true, data: { siparisId: Number(siparisId), toplamTutar, kalemSayisi: enrichedItems.length } });
                        });
                      }
                    }
                  );
                });
              });
            }
          );
        });
      }
    );
  });
});

*/

// Legacy order endpoints are now handled by server/routes/orders.js.

app.post('/api/backup', requireAuth(['admin']), (req, res, next) => {
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destinationPath = path.join(backupDir, `showroom-${timestamp}.db`);
    fs.copyFileSync(databasePath, destinationPath);

    res.json({
      success: true,
      message: 'Yedekleme başarılı',
      data: { path: destinationPath }
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/clean-database', requireAuth(['admin']), (req, res, next) => {
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run(`DELETE FROM kartelix_order_items`);
    db.run(`DELETE FROM kartelix_orders`);
    db.run(`DELETE FROM siparis_kalemleri`);
    db.run(`DELETE FROM siparis_kartelalari`);
    db.run(`DELETE FROM siparisler`);
    db.run(`DELETE FROM kartelalar`);
    db.run(`DELETE FROM firmalar`, (err) => {
      if (err) {
        db.run('ROLLBACK');
        return next(err);
      }

      db.run('COMMIT', (commitErr) => {
        if (commitErr) {
          db.run('ROLLBACK');
          return next(commitErr);
        }

        res.json({
          success: true,
          message: 'Veritabanı temizlendi'
        });
      });
    });
  });
});

// --- GENEL AYARLAR ---
const defaultGenelAyarlar = { publicProsesGoster: false, publicFiyatGoster: false };

app.get('/api/genel-ayarlar', async (req, res, next) => {
  try {
    const row = await dbGetAsync('SELECT deger FROM ui_ayarlari WHERE anahtar = ?', ['genel_ayarlar']);
    const parsed = row ? JSON.parse(row.deger || '{}') : {};
    res.json({ success: true, data: { ...defaultGenelAyarlar, ...parsed } });
  } catch (err) { next(err); }
});

app.put('/api/genel-ayarlar', requireAuth(['admin']), async (req, res, next) => {
  try {
    const existing = await dbGetAsync('SELECT deger FROM ui_ayarlari WHERE anahtar = ?', ['genel_ayarlar']);
    const parsed = existing ? JSON.parse(existing.deger || '{}') : {};
    const nextVal = { ...defaultGenelAyarlar, ...parsed, ...req.body };
    await dbRunAsync(
      'INSERT INTO ui_ayarlari (anahtar, deger) VALUES (?, ?) ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger, updated_at = CURRENT_TIMESTAMP',
      ['genel_ayarlar', JSON.stringify(nextVal)]
    );
    res.json({ success: true, data: nextVal });
  } catch (err) { next(err); }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  db.get('SELECT 1 as status', (err) => {
    if (err) {
      return res.status(503).json({
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });
});

// Görsel upload ayarları
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const gorselStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `mamul-${req.params.id}-${Date.now()}${ext}`);
  }
});

const gorselUpload = multer({
  storage: gorselStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype));
  }
});

app.post('/api/admin/mamuller/:id/gorsel', requireAuth(['admin']), gorselUpload.single('gorsel'), (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Geçerli bir görsel dosyası seçin (jpg, png, webp)' });

  const mamulId = req.params.id;
  const gorselUrl = `/uploads/${req.file.filename}`;

  // Eski görseli sil
  db.get(`SELECT gorsel_url FROM mamul_kartlari WHERE id = ?`, [mamulId], (err, row) => {
    if (!err && row?.gorsel_url && row.gorsel_url.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', 'public', row.gorsel_url);
      fs.unlink(oldPath, () => {});
    }

    db.run(
      `UPDATE mamul_kartlari SET gorsel_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [gorselUrl, mamulId],
      function(updateErr) {
        if (updateErr) return next(updateErr);
        if (this.changes === 0) return res.status(404).json({ error: 'Mamül bulunamadı' });
        res.json({ success: true, data: { gorsel_url: gorselUrl } });
      }
    );
  });
});

app.delete('/api/admin/mamuller/:id/gorsel', requireAuth(['admin']), (req, res, next) => {
  const mamulId = req.params.id;
  db.get(`SELECT gorsel_url FROM mamul_kartlari WHERE id = ?`, [mamulId], (err, row) => {
    if (err) return next(err);
    if (!row) return res.status(404).json({ error: 'Mamül bulunamadı' });

    if (row.gorsel_url && row.gorsel_url.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', 'public', row.gorsel_url);
      fs.unlink(oldPath, () => {});
    }

    db.run(
      `UPDATE mamul_kartlari SET gorsel_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [mamulId],
      (updateErr) => {
        if (updateErr) return next(updateErr);
        res.json({ success: true });
      }
    );
  });
});

// /uploads klasörünü serve et
app.use('/uploads', express.static(uploadsDir));

if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));

  app.get(/^\/(?!api).*/, (req, res) => {
    // Prevent aggressive caching of index.html so clients pick up new hashed assets
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint bulunamadı',
    message: `[${req.method}] ${req.originalUrl} mevcut değil` 
  });
});

// Error handler middleware'ini ekle
app.use(errorHandler);

// Sunucuyu başlat
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ ARKA PLAN İŞLEMLERİ DEVREDE: http://localhost:${PORT}`);
  console.log(`✅ Ortam: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS origin: ${ALLOWED_ORIGIN}`);
  console.log(`✅ Excel sync: ${excelInboxDir} (poll: ${excelPollMs}ms)`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Sunucu kapatılıyor...');
  db.close((err) => {
    if (err) {
      console.error('Database kapatma hatası:', err);
      process.exit(1);
    }
    console.log('✅ Database bağlantısı kapatıldı');
    process.exit(0);
  });
});
