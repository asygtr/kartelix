const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { findHeaderColumn } = require('./server/excelSync');

const fileName = 'ÜRGE FİYAT 10100 SÜPREM.xlsm';
const filePath = path.join(process.cwd(), 'xls', fileName);
if (!fs.existsSync(filePath)) { console.error('No file', filePath); process.exit(2); }
const wb = XLSX.readFile(filePath, { cellDates: true, cellFormula: true });
const sheetName = wb.SheetNames.includes('SIRA LİSTESİ') ? 'SIRA LİSTESİ' : wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
console.log('Sheet:', sheetName);

const headerRowNumber = 2;
const articleColumn = findHeaderColumn(sheet, headerRowNumber, ['article no','article_no','articleno','article']);
const productColumn = findHeaderColumn(sheet, headerRowNumber, ['product','urun','urun_adi','mamul']);
console.log('Detected articleColumn:', articleColumn || '(null)');
console.log('Detected productColumn:', productColumn || '(null)');

const cellValue = (sheet, address, fallback='') => {
  const cell = sheet?.[address];
  return cell && cell.v !== undefined && cell.v !== null ? cell.v : fallback;
};
const compactText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

console.log('Sample rows:');
for (let r=3; r<=12; r++){
  const aAddr = articleColumn ? `${articleColumn}${r}` : `D${r}`;
  const pAddr = productColumn ? `${productColumn}${r}` : `N${r}`;
  console.log(r, { articleCell: aAddr, article: compactText(cellValue(sheet,aAddr,'')), productCell: pAddr, product: compactText(cellValue(sheet,pAddr,'')) });
}

// show header row cells
const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
let headers = [];
for (let c=range.s.c; c<=range.e.c; c++){
  const addr = XLSX.utils.encode_cell({r: headerRowNumber-1, c});
  const val = sheet[addr] ? sheet[addr].v : '';
  headers.push({col: XLSX.utils.encode_col(c), val: String(val || '').trim()});
}
console.log('Headers (row 2):', headers.filter(h=>h.val));
