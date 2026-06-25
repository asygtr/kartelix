const fs = require('fs');
const os = require('os');
const path = require('path');
const XLSX = require('xlsx');
const { getFileFingerprint, hasFileChanged, findHeaderColumn, resolveUrgeArticleNumber } = require('../excelSync');

describe('excel sync change detection', () => {
  it('detects content changes even when mtime stays the same', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'excel-sync-'));
    const filePath = path.join(tempDir, 'sample.xlsm');

    fs.writeFileSync(filePath, 'first-version');
    const firstFingerprint = await getFileFingerprint(filePath);

    fs.writeFileSync(filePath, 'second-version');

    const changed = await hasFileChanged(filePath, firstFingerprint);
    expect(changed).toBe(true);
  });

  it('finds article and product headers from worksheet row', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['ignore', 'ignore'],
      ['ARTICLE NO', 'PRODUCT', 'COLOR']
    ]);

    expect(findHeaderColumn(sheet, 2, ['article no', 'article_no', 'article'])).toBe('A');
    expect(findHeaderColumn(sheet, 2, ['product', 'urun', 'urun_adi'])).toBe('B');
  });

  it('preserves 5-digit URGE article numbers even when file prefix differs', () => {
    expect(resolveUrgeArticleNumber('89999', '80')).toBe('89999');
    expect(resolveUrgeArticleNumber('999', '80')).toBe('80999');
  });
});
