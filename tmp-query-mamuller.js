const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(process.cwd(), 'database', 'showroom.db'));
const articleNumbers = ['10100', '10101', '10102'];

const placeholders = articleNumbers.map(() => '?').join(', ');
db.all(`SELECT id, article_no, article_code, mamul_adi, updated_at FROM mamul_kartlari WHERE article_no IN (${placeholders}) ORDER BY id DESC`, articleNumbers, (err, rows) => {
  if (err) {
    console.error(err);
    db.close();
    process.exit(1);
  }
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
