const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const { importUrgeWorkbook } = require('./server/excelSync');
const filePath = path.join(process.cwd(), 'xls', 'ÜRGE FİYAT 10100 SÜPREM.xlsm');
const workbook = require('xlsx').readFile(filePath, { cellDates: true, cellFormula: true });
const dbPath = path.join(process.cwd(), 'tmp-debug.sqlite');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
const db = new sqlite3.Database(dbPath);
(async () => {
  const result = await importUrgeWorkbook(db, { filePath, fileName: path.basename(filePath) }, workbook, 'SIRA LİSTESİ');
  console.log(JSON.stringify(result, null, 2));
  db.close();
})();
