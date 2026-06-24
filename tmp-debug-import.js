const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const { importUrgeWorkbook } = require('./server/excelSync');
const XLSX = require('xlsx');

(async () => {
  try {
    const fileName = 'ÜRGE FİYAT 10100 SÜPREM.xlsm';
    const filePath = path.join(process.cwd(), 'xls', fileName);
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      process.exit(2);
    }

    const workbook = XLSX.readFile(filePath, { cellDates: true, cellFormula: true });
    const defaultDbPath = path.join(process.cwd(), 'database', 'showroom.db');
    let dbPath;
    if (fs.existsSync(defaultDbPath)) {
      dbPath = defaultDbPath;
      console.log('Using existing DB:', dbPath);
    } else {
      dbPath = path.join(process.cwd(), 'tmp-debug-import.sqlite');
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      console.log('Using temporary DB:', dbPath);
    }
    const db = new sqlite3.Database(dbPath);

    const result = await importUrgeWorkbook(db, { filePath, fileName }, workbook, 'SIRA LİSTESİ');

    console.log('IMPORT RESULT:\n', JSON.stringify(result, null, 2));

    // show last 20 rows of mamul_kartlari
    db.all('SELECT id, mamul_adi, article_no, article_code, renk, excel_kaynak_dosyasi, excel_satir_no, updated_at FROM mamul_kartlari ORDER BY id DESC LIMIT 20', (err, rows) => {
      if (err) { console.error('DB ERR', err); db.close(); process.exit(1); }
      console.log('LAST MAMUL ROWS:', rows);
      db.close();
    });
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
