const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { startExcelSync } = require('../server/excelSync');

(async () => {
  const dbPath = path.join(__dirname, '..', 'database', 'showroom.db');
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('Failed to open DB', dbPath, err.message);
      process.exit(1);
    }
  });

  const excelDir = path.join(__dirname, '..', 'xls');
  const excelSync = startExcelSync({ db, directory: excelDir, defaultIntervalMs: 60000, previewLimit: 50 });

  try {
    console.log('Running excel sync now...');
    await excelSync.runNow();
    console.log('RunNow complete, fetching latest snapshot/status...');
    const status = await excelSync.getStatus();
    console.log('Status:', JSON.stringify(status, null, 2));
  } catch (e) {
    console.error('Error running excel sync:', e?.message || e);
  } finally {
    try { excelSync.stop(); } catch (e) {}
    db.close();
  }
})();
