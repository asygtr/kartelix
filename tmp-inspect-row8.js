const XLSX = require('xlsx');
const path = require('path');
const file = path.join(process.cwd(), 'xls', 'ÜRGE FİYAT 80100 BASKILI.xlsm');
const wb = XLSX.readFile(file, { cellDates: true, cellFormula: true });
const sheet = wb.Sheets['SIRA LİSTESİ'];
const compactText = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const cellValue = (address) => {
  const c = sheet[address];
  return c && c.v !== undefined && c.v !== null ? c.v : '';
};
const normalize = (v) => String(v || '').trim().toLowerCase()
  .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const findHeaderColumn = (rowNumber, candidates) => {
  const normalizedCandidates = candidates.map(normalize);
  if (sheet['!ref']) {
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: colIndex });
      const value = cellValue(address);
      if (normalizedCandidates.includes(normalize(value))) {
        return XLSX.utils.encode_col(colIndex);
      }
    }
  }
  return null;
};
const articleColumn = findHeaderColumn(2, ['article no', 'article_no', 'articleno', 'article']);
const productColumn = findHeaderColumn(2, ['product', 'urun', 'urun_adi', 'mamul']);
const row = 8;
const articleAddress = articleColumn ? `${articleColumn}${row}` : '';
const productAddress = productColumn ? `${productColumn}${row}` : '';
const article = compactText(cellValue(articleAddress));
const product = compactText(cellValue(productAddress));
console.log(JSON.stringify({ row, articleColumn, productColumn, articleAddress, article, product, articleValid: !!article && /\d+/.test(article), productPresent: !!product }, null, 2));
