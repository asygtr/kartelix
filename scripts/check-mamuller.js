const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'database', 'showroom.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open DB', dbPath, err.message);
    process.exit(1);
  }
});

const articles = ['80116','80115','80202','80111','80113','80114'];
const placeholders = articles.map(() => '?').join(',');
const sql = `SELECT id, mamul_adi, article_no, article_code, excel_kaynak_dosyasi, excel_satir_no, aktif FROM mamul_kartlari WHERE article_no IN (${placeholders}) OR article_code IN (${placeholders})`;

db.all(sql, [...articles, ...articles], (err, rows) => {
  if (err) {
    console.error('Query error', err.message);
    process.exit(2);
  }
  if (!rows || rows.length === 0) {
    console.log('No matching records found for articles:', articles.join(', '));
  } else {
    console.log('Found', rows.length, 'records:');
    for (const r of rows) {
      console.log(JSON.stringify(r));
    }
  }
  db.close();
});
