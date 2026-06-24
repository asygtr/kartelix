const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const sqlite3 = require('sqlite3');
const { importUrgeWorkbook } = require('./server/excelSync');

(async () => {
  try {
    const src = path.join(process.cwd(), 'xls', 'ÜRGE FİYAT 10100 SÜPREM.xlsm');
    if (!fs.existsSync(src)) { console.error('source missing'); process.exit(2); }
    const tmpFile = path.join(process.cwd(), 'xls', 'TMP_TEST_99998.xlsm');
    fs.copyFileSync(src, tmpFile);

    const wb = XLSX.readFile(tmpFile, { cellDates: true, cellFormula: true });
    const sheetName = wb.SheetNames.includes('SIRA LİSTESİ') ? 'SIRA LİSTESİ' : wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const nextRow = range.e.r + 2; // +1 for 1-based, +1 to append

    sheet[`D${nextRow}`] = { t: 's', v: '99998' };
    sheet[`N${nextRow}`] = { t: 's', v: 'AUTO_TEST_PRODUCT' };
    // ensure ref covers new row
    sheet['!ref'] = XLSX.utils.encode_range({s:range.s, e:{r:range.e.r+1, c: range.e.c}});
    XLSX.writeFile(wb, tmpFile, { bookType: 'xlsm' });

    const dbPath = path.join(process.cwd(), 'database', 'showroom.db');
    const db = new sqlite3.Database(dbPath);

    const workbook = XLSX.readFile(tmpFile, { cellDates: true, cellFormula: true });
    const result = await importUrgeWorkbook(db, { filePath: tmpFile, fileName: path.basename(tmpFile) }, workbook, 'SIRA LİSTESİ');
    console.log('IMPORT RESULT', result);

    db.get('SELECT id,mamul_adi,article_no,article_code,renk,excel_kaynak_dosyasi,excel_satir_no FROM mamul_kartlari WHERE article_no = ?', ['99998'], (err,row)=>{
      if (err) console.error('ERR',err);
      else console.log('DB ROW FOR 99998:', row);
      db.close();
    });
  } catch (e) { console.error(e); process.exit(1); }
})();
