$file = 'server\index.js'
$lines = Get-Content $file -Encoding UTF8
$start = $null
$end = $null
for ($i = 0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match '^function buildApprovalEmailContent') { $start = $i }
  if ($start -ne $null -and $i -gt $start -and $lines[$i] -match '^function buildOrderEmailContent') { $end = $i; break }
}
$before = $lines[0..($start - 1)]
$after  = $lines[$end..($lines.Length - 1)]

$newFunc = @'
function buildApprovalEmailContent(order, items = [], showPrices = true) {
  const siparisNo = `#${order.id}`;
  const firma = order.firma_adi || order.musteri_adi || '-';
  const colSpan = showPrices ? 5 : 4;
  const itemRows = items.length
    ? items.map((item) => [
        '<tr>',
        `<td style="padding:8px;border-bottom:1px solid #e8e0d4">${item.article_code || item.article_no || '-'}</td>`,
        `<td style="padding:8px;border-bottom:1px solid #e8e0d4">${item.mamul_adi || '-'}</td>`,
        `<td style="padding:8px;border-bottom:1px solid #e8e0d4">${item.renk || '-'}</td>`,
        `<td style="padding:8px;border-bottom:1px solid #e8e0d4;text-align:right">${Number(item.miktar_kg || 0).toFixed(2)} kg</td>`,
        showPrices ? `<td style="padding:8px;border-bottom:1px solid #e8e0d4;text-align:right">${Number(item.tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}</td>` : '',
        '</tr>'
      ].join('')).join('')
    : `<tr><td colspan="${colSpan}" style="padding:8px;color:#888">-</td></tr>`;

  const priceTh = showPrices ? '<th align="right" style="padding:8px">Tutar</th>' : '';
  const totalRow = showPrices
    ? `<tr><td style="padding:4px 0;color:#666">Toplam Tutar</td><td style="padding:4px 0;font-weight:700;font-size:15px">${Number(order.toplam_tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}</td></tr>`
    : '';

  const html = [
    '<div style="font-family:Arial,sans-serif;color:#1a2024;line-height:1.6;max-width:640px">',
    '<div style="background:#1a2024;padding:24px 32px;border-radius:8px 8px 0 0">',
    '<div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:0.04em">SİPARİŞ ONAYLANDI</div>',
    `<div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:4px">Sipariş ${siparisNo} — ${firma}</div>`,
    '</div>',
    '<div style="background:#faf8f5;padding:24px 32px;border:1px solid #e8e0d4;border-top:none">',
    '<p style="margin:0 0 16px">Sayın İlgili,</p>',
    `<p style="margin:0 0 16px"><strong>${firma}</strong> firmasına ait <strong>${siparisNo}</strong> numaralı sipariş tarafımızca incelenmiş ve <strong>onaylanmıştır</strong>. Siparişin üretim sürecine alınması için bilgilerinizi paylaşıyoruz.</p>`,
    '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">',
    `<thead><tr style="background:#ede8df"><th align="left" style="padding:8px">Article</th><th align="left" style="padding:8px">Mamül</th><th align="left" style="padding:8px">Renk</th><th align="right" style="padding:8px">Miktar</th>${priceTh}</tr></thead>`,
    `<tbody>${itemRows}</tbody>`,
    '</table>',
    '<table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;margin-bottom:16px">',
    `<tr><td style="padding:4px 0;color:#666">Firma</td><td style="padding:4px 0;font-weight:600">${order.firma_adi || '-'}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#666">İlgili Kişi</td><td style="padding:4px 0">${order.ilgili_kisi || '-'}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#666">Telefon</td><td style="padding:4px 0">${order.telefon || '-'}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#666">Fuar / Kaynak</td><td style="padding:4px 0">${order.fuar_adi || '-'}</td></tr>`,
    totalRow,
    '</table>',
    order.aciklama ? `<p style="margin:0 0 16px;font-size:13px;color:#555"><strong>Not:</strong> ${order.aciklama}</p>` : '',
    '<p style="margin:16px 0 0;font-size:13px;color:#888">Bu e-posta otomatik olarak gönderilmiştir.</p>',
    '</div></div>'
  ].join('');

  const text = [
    `SİPARİŞ ONAYLANDI — ${siparisNo}`,
    `Firma: ${firma}`,
    `İlgili Kişi: ${order.ilgili_kisi || '-'}`,
    `Telefon: ${order.telefon || '-'}`,
    ...(showPrices ? [`Toplam: ${Number(order.toplam_tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}`] : []),
    '',
    'Kalemler:',
    ...(items.length ? items.map((i) => showPrices
      ? `${i.article_code} - ${i.mamul_adi} - ${Number(i.miktar_kg || 0).toFixed(2)} kg - ${Number(i.tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}`
      : `${i.article_code} - ${i.mamul_adi} - ${Number(i.miktar_kg || 0).toFixed(2)} kg`) : ['-'])
  ].join('\n');

  return { subject: `Sipariş Onaylandı ${siparisNo} — ${firma}`, html, text };
}

'@

$combined = $before + ($newFunc -split "`n") + $after
[System.IO.File]::WriteAllLines((Resolve-Path $file).Path, $combined, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. start=$start end=$end"
