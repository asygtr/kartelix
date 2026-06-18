const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const { startExcelSync, SOURCE_ORDER } = require('./excelSync');

const app = express();
app.use(cors());
app.use(express.json());

// Veritabanı bağlantısı
const databaseDir = path.join(__dirname, '..', 'database');
const databasePath = path.join(databaseDir, 'showroom.db');
const backupDir = path.join(databaseDir, 'backups');
const buildDir = path.join(__dirname, '..', 'build');

if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

const db = new sqlite3.Database(databasePath);

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
      yetki TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mamuller (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kod TEXT UNIQUE NOT NULL,
      ad TEXT NOT NULL,
      tip TEXT,
      stok INTEGER DEFAULT 0,
      kartela_hazir BOOLEAN DEFAULT 0,
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

    db.run(
      `INSERT INTO kullanicilar (username, password, yetki)
       VALUES (?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET password = excluded.password, yetki = excluded.yetki`,
      ['yonetici', '1234', 'admin']
    );

    db.run(
      `INSERT INTO kullanicilar (username, password, yetki)
       VALUES (?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET password = excluded.password, yetki = excluded.yetki`,
      ['satici', '1234', 'staff']
    );

    db.run(
      `INSERT INTO kullanicilar (username, password, yetki)
       VALUES (?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET password = excluded.password, yetki = excluded.yetki`,
      ['mamul', '1234', 'mamul']
    );

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

    console.log('✅ Veritabanı tabloları hazır');
  });
};

// Veritabanı başlatma
initDatabase();

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

const GRAPH_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'https://graph.microsoft.com/User.Read',
  'https://graph.microsoft.com/Mail.Send'
];

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
    requireTLS: !secure && port === 587
  });
}

const generatePkceCodeVerifier = () => crypto.randomBytes(32).toString('base64url');
const sha256Base64Url = (value) => crypto.createHash('sha256').update(value).digest('base64url');

const buildGraphAuthorizeUrl = ({ tenantId, clientId, redirectUri, state, codeChallenge }) => {
  const authorizeUrl = new URL(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_mode', 'query');
  authorizeUrl.searchParams.set('scope', GRAPH_SCOPES.join(' '));
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('prompt', 'consent');
  return authorizeUrl.toString();
};

async function postGraphTokenForm(tenantId, params) {
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString()
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error_description || payload.error || 'Microsoft token işlemi başarısız oldu');
    error.code = String(payload.error || '').toUpperCase() || 'TOKEN_ERROR';
    error.responseCode = response.status;
    error.response = payload.error_description || payload.error || '';
    throw error;
  }

  return payload;
}

async function exchangeGraphAuthorizationCode({ tenantId, clientId, redirectUri, code, codeVerifier }) {
  return postGraphTokenForm(tenantId, {
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    scope: GRAPH_SCOPES.join(' ')
  });
}

async function refreshGraphAccessToken({ tenantId, clientId, refreshToken }) {
  return postGraphTokenForm(tenantId, {
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: GRAPH_SCOPES.join(' ')
  });
}

async function fetchGraphMe(accessToken) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Microsoft profil bilgisi alınamadı');
    error.code = String(payload.error?.code || '').toUpperCase() || 'GRAPH_ME_ERROR';
    error.responseCode = response.status;
    error.response = payload.error?.message || '';
    throw error;
  }

  return payload;
}

async function connectOrderEmailAccount({ tenantId, clientId, redirectUri, code, codeVerifier }) {
  const tokenPayload = await exchangeGraphAuthorizationCode({
    tenantId,
    clientId,
    redirectUri,
    code,
    codeVerifier
  });

  const profile = await fetchGraphMe(tokenPayload.access_token);
  const existing = await loadOrderEmailSettings(true);
  const nextSettings = {
    ...existing,
    tenantId,
    clientId,
    redirectUri,
    connectedEmail: String(profile.mail || profile.userPrincipalName || '').trim(),
    connectedName: String(profile.displayName || '').trim(),
    accessToken: String(tokenPayload.access_token || '').trim(),
    refreshToken: String(tokenPayload.refresh_token || existing.refreshToken || '').trim(),
    accessTokenExpiresAt: Date.now() + (Number(tokenPayload.expires_in || 3600) * 1000),
    lastAuthAt: new Date().toISOString(),
    lastAuthError: ''
  };

  return persistOrderEmailConnection(nextSettings);
}

async function persistOrderEmailConnection(nextSettings) {
  await dbRunAsync(
    `INSERT INTO ui_ayarlari (anahtar, deger)
     VALUES ('order_email_settings', ?)
     ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger, updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(nextSettings)]
  );
  return sanitizeOrderEmailSettings(nextSettings);
}

async function disconnectOrderEmailConnection() {
  const existing = await loadOrderEmailSettings(true);
  const nextSettings = {
    ...existing,
    accessToken: '',
    refreshToken: '',
    accessTokenExpiresAt: 0,
    connectedEmail: '',
    connectedName: '',
    lastAuthAt: '',
    lastAuthError: 'Bağlantı kesildi'
  };

  await dbRunAsync(
    `INSERT INTO ui_ayarlari (anahtar, deger)
     VALUES ('order_email_settings', ?)
     ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger, updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(nextSettings)]
  );

  return sanitizeOrderEmailSettings(nextSettings);
}

async function ensureGraphAccessToken(settings) {
  if (settings.accessToken && isFiniteTimestamp(settings.accessTokenExpiresAt) && Date.now() < (Number(settings.accessTokenExpiresAt) - 60_000)) {
    return { accessToken: settings.accessToken, settings };
  }

  if (!settings.refreshToken) {
    const error = new Error('Microsoft hesabı bağlanmamış');
    error.code = 'NOT_CONNECTED';
    error.responseCode = 400;
    throw error;
  }

  const refreshed = await refreshGraphAccessToken({
    tenantId: settings.tenantId || 'consumers',
    clientId: settings.clientId,
    refreshToken: settings.refreshToken
  });

  const nextSettings = {
    ...settings,
    accessToken: String(refreshed.access_token || '').trim(),
    refreshToken: String(refreshed.refresh_token || settings.refreshToken || '').trim(),
    accessTokenExpiresAt: Date.now() + (Number(refreshed.expires_in || 3600) * 1000),
    lastAuthError: ''
  };

  await persistOrderEmailConnection(nextSettings);
  return { accessToken: nextSettings.accessToken, settings: nextSettings };
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

// Input validation middleware
const validateSiparis = (req, res, next) => {
  const { musteriAdi, kartelalar } = req.body;
  
  const errors = [];
  
  if (!musteriAdi || musteriAdi.trim().length < 2) {
    errors.push('Müşteri adı en az 2 karakter olmalıdır');
  }
  
  if (!kartelalar || !Array.isArray(kartelalar) || kartelalar.length === 0) {
    errors.push('En az bir kartela eklenmelidir');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Geçersiz veri', 
      details: errors 
    });
  }
  
  next();
};

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
  const isAllowedOperation = req.path === '/api/admin/excel-sync/run' || req.path === '/api/admin/excel-settings/poll';

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

// Mamül Detayını Çekme
app.get('/api/mamul/:kod', (req, res, next) => {
  const mamulKod = req.params.kod;

  if (!mamulKod || mamulKod.length < 2) {
    return res.status(400).json({ error: 'Geçersiz mamul kodu' });
  }

  const sql = `
    SELECT kod, ad, tip, stok AS stok_adet, kartela_hazir
    FROM mamuller
    WHERE kod = ?
    LIMIT 1
  `;

  db.get(sql, [mamulKod], (err, row) => {
    if (err) return next(err);
    
    if (!row) {
      return res.status(404).json({ error: 'Mamül bulunamadı' });
    }

    res.json({ 
      success: true,
      data: {
        ...row,
        renkSayisi: row.renkSayisi || 6, 
        sonGiris: row.sonGiris || '2025-10-15'
      }
    });
  });
});

// Mamül Arama
app.get('/api/search', (req, res, next) => {
  const term = req.query.term ? String(req.query.term).trim() : '';
  
  if (term.length < 2) {
    return res.json({ 
      success: true, 
      data: { mamuller: [] },
      message: 'Arama için en az 2 karakter girin'
    });
  }

  const searchTerm = `%${term}%`;
  const sql = `
    SELECT id, kod, ad, tip, stok, kartela_hazir
    FROM mamuller
    WHERE kod LIKE ? OR ad LIKE ? OR tip LIKE ?
    ORDER BY 
      CASE 
        WHEN kod LIKE ? THEN 1
        WHEN ad LIKE ? THEN 2
        ELSE 3
      END
    LIMIT 20
  `;
  
  db.all(sql, [searchTerm, searchTerm, searchTerm, `%${term}%`, `%${term}%`], (err, rows) => {
    if (err) {
      return next(err);
    }
    res.json({ 
      success: true, 
      data: { mamuller: rows } 
    });
  });
});

// Firma listesi
app.get('/api/firmalar', (req, res, next) => {
  db.all(`SELECT * FROM firmalar ORDER BY ad ASC`, [], (err, rows) => {
    if (err) return next(err);
    
    res.json({ 
      success: true,
      data: rows 
    });
  });
});

app.post('/api/firmalar', (req, res, next) => {
  const { ad, telefon, adres } = req.body;

  if (!ad || !String(ad).trim()) {
    return res.status(400).json({ error: 'Firma adı zorunludur' });
  }

  db.run(
    `INSERT INTO firmalar (ad, telefon, adres) VALUES (?, ?, ?)`,
    [String(ad).trim(), String(telefon || '').trim(), String(adres || '').trim()],
    function(err) {
      if (err) return next(err);

      res.status(201).json({
        success: true,
        data: {
          id: this.lastID,
          ad: String(ad).trim(),
          telefon: String(telefon || '').trim(),
          adres: String(adres || '').trim()
        }
      });
    }
  );
});

// Kullanıcı adı varlık kontrolü (şifre doğrulamaz)
app.post('/api/check-username', (req, res, next) => {
  const { username } = req.body;
  if (!username || !String(username).trim()) {
    return res.status(400).json({ success: false, message: 'Kullanıcı adı gereklidir' });
  }

  const normalizedUsername = String(username).trim().toLowerCase();
  const loginAliases = { admin: 'yonetici', staff: 'satici', yonetici: 'yonetici', satici: 'satici', mamul: 'mamul' };
  const finalUsername = loginAliases[normalizedUsername] || normalizedUsername;

  db.get(`SELECT id, username FROM kullanicilar WHERE username = ?`, [finalUsername], (err, row) => {
    if (err) return next(err);
    if (!row) return res.json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true });
  });
});

// Giriş kontrolü
app.post('/api/login', (req, res, next) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Kullanıcı adı ve şifre gereklidir' 
    });
  }

  const normalizedUsername = String(username || '').trim().toLowerCase();
  const loginAliases = {
    admin: 'yonetici',
    staff: 'satici',
    yonetici: 'yonetici',
    satici: 'satici',
    mamul: 'mamul'
  };
  const finalUsername = loginAliases[normalizedUsername] || normalizedUsername;

  db.get(
    `SELECT id, username, yetki FROM kullanicilar WHERE username = ? AND password = ?`,
    [finalUsername, password],
    (err, row) => {
      if (err) return next(err);
      
      if (!row) {
        return res.json({ 
          success: false, 
          message: 'Geçersiz kullanıcı adı veya şifre' 
        });
      }
      
      res.json({ 
        success: true, 
        data: { 
          user: row,
          redirectTo: row.yetki === 'staff'
            ? '/staff/orders/new'
            : row.yetki === 'mamul'
              ? '/mamul'
              : '/admin'
        },
        message: 'Giriş başarılı'
      });
    }
  );
});

app.get('/api/admin/mamul-turleri', (req, res, next) => {
  db.all(
    `SELECT * FROM mamul_turleri ORDER BY ad ASC`,
    [],
    (err, rows) => {
      if (err) return next(err);

      res.json({
        success: true,
        data: rows.map((row) => ({ ...row, aktif: Boolean(row.aktif) }))
      });
    }
  );
});

app.post('/api/admin/mamul-turleri', (req, res, next) => {
  const { ad, kodPrefix, aciklama, aktif = true } = req.body;

  if (!ad || !String(ad).trim()) {
    return res.status(400).json({ error: 'Mamul türü adı zorunludur' });
  }

  if (!kodPrefix || !String(kodPrefix).trim()) {
    return res.status(400).json({ error: 'Kod prefix zorunludur' });
  }

  db.run(
    `INSERT INTO mamul_turleri (ad, kod_prefix, aciklama, aktif) VALUES (?, ?, ?, ?)`,
    [String(ad).trim(), String(kodPrefix).trim(), String(aciklama || '').trim(), aktif ? 1 : 0],
    function(err) {
      if (err) return next(err);

      res.status(201).json({
        success: true,
        data: {
          id: this.lastID,
          ad: String(ad).trim(),
          kod_prefix: String(kodPrefix).trim(),
          aciklama: String(aciklama || '').trim(),
          aktif: Boolean(aktif)
        }
      });
    }
  );
});

app.put('/api/admin/mamul-turleri/:id', (req, res, next) => {
  const { ad, kodPrefix, aciklama, aktif = true } = req.body;
  const id = req.params.id;

  if (!ad || !String(ad).trim()) {
    return res.status(400).json({ error: 'Mamul türü adı zorunludur' });
  }

  if (!kodPrefix || !String(kodPrefix).trim()) {
    return res.status(400).json({ error: 'Kod prefix zorunludur' });
  }

  db.run(
    `UPDATE mamul_turleri
     SET ad = ?, kod_prefix = ?, aciklama = ?, aktif = ?
     WHERE id = ?`,
    [String(ad).trim(), String(kodPrefix).trim(), String(aciklama || '').trim(), aktif ? 1 : 0, id],
    function(err) {
      if (err) return next(err);
      res.json({
        success: true,
        data: {
          id: Number(id),
          ad: String(ad).trim(),
          kod_prefix: String(kodPrefix).trim(),
          aciklama: String(aciklama || '').trim(),
          aktif: Boolean(aktif)
        }
      });
    }
  );
});

app.get('/api/admin/renkler', (req, res, next) => {
  db.all(`SELECT * FROM renk_tanimlari ORDER BY ad ASC`, [], (err, rows) => {
    if (err) return next(err);
    res.json({ success: true, data: rows.map((row) => ({ ...row, aktif: Boolean(row.aktif) })) });
  });
});

app.post('/api/admin/renkler', (req, res, next) => {
  const { ad, kod, aktif = true } = req.body;
  if (!ad || !String(ad).trim()) {
    return res.status(400).json({ error: 'Renk adı zorunludur' });
  }
  if (!kod || !String(kod).trim()) {
    return res.status(400).json({ error: 'Renk kodu zorunludur' });
  }

  db.run(
    `INSERT INTO renk_tanimlari (ad, kod, aktif) VALUES (?, ?, ?)`,
    [String(ad).trim(), String(kod).trim(), aktif ? 1 : 0],
    function(err) {
      if (err) return next(err);
      res.status(201).json({ success: true, data: { id: this.lastID, ad: String(ad).trim(), kod: String(kod).trim(), aktif: Boolean(aktif) } });
    }
  );
});

app.put('/api/admin/renkler/:id', (req, res, next) => {
  const { ad, kod, aktif = true } = req.body;
  const id = req.params.id;

  if (!ad || !String(ad).trim()) {
    return res.status(400).json({ error: 'Renk adı zorunludur' });
  }
  if (!kod || !String(kod).trim()) {
    return res.status(400).json({ error: 'Renk kodu zorunludur' });
  }

  db.run(
    `UPDATE renk_tanimlari SET ad = ?, kod = ?, aktif = ? WHERE id = ?`,
    [String(ad).trim(), String(kod).trim(), aktif ? 1 : 0, id],
    function(err) {
      if (err) return next(err);
      res.json({
        success: true,
        data: { id: Number(id), ad: String(ad).trim(), kod: String(kod).trim(), aktif: Boolean(aktif) }
      });
    }
  );
});

app.get('/api/admin/iplikler', (req, res, next) => {
  db.all(`SELECT * FROM iplik_tanimlari ORDER BY ad ASC`, [], (err, rows) => {
    if (err) return next(err);
    res.json({ success: true, data: rows.map((row) => ({ ...row, aktif: Boolean(row.aktif), birim_fiyat: Number(row.birim_fiyat || 0) })) });
  });
});

app.post('/api/admin/iplikler', (req, res, next) => {
  const { ad, kod, birim = 'kg', birimFiyat = 0, aktif = true } = req.body;
  if (!ad || !String(ad).trim()) {
    return res.status(400).json({ error: 'İplik adı zorunludur' });
  }

  db.run(
    `INSERT INTO iplik_tanimlari (ad, kod, birim, birim_fiyat, aktif) VALUES (?, ?, ?, ?, ?)`,
    [String(ad).trim(), String(kod || '').trim(), String(birim || 'kg').trim(), Number(birimFiyat || 0), aktif ? 1 : 0],
    function(err) {
      if (err) return next(err);
      res.status(201).json({ success: true, data: { id: this.lastID, ad: String(ad).trim(), kod: String(kod || '').trim(), birim: String(birim || 'kg').trim(), birim_fiyat: Number(birimFiyat || 0), aktif: Boolean(aktif) } });
    }
  );
});

app.put('/api/admin/iplikler/:id', (req, res, next) => {
  const { ad, kod, birim = 'kg', birimFiyat = 0, aktif = true } = req.body;
  const id = req.params.id;

  if (!ad || !String(ad).trim()) {
    return res.status(400).json({ error: 'İplik adı zorunludur' });
  }

  db.run(
    `UPDATE iplik_tanimlari
     SET ad = ?, kod = ?, birim = ?, birim_fiyat = ?, aktif = ?
     WHERE id = ?`,
    [String(ad).trim(), String(kod || '').trim(), String(birim || 'kg').trim(), Number(birimFiyat || 0), aktif ? 1 : 0, id],
    function(err) {
      if (err) return next(err);
      res.json({
        success: true,
        data: {
          id: Number(id),
          ad: String(ad).trim(),
          kod: String(kod || '').trim(),
          birim: String(birim || 'kg').trim(),
          birim_fiyat: Number(birimFiyat || 0),
          aktif: Boolean(aktif)
        }
      });
    }
  );
});

app.get('/api/admin/prosesler', (req, res, next) => {
  db.all(`SELECT * FROM proses_tanimlari ORDER BY ad ASC`, [], (err, rows) => {
    if (err) return next(err);
    res.json({ success: true, data: rows.map((row) => ({ ...row, aktif: Boolean(row.aktif), renk_bazli: Boolean(row.renk_bazli), birim_maliyet: Number(row.birim_maliyet || 0) })) });
  });
});

app.get('/api/theme-settings', (req, res, next) => {
  db.all(
    `SELECT anahtar, deger FROM ui_ayarlari WHERE anahtar IN ('active_palette', 'app_logo', 'app_background')`,
    [],
    (err, rows) => {
      if (err) return next(err);

      const data = rows.reduce((acc, row) => {
        acc[row.anahtar] = row.deger;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          activePalette: data.active_palette || 'atelier',
          appLogo: data.app_logo || '/nevres.png',
          appBackground: data.app_background || '/showroom-bg.png'
        }
      });
    }
  );
});

app.put('/api/admin/theme-settings', (req, res, next) => {
  const {
    activePalette,
    appLogo,
    appBackground
  } = req.body;

  if (!activePalette || !String(activePalette).trim()) {
    return res.status(400).json({ error: 'Tema seçimi zorunludur' });
  }

  const updates = [
    ['active_palette', String(activePalette).trim()],
    ['app_logo', String(appLogo || '/nevres.png').trim()],
    ['app_background', String(appBackground || '/showroom-bg.png').trim()]
  ];

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    let completed = 0;
    let hasError = false;

    updates.forEach(([key, value]) => {
      db.run(
        `INSERT INTO ui_ayarlari (anahtar, deger)
         VALUES (?, ?)
         ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger, updated_at = CURRENT_TIMESTAMP`,
        [key, value],
        (err) => {
          if (hasError) return;
          if (err) {
            hasError = true;
            db.run('ROLLBACK');
            return next(err);
          }

          completed += 1;
          if (completed === updates.length) {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                db.run('ROLLBACK');
                return next(commitErr);
              }

              res.json({
                success: true,
                data: {
                  activePalette: String(activePalette).trim(),
                  appLogo: String(appLogo || '/nevres.png').trim(),
                  appBackground: String(appBackground || '/showroom-bg.png').trim()
                }
              });
            });
          }
        }
      );
    });
  });
});

app.get('/api/admin/order-email-settings', async (req, res, next) => {
  try {
    const settings = await loadOrderEmailSettings(false);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

app.put('/api/admin/order-email-settings', async (req, res, next) => {
  try {
    const settings = await saveOrderEmailSettings(req.body || {});
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || 'E-posta ayarları kaydedilemedi' });
  }
});

app.post('/api/admin/order-email-settings/test', async (req, res) => {
  try {
    const settings = await loadOrderEmailSettings(true);
    const testRecipient = String(req.body?.testRecipient || '').trim();
    const recipients = parseEmailList(testRecipient || settings.recipientEmails);

    if (!recipients.length) {
      return res.status(400).json({ success: false, error: 'Test alıcı e-postası zorunludur' });
    }
    if (!settings.smtpHost || !(settings.smtpUser || settings.senderEmail) || !settings.smtpPassword) {
      return res.status(400).json({ success: false, error: 'Gmail SMTP ayarları eksik' });
    }

    const content = {
      subject: 'Kartelix Gmail test',
      text: 'Kartelix sipariş e-posta ayarları başarıyla test edildi.',
      html: '<div style="font-family:Arial,sans-serif">Kartelix sipariş e-posta ayarları başarıyla test edildi.</div>'
    };

    const info = await sendSmtpMail({
      settings,
      recipients,
      subject: content.subject,
      text: content.text,
      html: content.html
    });

    res.json({
      success: true,
      data: {
        messageId: info.messageId || '',
        accepted: info.accepted || recipients,
        rejected: info.rejected || []
      }
    });
  } catch (err) {
    console.error('SMTP email test error:', err);
    const emailError = classifyEmailError(err);
    res.status(emailError.status).json({
      success: false,
      error: emailError.message,
      code: err?.code || '',
      responseCode: err?.responseCode || 0,
      stage: err?.stage || '',
      command: err?.command || '',
      response: String(err?.response || '').trim()
    });
  }
});

app.get('/api/admin/excel-settings', async (req, res, next) => {
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

app.put('/api/admin/excel-settings/poll', (req, res, next) => {
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

app.post('/api/admin/excel-sources', (req, res, next) => {
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

app.put('/api/admin/excel-sources/:id', (req, res, next) => {
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

app.delete('/api/admin/excel-sources/:id', (req, res, next) => {
  db.run(`DELETE FROM excel_kaynaklari WHERE id = ?`, [req.params.id], function(err) {
    if (err) return next(err);
    res.json({ success: true, data: { deleted: this.changes > 0 } });
  });
});

app.post('/api/admin/excel-sync/run', async (req, res) => {
  try {
    await excelSync.runNow();
    const status = await excelSync.getStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || 'Excel sync calistirilamadi' });
  }
});

app.post('/api/admin/prosesler', (req, res, next) => {
  const { ad, tip, birimMaliyet = 0, renkBazli = false, aktif = true } = req.body;
  if (!ad || !String(ad).trim()) {
    return res.status(400).json({ error: 'Proses adı zorunludur' });
  }

  db.run(
    `INSERT INTO proses_tanimlari (ad, tip, birim_maliyet, renk_bazli, aktif) VALUES (?, ?, ?, ?, ?)`,
    [String(ad).trim(), String(tip || '').trim(), Number(birimMaliyet || 0), renkBazli ? 1 : 0, aktif ? 1 : 0],
    function(err) {
      if (err) return next(err);
      res.status(201).json({ success: true, data: { id: this.lastID, ad: String(ad).trim(), tip: String(tip || '').trim(), birim_maliyet: Number(birimMaliyet || 0), renk_bazli: Boolean(renkBazli), aktif: Boolean(aktif) } });
    }
  );
});

app.put('/api/admin/prosesler/:id', (req, res, next) => {
  const { ad, tip, birimMaliyet = 0, renkBazli = false, aktif = true } = req.body;
  const id = req.params.id;

  if (!ad || !String(ad).trim()) {
    return res.status(400).json({ error: 'Proses adı zorunludur' });
  }

  db.run(
    `UPDATE proses_tanimlari
     SET ad = ?, tip = ?, birim_maliyet = ?, renk_bazli = ?, aktif = ?
     WHERE id = ?`,
    [String(ad).trim(), String(tip || '').trim(), Number(birimMaliyet || 0), renkBazli ? 1 : 0, aktif ? 1 : 0, id],
    function(err) {
      if (err) return next(err);
      res.json({
        success: true,
        data: {
          id: Number(id),
          ad: String(ad).trim(),
          tip: String(tip || '').trim(),
          birim_maliyet: Number(birimMaliyet || 0),
          renk_bazli: Boolean(renkBazli),
          aktif: Boolean(aktif)
        }
      });
    }
  );
});

app.get('/api/admin/mamuller/next-article-no/:mamulTuruId', (req, res, next) => {
  generateNextArticleNoForType(req.params.mamulTuruId, (err, data) => {
    if (err) return next(err);
    res.json({ success: true, data });
  });
});

app.get('/api/admin/mamuller', (req, res, next) => {
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

app.get('/api/admin/mamuller/:id', (req, res, next) => {
  const mamulId = req.params.id;

  loadMamulDetailByClause(`mk.id = ?`, [mamulId], (err, detail) => {
    if (err) return next(err);
    if (!detail) return res.status(404).json({ error: 'Mamul bulunamadi' });
    res.json({ success: true, data: detail });
  });
});

app.get('/api/admin/mamul-lookup', (req, res, next) => {
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

app.post('/api/admin/mamuller', (req, res, next) => {
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
          materyal_notlari, gorsel_url, vurgu_etiketi, bakim_talimatlari, bir_kg_maliyet, bir_kg_satis_fiyati, qr_slug, aktif
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
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

app.put('/api/admin/mamuller/:id', (req, res, next) => {
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

app.put('/api/admin/mamuller/:id/showcase', (req, res, next) => {
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

app.post('/api/admin/mamuller/:id/duplicate', (req, res, next) => {
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

app.get('/api/mamul-labels', (req, res, next) => {
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

  db.all(sql, params, (err, rows) => {
    if (err) return next(err);

    res.json({
      success: true,
      data: rows.map(mapMamulCard)
    });
  });
});

app.post('/api/orders', (req, res, next) => {
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

                      sendOrderEmailNotification(siparisId)
                        .then((emailStatus) => {
                          res.status(201).json({
                            success: true,
                            data: {
                              siparisId,
                              toplamTutar,
                              kalemSayisi: enrichedItems.length,
                              emailStatus
                            }
                          });
                        })
                        .catch((emailErr) => {
                          res.status(201).json({
                            success: true,
                            data: {
                              siparisId,
                              toplamTutar,
                              kalemSayisi: enrichedItems.length,
                              emailStatus: {
                                skipped: false,
                                error: emailErr.message || 'E-posta gönderilemedi'
                              }
                            }
                          });
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

app.post('/api/orders/:id/complete', async (req, res, next) => {
  const siparisId = req.params.id;

  try {
    const order = await dbGetAsync(`SELECT * FROM kartelix_orders WHERE id = ?`, [siparisId]);
    if (!order) return res.status(404).json({ success: false, error: 'Siparis bulunamadi' });

    await dbRunAsync(
      `UPDATE kartelix_orders SET durum = 'tamamlandi', tamamlandi_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [siparisId]
    );

    const settings = await loadOrderEmailSettings(true);
    const approvalRecipients = parseEmailList(settings.approvalEmails);
    let emailStatus = { skipped: true, message: 'Sipariş onay e-posta adresi tanımlı değil' };

    if (approvalRecipients.length && settings.smtpHost && (settings.smtpUser || settings.senderEmail) && settings.smtpPassword) {
      try {
        const { order: freshOrder, items } = await loadOrderForEmail(siparisId);
        const content = buildApprovalEmailContent(freshOrder, items, settings.approvalShowPrices !== false);
        const result = await sendSmtpMail({ settings, recipients: approvalRecipients, subject: content.subject, html: content.html, text: content.text });
        emailStatus = { skipped: false, message: 'Onay e-postası gönderildi', ...result };
      } catch (emailErr) {
        emailStatus = { skipped: false, error: emailErr.message || 'E-posta gonderilemedi' };
      }
    }

    res.json({ success: true, data: { siparisId: Number(siparisId), emailStatus } });
  } catch (err) {
    next(err);
  }
});

app.get('/api/orders', (req, res, next) => {
  db.all(
    `SELECT s.*,
            COUNT(sk.id) AS kalem_sayisi,
            GROUP_CONCAT(DISTINCT sk.article_code) AS article_codes,
            GROUP_CONCAT(DISTINCT sk.article_no) AS article_nos,
            GROUP_CONCAT(DISTINCT sk.mamul_adi) AS mamul_adlari
     FROM kartelix_orders s
     LEFT JOIN kartelix_order_items sk ON sk.siparis_id = s.id
     GROUP BY s.id
     ORDER BY s.id DESC`,
    [],
    (err, rows) => {
      if (err) return next(err);
      res.json({
        success: true,
        data: rows.map(mapSiparisSummary)
      });
    }
  );
});

app.get('/api/orders/:id', (req, res, next) => {
  const siparisId = req.params.id;

  db.get(`SELECT * FROM kartelix_orders WHERE id = ?`, [siparisId], (err, siparis) => {
    if (err) return next(err);
    if (!siparis) return res.status(404).json({ error: 'Siparis bulunamadi' });

    db.all(
      `SELECT * FROM kartelix_order_items WHERE siparis_id = ? ORDER BY id ASC`,
      [siparisId],
      (itemsErr, items) => {
        if (itemsErr) return next(itemsErr);

        res.json({
          success: true,
          data: {
            ...mapSiparisSummary(siparis),
            items: items.map(mapSiparisKalemi)
          }
        });
      }
    );
  });
});

app.delete('/api/orders/:id', (req, res, next) => {
  const siparisId = req.params.id;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run(`DELETE FROM kartelix_order_items WHERE siparis_id = ?`, [siparisId], (itemsErr) => {
      if (itemsErr) {
        db.run('ROLLBACK');
        return next(itemsErr);
      }

      db.run(`DELETE FROM kartelix_orders WHERE id = ?`, [siparisId], function(orderErr) {
        if (orderErr) {
          db.run('ROLLBACK');
          return next(orderErr);
        }

        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Siparis bulunamadi' });
        }

        db.run('COMMIT', (commitErr) => {
          if (commitErr) {
            db.run('ROLLBACK');
            return next(commitErr);
          }

          res.json({
            success: true,
            message: 'Sipariş silindi'
          });
        });
      });
    });
  });
});

app.put('/api/orders/:id', (req, res, next) => {
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

app.get('/api/admin/reports/overview', (req, res, next) => {
  db.serialize(() => {
    db.get(`SELECT COUNT(*) AS count FROM mamul_kartlari`, [], (mamulErr, mamulRow) => {
      if (mamulErr) return next(mamulErr);
      db.get(`SELECT COUNT(*) AS count FROM mamul_kartlari WHERE aktif = 1`, [], (activeErr, activeRow) => {
        if (activeErr) return next(activeErr);
        db.get(`SELECT COUNT(*) AS count FROM kartelix_orders`, [], (orderErr, orderRow) => {
          if (orderErr) return next(orderErr);
          db.get(`SELECT COUNT(*) AS count FROM mamul_analitikleri WHERE olay_tipi = 'public_view'`, [], (viewErr, viewRow) => {
            if (viewErr) return next(viewErr);
            db.all(
              `SELECT mk.id, mk.mamul_adi, mk.article_code, COUNT(ma.id) AS okutulma
               FROM mamul_kartlari mk
               LEFT JOIN mamul_analitikleri ma ON ma.mamul_id = mk.id AND ma.olay_tipi = 'public_view'
               GROUP BY mk.id
               ORDER BY okutulma DESC, mk.updated_at DESC
               LIMIT 5`,
              [],
              (topErr, topRows) => {
                if (topErr) return next(topErr);
                db.all(
                  `SELECT oi.mamul_id AS id, oi.mamul_adi, oi.article_code, SUM(oi.miktar_kg) AS toplam_kg
                   FROM kartelix_order_items oi
                   GROUP BY oi.mamul_id, oi.mamul_adi, oi.article_code
                   ORDER BY toplam_kg DESC
                   LIMIT 5`,
                  [],
                  (bestErr, bestRows) => {
                    if (bestErr) return next(bestErr);
                    res.json({
                      success: true,
                      data: {
                        toplamMamul: Number(mamulRow.count || 0),
                        publicAktifMamul: Number(activeRow.count || 0),
                        toplamSiparis: Number(orderRow.count || 0),
                        toplamPublicGoruntulenme: Number(viewRow.count || 0),
                        enCokOkutulanlar: topRows.map((row) => ({ ...row, okutulma: Number(row.okutulma || 0) })),
                        enCokSipariseGirenler: bestRows.map((row) => ({ ...row, toplam_kg: Number(row.toplam_kg || 0) }))
                      }
                    });
                  }
                );
              }
            );
          });
        });
      });
    });
  });
});

// --- YENİ SİPARİŞ YÖNETİMİ API ROTLARI ---

// Yeni Sipariş Oluşturma

app.post('/api/yeni-siparis', validateSiparis, (req, res, next) => {
  const { musteriAdi, ilgiliKisi, telefon, kartelalar, aciklama } = req.body;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Sipariş oluştur
    const siparisSql = `
      INSERT INTO siparisler (musteri_adi, ilgili_kisi, telefon, aciklama)
      VALUES (?, ?, ?, ?)
    `;
    
    db.run(siparisSql, [musteriAdi.trim(), ilgiliKisi?.trim() || '', telefon?.trim() || '', aciklama?.trim() || ''], 
    function(err) {
      if (err) {
        db.run('ROLLBACK');
        return next(err);
      }
      
      const siparisId = this.lastID;
      
      if (kartelalar && kartelalar.length > 0) {
        let completed = 0;
        
        kartelalar.forEach((kartela) => {
          // Kartela bilgilerini kartelalar tablosundan al
          const kartelaSql = `
            INSERT INTO siparis_kartelalari (siparis_id, kartela_kodu, mamul_adi, article_no)
            VALUES (?, ?, ?, ?)
          `;
          
          db.run(kartelaSql, [
            siparisId, 
            kartela.kod,
            kartela.mamul_adi,
            kartela.article_no
          ], function(kartelaErr) {
            if (kartelaErr) {
              console.error('Kartela ekleme hatası:', kartelaErr);
            }
            
            completed++;
            if (completed === kartelalar.length) {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  db.run('ROLLBACK');
                  return next(commitErr);
                }
                
                res.json({ 
                  success: true, 
                  data: { siparisId },
                  message: `Sipariş başarıyla oluşturuldu (${kartelalar.length} kartela eklendi)` 
                });
              });
            }
          });
        });
      } else {
        db.run('COMMIT', (commitErr) => {
          if (commitErr) {
            db.run('ROLLBACK');
            return next(commitErr);
          }
          
          res.json({ 
            success: true, 
            data: { siparisId },
            message: 'Sipariş başarıyla oluşturuldu' 
          });
        });
      }
    });
  });
});

// Sipariş Listesi
app.get('/api/siparisler', (req, res, next) => {
  const sql = `
    SELECT s.*, 
           COUNT(sk.id) as kartela_sayisi,
           GROUP_CONCAT(sk.kartela_kodu) as kartela_kodlari
    FROM siparisler s
    LEFT JOIN siparis_kartelalari sk ON s.id = sk.siparis_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) return next(err);
    
    res.json({
      success: true,
      data: {
        siparisler: rows
      }
    });
  });
});

// Sipariş Detayı
app.get('/api/siparis/:id', (req, res, next) => {
  const siparisId = req.params.id;
  
  const siparisSql = `SELECT * FROM siparisler WHERE id = ?`;
  const kartelalarSql = `SELECT * FROM siparis_kartelalari WHERE siparis_id = ?`;
  
  db.get(siparisSql, [siparisId], (err, siparis) => {
    if (err) return next(err);
    if (!siparis) return res.status(404).json({ error: 'Sipariş bulunamadı' });
    
    db.all(kartelalarSql, [siparisId], (kartelaErr, kartelalar) => {
      if (kartelaErr) return next(kartelaErr);
      
      res.json({
        success: true,
        data: {
          siparis: siparis,
          kartelalar: kartelalar
        }
      });
    });
  });
});

app.delete('/api/siparis/:id', (req, res, next) => {
  const siparisId = req.params.id;

  db.serialize(() => {
    db.run(`DELETE FROM siparis_kartelalari WHERE siparis_id = ?`, [siparisId], (childErr) => {
      if (childErr) return next(childErr);

      db.run(`DELETE FROM siparisler WHERE id = ?`, [siparisId], function(err) {
        if (err) return next(err);

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Sipariş bulunamadı' });
        }

        res.json({
          success: true,
          message: 'Sipariş başarıyla silindi'
        });
      });
    });
  });
});

// --- ETİKET ŞABLONLARI API ROTLARI ---

// Etiket şablonları - özel route'lar önce tanımlanmalı
app.get('/api/admin/label-templates/export', async (req, res, next) => {
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(`SELECT template_id, name, template_json, is_active FROM label_templates ORDER BY created_at ASC`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Aktarılacak şablon bulunamadı' });
    }

    const escapeCsvValue = (value) => {
      const text = String(value ?? '');
      if (text.includes('"') || text.includes(',') || text.includes('\n') || text.includes('\r')) {
        return '"' + text.replace(/"/g, '""') + '"';
      }
      return text;
    };

    const header = 'template_id,name,is_active,template_json';
    const body = rows.map((row) => {
      const templateJson = escapeCsvValue(row.template_json);
      return [row.template_id, row.name, row.is_active, templateJson].join(',');
    }).join('\n');

    const csv = `${header}\n${body}\n`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="label-templates.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// Aktif etiket şablonunu getir
app.get('/api/admin/label-templates/active', async (req, res, next) => {
  try {
    let row = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM label_templates WHERE is_active = 1 LIMIT 1`, [], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });

    // Aktif şablon yoksa ilk şablonu kullan ve aktif yap
    if (!row) {
      row = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM label_templates ORDER BY created_at ASC LIMIT 1`, [], (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
      if (row) {
        await new Promise((resolve, reject) => {
          db.run(`UPDATE label_templates SET is_active = 1 WHERE template_id = ?`, [row.template_id], (err) => err ? reject(err) : resolve());
        });
      }
    }

    if (!row) {
      res.json({ success: false, data: null });
    } else {
      try {
        const template = JSON.parse(row.template_json);
        res.json({ success: true, data: { id: row.template_id, name: row.name, ...template } });
      } catch {
        res.json({ success: true, data: { id: row.template_id, name: row.name } });
      }
    }
  } catch (err) {
    next(err);
  }
});

// Tüm etiket şablonlarını getir
app.get('/api/admin/label-templates', async (req, res, next) => {
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(`SELECT id, template_id, name, is_active FROM label_templates ORDER BY created_at ASC`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// Belirli bir etiket şablonunu getir
app.get('/api/admin/label-templates/:templateId', async (req, res, next) => {
  const { templateId } = req.params;
  try {
    const row = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM label_templates WHERE template_id = ? LIMIT 1`, [templateId], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
    if (!row) {
      return res.status(404).json({ success: false, error: 'Şablon bulunamadı' });
    }
    try {
      const template = JSON.parse(row.template_json);
      res.json({ success: true, data: { ...template, id: row.template_id } });
    } catch {
      res.json({ success: true, data: { id: row.template_id, name: row.name } });
    }
  } catch (err) {
    next(err);
  }
});

// Etiket şablonu oluştur/güncelle
app.post('/api/admin/label-templates', async (req, res, next) => {
  const { templateId, name, template, setActive } = req.body;

  if (!template) {
    return res.status(400).json({ error: 'Şablon verisi zorunludur' });
  }

  const resolvedTemplateId = templateId || `template-${Date.now()}`;

  try {
    await new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO label_templates (template_id, name, template_json, is_active)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(template_id) DO UPDATE SET
          name = excluded.name,
          template_json = excluded.template_json,
          is_active = excluded.is_active,
          updated_at = CURRENT_TIMESTAMP
      `;
      const resolvedName = String(name || '').trim() || `Şablon ${Date.now()}`;
      db.run(sql, [resolvedTemplateId, resolvedName, JSON.stringify(template), setActive ? 1 : 0], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (setActive) {
      await new Promise((resolve, reject) => {
        db.run(`UPDATE label_templates SET is_active = 0 WHERE template_id != ?`, [resolvedTemplateId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json({ success: true, data: { templateId: resolvedTemplateId, name: String(name || '').trim() || `Şablon ${Date.now()}` } });
  } catch (err) {
    next(err);
  }
});

// Etiket şablonu sil
app.delete('/api/admin/label-templates/:templateId', async (req, res, next) => {
  const { templateId } = req.params;

  try {
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM label_templates WHERE template_id = ?`, [templateId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});
const parseLabelTemplateCsv = (rawText) => {
  const lines = rawText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const rows = [];
  let header = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!header) {
      header = line.split(',').map((part) => part.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      continue;
    }

    const match = line.match(/^(("[^"]*(?:""[^"]*)*")|[^,]*)(?:,|$)/);
    if (!match || match.index !== 0) continue;

    const first = match[1].replace(/^"|"$/g, '').replace(/""/g, '"');
    const afterFirst = line.slice(match[0].length);

    const secondMatch = afterFirst.match(/^(("[^"]*(?:""[^"]*)*")|[^,]*)(?:,|$)/);
    const second = secondMatch ? secondMatch[1].replace(/^"|"$/g, '').replace(/""/g, '"') : '';

    const afterSecond = secondMatch ? afterFirst.slice(secondMatch[0].length) : afterFirst;
    const thirdMatch = afterSecond.match(/^(("[^"]*(?:""[^"]*)*")|[^,]*)(?:,|$)/);
    const third = thirdMatch ? thirdMatch[1].replace(/^"|"$/g, '').replace(/""/g, '"') : '';

    const fourth = afterSecond.slice(thirdMatch ? thirdMatch[0].length : 0).replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"');

    rows.push({
      template_id: first,
      name: second,
      is_active: third,
      template_json: fourth,
    });
  }

  return rows;
};

app.post('/api/admin/label-templates/import', express.text({ type: 'text/csv', limit: '2mb' }), async (req, res, next) => {
  try {
    const raw = String(req.body || '').trim();
    if (!raw) {
      return res.status(400).json({ success: false, error: 'CSV içeriği boş' });
    }

    const rows = parseLabelTemplateCsv(raw);
    const imported = [];
    const skipped = [];
    let activatedId = null;

    for (const row of rows) {
      const templateId = String(row.template_id || '').trim();
      const name = String(row.name || 'Şablon').trim();
      const isActive = String(row.is_active || '0').trim() !== '0';
      const templateJson = String(row.template_json || '').trim();

      if (!templateId) {
        skipped.push({ reason: 'template_id eksik', row });
        continue;
      }

      let templateData = { name, template_json: templateJson };
      try {
        if (templateJson) {
          const parsed = JSON.parse(templateJson);
          templateData = { name, template_json: JSON.stringify(parsed) };
        }
      } catch {
        skipped.push({ reason: 'template_json geçersiz', template_id: templateId });
      }

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO label_templates (template_id, name, template_json, is_active)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(template_id) DO UPDATE SET
             name = excluded.name,
             template_json = excluded.template_json,
             updated_at = CURRENT_TIMESTAMP`,
          [templateId, name, templateData.template_json, isActive ? 1 : 0],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      imported.push({ template_id: templateId, name });

      if (isActive) {
        activatedId = templateId;
      }
    }

    if (activatedId) {
      await new Promise((resolve, reject) => {
        db.run(`UPDATE label_templates SET is_active = 0 WHERE template_id != ?`, [activatedId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json({
      success: true,
      data: {
        importedCount: imported.length,
        skippedCount: skipped.length,
        templates: imported,
        skipped,
      }
    });
  } catch (err) {
    next(err);
  }
});

// --- ETİKET AYARLARI API ROTLARI ---

// Etiket ayarlarını getir
app.get('/api/etiket-ayarlari', (req, res, next) => {
  db.all(
    `SELECT * FROM etiket_ayarlari ORDER BY sira_no ASC`, 
    [], 
    (err, rows) => {
      if (err) return next(err);
      
      res.json({
        success: true,
        data: rows
      });
    }
  );
});

// Etiket ayarlarını güncelle
app.put('/api/etiket-ayarlari', (req, res, next) => {
  const { ayarlar } = req.body;
  
  if (!Array.isArray(ayarlar)) {
    return res.status(400).json({ error: 'Geçersiz ayar formatı' });
  }
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Önce tüm ayarları resetle
    db.run(`UPDATE etiket_ayarlari SET sira_no = NULL, aktif = 0`);
    
    let completed = 0;
    ayarlar.forEach((ayar, index) => {
      db.run(
        `UPDATE etiket_ayarlari SET sira_no = ?, aktif = ? WHERE alan_adi = ?`,
        [index + 1, ayar.aktif ? 1 : 0, ayar.alan_adi],
        function(err) {
          if (err) console.error('Ayar güncelleme hatası:', err);
          
          completed++;
          if (completed === ayarlar.length) {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                db.run('ROLLBACK');
                return next(commitErr);
              }
              
              res.json({
                success: true,
                message: 'Etiket ayarları başarıyla güncellendi'
              });
            });
          }
        }
      );
    });
  });
});

// --- KARTELALAR API ROTLARI ---

// Kartela oluştur
app.post('/api/kartelalar', (req, res, next) => {
  const { kod, mamul_adi, tip, kompozisyon, en, gramaj, prefix } = req.body;
  
  if (!kod || kod.trim().length === 0) {
    return res.status(400).json({ error: 'Kartela kodu zorunludur' });
  }
  
  if (!mamul_adi || mamul_adi.trim().length === 0) {
    return res.status(400).json({ error: 'Mamul adı zorunludur' });
  }

  // Benzersiz article_no oluştur
  const tarih = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const selectedPrefix = prefix || 'PRD';
  
  db.get(
    `SELECT COUNT(*) AS count FROM kartelalar WHERE article_no LIKE ?`,
    [`${selectedPrefix}-${tarih}-%`],
    (err, row) => {
      if (err) return next(err);
      
      const count = row.count + 1;
      const articleNo = `${selectedPrefix}-${tarih}-${String(count).padStart(5, '0')}`;
      
      // Kartelayı kaydet
      db.run(
        `INSERT INTO kartelalar (kod, mamul_adi, tip, kompozisyon, en, gramaj, article_no) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [kod.trim(), mamul_adi.trim(), tip?.trim() || '', kompozisyon?.trim() || '', 
         en?.trim() || '', gramaj?.trim() || '', articleNo],
        function(err) {
          if (err) return next(err);
          
          res.json({
            success: true,
            data: { 
              id: this.lastID,
              articleNo: articleNo
            },
            message: 'Kartela başarıyla oluşturuldu'
          });
        }
      );
    }
  );
});

// Kartela listesi
app.get('/api/kartelalar', (req, res, next) => {
  const { search, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  
  let sql = `SELECT * FROM kartelalar`;
  let countSql = `SELECT COUNT(*) as total FROM kartelalar`;
  let params = [];
  
  if (search && search.trim().length > 0) {
    const searchTerm = `%${search.trim()}%`;
    sql += ` WHERE kod LIKE ? OR mamul_adi LIKE ? OR article_no LIKE ?`;
    countSql += ` WHERE kod LIKE ? OR mamul_adi LIKE ? OR article_no LIKE ?`;
    params = [searchTerm, searchTerm, searchTerm];
  }
  
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  
  db.get(countSql, params, (countErr, countRow) => {
    if (countErr) return next(countErr);
    
    db.all(sql, [...params, limit, offset], (err, rows) => {
      if (err) return next(err);
      
      res.json({
        success: true,
        data: {
          kartelalar: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countRow.total,
            totalPages: Math.ceil(countRow.total / limit)
          }
        }
      });
    });
  });
});

// Kartela detayı
app.get('/api/kartelalar/:id', (req, res, next) => {
  const kartelaId = req.params.id;
  
  db.get(
    `SELECT * FROM kartelalar WHERE id = ?`,
    [kartelaId],
    (err, row) => {
      if (err) return next(err);
      
      if (!row) {
        return res.status(404).json({ error: 'Kartela bulunamadı' });
      }
      
      res.json({
        success: true,
        data: row
      });
    }
  );
});

// Kartela sil
app.delete('/api/kartelalar/:id', (req, res, next) => {
  const kartelaId = req.params.id;
  
  db.run(
    `DELETE FROM kartelalar WHERE id = ?`,
    [kartelaId],
    function(err) {
      if (err) return next(err);
      
      res.json({
        success: true,
        message: 'Kartela başarıyla silindi'
      });
    }
  );
});

// --- PREFIX AYARLARI API ROTLARI ---

// Prefix ayarlarını getir
app.get('/api/prefix-ayarlari', (req, res, next) => {
  db.all(
    `SELECT * FROM prefix_ayarlari ORDER BY prefix ASC`, 
    [], 
    (err, rows) => {
      if (err) return next(err);
      
      res.json({
        success: true,
        data: rows
      });
    }
  );
});

// Yeni prefix ekle
app.post('/api/prefix-ayarlari', (req, res, next) => {
  const { prefix, aciklama } = req.body;
  
  if (!prefix || prefix.trim().length === 0) {
    return res.status(400).json({ error: 'Prefix zorunludur' });
  }
  
  db.run(
    `INSERT INTO prefix_ayarlari (prefix, aciklama) VALUES (?, ?)`,
    [prefix.trim().toUpperCase(), aciklama?.trim() || ''],
    function(err) {
      if (err) return next(err);
      
      res.json({
        success: true,
        data: { id: this.lastID },
        message: 'Prefix başarıyla eklendi'
      });
    }
  );
});

// Prefix sil
app.delete('/api/prefix-ayarlari/:id', (req, res, next) => {
  const prefixId = req.params.id;
  
  db.run(
    `DELETE FROM prefix_ayarlari WHERE id = ?`,
    [prefixId],
    function(err) {
      if (err) return next(err);
      
      res.json({
        success: true,
        message: 'Prefix başarıyla silindi'
      });
    }
  );
});

// Prefix güncelle
app.put('/api/prefix-ayarlari/:id', (req, res, next) => {
  const prefixId = req.params.id;
  const { prefix, aciklama } = req.body;
  
  if (!prefix || prefix.trim().length === 0) {
    return res.status(400).json({ error: 'Prefix zorunludur' });
  }
  
  db.run(
    `UPDATE prefix_ayarlari SET prefix = ?, aciklama = ? WHERE id = ?`,
    [prefix.trim().toUpperCase(), aciklama?.trim() || '', prefixId],
    function(err) {
      if (err) return next(err);
      
      res.json({
        success: true,
        message: 'Prefix başarıyla güncellendi'
      });
    }
  );
});
// --- SİPARİŞ İÇİN KARTELA ARAMA API ROTLARI ---

// Siparişe kartela eklemek için arama
app.get('/api/siparis-kartela-ara', (req, res, next) => {
  const term = req.query.term ? String(req.query.term).trim() : '';
  
  if (term.length < 2) {
    return res.json({ 
      success: true, 
      data: { kartelalar: [] },
      message: 'Arama için en az 2 karakter girin'
    });
  }

  const searchTerm = `%${term}%`;
  const sql = `
    SELECT id, kod, mamul_adi, tip, article_no
    FROM kartelalar
    WHERE kod LIKE ? OR mamul_adi LIKE ? OR article_no LIKE ?
    ORDER BY 
      CASE 
        WHEN kod LIKE ? THEN 1
        WHEN mamul_adi LIKE ? THEN 2
        ELSE 3
      END
    LIMIT 20
  `;
  
  db.all(sql, [searchTerm, searchTerm, searchTerm, `%${term}%`, `%${term}%`], (err, rows) => {
    if (err) return next(err);
    
    res.json({ 
      success: true, 
      data: { kartelalar: rows } 
    });
  });
});

// QR kod ile kartela bulma (sipariş için)
app.get('/api/siparis-kartela/:kod', (req, res, next) => {
  const kartelaKod = req.params.kod;
  
  db.get(
    `SELECT id, kod, mamul_adi, tip, article_no 
     FROM kartelalar 
     WHERE kod = ?`,
    [kartelaKod],
    (err, row) => {
      if (err) return next(err);
      
      if (!row) {
        return res.status(404).json({ 
          success: false, 
          error: 'Kartela bulunamadı' 
        });
      }
      
      res.json({
        success: true,
        data: row
      });
    }
  );
});

// Benzersiz kartela kodu kontrolü
app.get('/api/kartela-kodu-kontrol/:kod', (req, res, next) => {
  const kartelaKod = req.params.kod;
  
  db.get(
    `SELECT COUNT(*) as count FROM kartelalar WHERE kod = ?`,
    [kartelaKod],
    (err, row) => {
      if (err) return next(err);
      
      res.json({
        success: true,
        data: {
          mevcut: row.count > 0,
          mesaj: row.count > 0 ? 'Bu kartela kodu zaten mevcut' : 'Kod kullanılabilir'
        }
      });
    }
  );
});
// --- EMAIL GÖNDERME API ROTU ---

app.post('/api/siparis-email-gonder', async (req, res) => {
  const { siparisId, email } = req.body;

  try {
    const result = await sendOrderEmailNotification(siparisId, email);
    res.json({
      success: true,
      message: result.message || 'Email başarıyla gönderildi',
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Email gönderilemedi'
    });
  }
});

app.get('/api/stats', (req, res, next) => {
  const stats = {
    totalSiparis: 0,
    totalFirma: 0,
    totalMamul: 0,
    totalKullanici: 0
  };

  db.serialize(() => {
    db.get(`SELECT COUNT(*) AS count FROM kartelix_orders`, [], (err, row) => {
      if (err) return next(err);
      stats.totalSiparis = row?.count || 0;

      db.get(`SELECT COUNT(*) AS count FROM firmalar`, [], (firmaErr, firmaRow) => {
        if (firmaErr) return next(firmaErr);
        stats.totalFirma = firmaRow?.count || 0;

        db.get(`SELECT COUNT(*) AS count FROM mamul_kartlari`, [], (mamulErr, mamulRow) => {
          if (mamulErr) return next(mamulErr);
          stats.totalMamul = mamulRow?.count || 0;

          db.get(`SELECT COUNT(*) AS count FROM kullanicilar`, [], (userErr, userRow) => {
            if (userErr) return next(userErr);
            stats.totalKullanici = userRow?.count || 0;

            res.json(stats);
          });
        });
      });
    });
  });
});

app.post('/api/backup', (req, res, next) => {
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

app.post('/api/clean-database', (req, res, next) => {
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

// --- QR KOD API ROTLARI ---

// QR koddan mamül bilgisi getir
app.get('/api/qr-scan/:kod', (req, res, next) => {
  const qrKod = req.params.kod;
  
  // Önce mamuller tablosunda ara
  db.get(
    `SELECT kod, ad, tip, stok FROM mamuller WHERE kod = ?`,
    [qrKod],
    (err, mamul) => {
      if (err) return next(err);
      
      if (mamul) {
        return res.json({
          success: true,
          data: {
            tip: 'mamul',
            ...mamul
          }
        });
      }
      
      // Mamul bulunamazsa, kartela kodlarına bak
      db.get(
        `SELECT kartela_kodu, mamul_adi, article_no FROM siparis_kartelalari WHERE kartela_kodu = ?`,
        [qrKod],
        (kartelaErr, kartela) => {
          if (kartelaErr) return next(kartelaErr);
          
          if (kartela) {
            return res.json({
              success: true,
              data: {
                tip: 'kartela',
                ...kartela
              }
            });
          }
          
          res.status(404).json({
            success: false,
            error: 'QR kod ile eşleşen kayıt bulunamadı'
          });
        }
      );
    }
  );
});


// --- GENEL AYARLAR ---
const defaultGenelAyarlar = { publicProsesGoster: false, publicFiyatGoster: false, publicHikayeGoster: true };

app.get('/api/genel-ayarlar', async (req, res, next) => {
  try {
    const row = await dbGetAsync('SELECT deger FROM ui_ayarlari WHERE anahtar = ?', ['genel_ayarlar']);
    const parsed = row ? JSON.parse(row.deger || '{}') : {};
    res.json({ success: true, data: { ...defaultGenelAyarlar, ...parsed } });
  } catch (err) { next(err); }
});

app.put('/api/genel-ayarlar', async (req, res, next) => {
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
        database: 'disconnected' 
      });
    }
    
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString()
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

app.post('/api/admin/mamuller/:id/gorsel', gorselUpload.single('gorsel'), (req, res, next) => {
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

app.delete('/api/admin/mamuller/:id/gorsel', (req, res, next) => {
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

// Excel klasor senkronizasyonu (ayarlar ekranindaki kaynak tanimlarina gore dosya okur)
const excelInboxDir = process.env.EXCEL_INBOX_DIR || path.join(__dirname, '..', 'xls');
const excelPollMs = Number(process.env.EXCEL_POLL_MS || 60_000);
const excelPreviewLimit = Number(process.env.EXCEL_PREVIEW_LIMIT || 50);
const excelSync = startExcelSync({
  db,
  directory: excelInboxDir,
  defaultIntervalMs: excelPollMs,
  previewLimit: excelPreviewLimit
});

app.get('/api/excel-sync/status', async (req, res) => {
  try {
    const status = await excelSync.getStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || 'Excel sync status alinamadi' });
  }
});

app.get('/api/excel-sync/latest', async (req, res) => {
  try {
    const snapshot = await excelSync.getLatestSnapshot();
    res.json({ success: true, data: snapshot });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || 'Excel snapshot alinamadi' });
  }
});

// Kaynak tipine bagli dosyayi tekrar parse ederek satir dondurur (limit verilmezse tum sheet)
app.get('/api/excel-sync/parse', async (req, res) => {
  try {
    const sourceType = req.query.sourceType ? String(req.query.sourceType) : '';
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const parsed = await excelSync.parseFileBySource(sourceType, limit);
    if (!parsed) {
      return res.status(404).json({ success: false, error: 'Okunacak excel kaynagi bulunamadi' });
    }
    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || 'Excel parse basarisiz' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ ARKA PLAN İŞLEMLERİ DEVREDE: http://localhost:${PORT}`);
  console.log(`✅ Yeni özellikler aktif:`);
  console.log(`   📦 Sipariş yönetimi API'leri`);
  console.log(`   🏷️ Etiket ayarları API'leri`);
  console.log(`   🔤 Prefix ayarları API'leri`);
  console.log(`   📧 Email gönderme API'leri`);
  console.log(`   📱 QR kod okuma API'leri`);
  console.log(`   📊 Excel sync: ${excelInboxDir} (poll: ${excelPollMs}ms)`);
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
