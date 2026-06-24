const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dir = path.join(process.cwd(), 'xls');
if (!fs.existsSync(dir)) {
  console.error('xls directory not found');
  process.exit(1);
}

const files = fs.readdirSync(dir).filter(f => /\.xlsm?$|\.xlsx$/i.test(f));
const needle = '80203';
let found = false;
for (const f of files) {
  const filePath = path.join(dir, f);
  try {
    const wb = XLSX.readFile(filePath, { cellDates: true, cellFormula: true });
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      for (const addr of Object.keys(sheet)) {
        if (!addr.match(/^[A-Z]+\d+$/)) continue;
        const cell = sheet[addr];
        if (!cell || cell.v === undefined || cell.v === null) continue;
        const text = String(cell.v).trim();
        if (text.includes(needle)) {
          console.log(`FOUND ${needle} in file=${f} sheet=${sheetName} cell=${addr} value="${text}"`);
          found = true;
        }
      }
    }
  } catch (err) {
    console.error('ERR reading', f, err.message);
  }
}
if (!found) console.log('NOT FOUND');
