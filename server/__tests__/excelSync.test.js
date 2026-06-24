const fs = require('fs');
const os = require('os');
const path = require('path');
const { getFileFingerprint, hasFileChanged } = require('../excelSync');

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
});
