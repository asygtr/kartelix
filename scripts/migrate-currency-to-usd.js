const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'database', 'showroom.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) { console.error('DB açılamadı:', err.message); process.exit(1); }
});

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  db.run(
    `UPDATE mamul_kartlari SET para_birimi = 'USD' WHERE para_birimi = 'TRY' OR para_birimi IS NULL OR para_birimi = ''`,
    function(err) {
      if (err) { db.run('ROLLBACK'); console.error('mamul_kartlari hatası:', err.message); process.exit(1); }
      console.log(`mamul_kartlari: ${this.changes} kayıt güncellendi`);
    }
  );

  db.run(
    `UPDATE kartelix_orders SET para_birimi = 'USD' WHERE para_birimi = 'TRY' OR para_birimi IS NULL OR para_birimi = ''`,
    function(err) {
      if (err) { db.run('ROLLBACK'); console.error('kartelix_orders hatası:', err.message); process.exit(1); }
      console.log(`kartelix_orders: ${this.changes} kayıt güncellendi`);
    }
  );

  db.run(
    `UPDATE siparisler SET para_birimi = 'USD' WHERE para_birimi = 'TRY' OR para_birimi IS NULL OR para_birimi = ''`,
    function(err) {
      if (err) { db.run('ROLLBACK'); console.error('siparisler hatası:', err.message); process.exit(1); }
      console.log(`siparisler: ${this.changes} kayıt güncellendi`);
    }
  );

  db.run('COMMIT', (err) => {
    if (err) { console.error('COMMIT hatası:', err.message); process.exit(1); }
    console.log('✅ Migration tamamlandı. Tüm TRY kayıtlar USD olarak güncellendi.');
    db.close();
  });
});
