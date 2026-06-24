const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database/showroom.db');

db.all('SELECT id, file_path, file_mtime_ms, file_size, created_at, summary_json FROM excel_snapshots ORDER BY id DESC LIMIT 10', (err, rows) => {
  if (err) { console.error(err); process.exit(1); }
  rows.forEach((r) => {
    console.log('---');
    console.log('id:', r.id, 'file_path:', r.file_path, 'created_at:', r.created_at, 'size:', r.file_size, 'mtime:', r.file_mtime_ms);
    try { const s = JSON.parse(r.summary_json || '{}'); console.log('summary:', s.sheetNames ? s.sheetNames : s); } catch { console.log('summary parse error'); }
  });
  db.close();
});
