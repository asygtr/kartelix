const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const CRLF = '\r\n';
const OLD =
  'kullanicilar (' + CRLF + CRLF + CRLF +
  '    db.run(`CREATE TABLE IF NOT EXISTS kartelalar (' + CRLF + CRLF +
  '    db.run(`CREATE TABLE IF NOT EXISTS mamul_turleri (';

const NEW =
  'kullanicilar (' + CRLF +
  '      id INTEGER PRIMARY KEY AUTOINCREMENT,' + CRLF +
  '      username TEXT UNIQUE NOT NULL,' + CRLF +
  '      password TEXT NOT NULL,' + CRLF +
  "      yetki TEXT DEFAULT 'admin'," + CRLF +
  '      created_at DATETIME DEFAULT CURRENT_TIMESTAMP' + CRLF +
  '    )`);' + CRLF + CRLF +
  '    db.run(`CREATE TABLE IF NOT EXISTS kartelalar (' + CRLF +
  '      id INTEGER PRIMARY KEY AUTOINCREMENT,' + CRLF +
  '      kod TEXT UNIQUE NOT NULL,' + CRLF +
  '      mamul_adi TEXT NOT NULL,' + CRLF +
  '      tip TEXT,' + CRLF +
  '      kompozisyon TEXT,' + CRLF +
  '      en TEXT,' + CRLF +
  '      gramaj TEXT,' + CRLF +
  '      article_no TEXT UNIQUE,' + CRLF +
  '      created_at DATETIME DEFAULT CURRENT_TIMESTAMP' + CRLF +
  '    )`);' + CRLF + CRLF +
  '    db.run(`CREATE TABLE IF NOT EXISTS mamul_turleri (';

if (c.includes(OLD)) {
  c = c.split(OLD).join(NEW);
  fs.writeFileSync('server/index.js', c, 'utf8');
  console.log('OK: tables fixed');
} else {
  console.log('FAIL: pattern not found');
  const i = c.indexOf('kullanicilar');
  console.log(JSON.stringify(c.slice(i, i + 120)));
}
