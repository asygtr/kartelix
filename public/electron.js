const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

let db; // GLOBAL veritabanı değişkeni

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL('http://localhost:3000');

  // Veritabanı bağlantısı
  const dbPath = path.join(__dirname, '../database/showroom.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Veritabanı bağlantı hatası:', err.message);
    } else {
      console.log('SQLite veritabanına bağlanıldı:', dbPath);
    }
  });

  // Tablo oluşturma
  db.run(`
    CREATE TABLE IF NOT EXISTS mamuller (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT UNIQUE NOT NULL,
      aciklama TEXT,
      stok INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS kullanicilar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);
}

app.whenReady().then(createWindow);

//
// IPC HANDLERLAR
//

ipcMain.handle('search-mamul', async (event, mamulAdi) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM mamuller WHERE ad = ?',
      [mamulAdi],
      (err, row) => {
        if (err) {
          reject({ found: false, error: err.message });
        } else if (row) {
          resolve({ found: true, ...row });
        } else {
          resolve({ found: false });
        }
      }
    );
  });
});

ipcMain.handle('add-mamul', async (event, mamul) => {
  return new Promise((resolve) => {
    db.run(
      `INSERT INTO mamuller (ad, aciklama, stok) VALUES (?, ?, ?)`,
      [mamul.ad, mamul.aciklama, mamul.stok],
      function (err) {
        if (err) {
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true, id: this.lastID });
        }
      }
    );
  });
});

ipcMain.handle('import-mamuller', async (event, list) => {
  return new Promise((resolve) => {
    const stmt = db.prepare(`INSERT OR REPLACE INTO mamuller (ad, aciklama, stok) VALUES (?, ?, ?)`);
    list.forEach((item) => {
      stmt.run(item.ad, item.aciklama || '', item.stok || 0);
    });
    stmt.finalize(() => resolve({ success: true }));
  });
});
ipcMain.handle('login-user', async (event, user) => {
  return new Promise((resolve) => {
    db.get(
      `SELECT * FROM kullanicilar WHERE username = ? AND password = ?`,
      [user.username, user.password],
      function (err, row) {
        if (err || !row) {
          resolve({ success: false });
        } else {
          resolve({ success: true, user: row });
        }
      }
    );
  });
});
