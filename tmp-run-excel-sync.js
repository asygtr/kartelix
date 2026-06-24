const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { startExcelSync } = require('./server/excelSync');

(async () => {
  const db = new sqlite3.Database(path.join(process.cwd(), 'database', 'showroom.db'));
  const sync = startExcelSync({
    db,
    directory: path.join(process.cwd(), 'xls'),
    defaultIntervalMs: 5_000,
    previewLimit: 5
  });

  await sync.runNow();
  const status = await sync.getStatus();
  console.log(JSON.stringify(status, null, 2));
  db.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
