const fs = require('fs');
const path = require('path');

const EXPORT_DIR = process.env.ORDER_EXPORT_DIR || path.join(__dirname, '..', '..', '..', 'exports');

function ensureExportDir() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

/**
 * Onaylanan siparişi TXT dosyasına yazar.
 * Format:
 *   SIPARIS|<tarih>|<siparis_id>|<firma_adi>|<ilgili_kisi>|<telefon>|<para_birimi>
 *   KALEM|<article_code>|<mamul_adi>|<renk>|<miktar_kg>|<birim_fiyat>|<tutar>
 *   ...
 *   TOPLAM|<toplam_tutar>
 *
 * Dosya adı: siparis_<id>_<timestamp>.txt
 */
function exportOrderToTxt(order, items) {
  ensureExportDir();

  const tarih = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const lines = [];

  lines.push([
    'SIPARIS',
    tarih,
    order.id,
    order.firma_adi || order.musteri_adi || '',
    order.ilgili_kisi || '',
    order.telefon || '',
    order.para_birimi || 'TRY'
  ].join('|'));

  for (const item of items) {
    lines.push([
      'KALEM',
      item.article_code || item.article_no || '',
      item.mamul_adi || '',
      item.renk || '',
      Number(item.miktar_kg || 0).toFixed(2),
      Number(item.birim_fiyat || 0).toFixed(2),
      Number(item.tutar || 0).toFixed(2)
    ].join('|'));
  }

  lines.push(`TOPLAM|${Number(order.toplam_tutar || 0).toFixed(2)}`);

  const timestamp = Date.now();
  const fileName = `siparis_${order.id}_${timestamp}.txt`;
  const filePath = path.join(EXPORT_DIR, fileName);

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');

  return filePath;
}

module.exports = { exportOrderToTxt };
