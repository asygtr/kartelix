const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database/showroom.db');

db.get("SELECT COUNT(*) AS c FROM mamul_kartlari WHERE excel_kaynak_dosyasi = ?", ['ÜRGE FİYAT 10100 SÜPREM.xlsm'], (err, row) => {
  if (err) {
    console.error('ERR', err);
    process.exit(1);
  }
  console.log('count:', row.c);
  db.close();
});
