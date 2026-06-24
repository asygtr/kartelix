const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(process.cwd(), 'database', 'showroom.db'));
const article = '80203';

db.all(`SELECT id, article_no, article_code, mamul_adi, updated_at FROM mamul_kartlari WHERE article_no = ? OR article_code = ?`, [article, article], (err, rows) => {
  if (err) {
    console.error('ERROR', err.message || err);
    db.close();
    process.exit(1);
  }
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
