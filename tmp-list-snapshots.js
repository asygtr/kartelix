const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(process.cwd(), 'database', 'showroom.db'));

db.all(`SELECT id, file_path, file_mtime_ms, file_size, created_at, summary_json
        FROM excel_snapshots ORDER BY id DESC LIMIT 20`, [], (err, rows) => {
  if (err) { console.error(err); db.close(); process.exit(1); }
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
