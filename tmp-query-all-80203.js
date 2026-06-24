const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(process.cwd(),'database','showroom.db'));

const q = `SELECT id, article_no, article_code, mamul_adi, excel_kaynak_dosyasi, excel_satir_no, excel_formul_json
FROM mamul_kartlari
WHERE article_no LIKE '%80203%' OR article_code LIKE '%80203%'
   OR mamul_adi LIKE '%80203%' OR qr_slug LIKE '%80203%' OR excel_formul_json LIKE '%80203%'
LIMIT 100`;

db.all(q, [], (err, rows) => {
  if (err) { console.error(err); db.close(); process.exit(1); }
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
