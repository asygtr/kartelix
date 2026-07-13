const defaultOrderEmailSettings = {
  enabled: false,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpSecure: false,
  senderName: 'Kartelix Siparis',
  senderEmail: '',
  smtpUser: '',
  smtpPassword: '',
  recipientEmails: '',
  approvalEmails: '',
  approvalShowPrices: true,
  testRecipient: '',
  replyTo: '',
  lastAuthError: ''
};

const mapSiparisSummary = (row) => ({
  ...row,
  toplam_tutar: Number(row.toplam_tutar || 0),
  kalem_sayisi: Number(row.kalem_sayisi || 0)
});

const mapSiparisKalemi = (row) => ({
  ...row,
  miktar_kg: Number(row.miktar_kg || 0),
  birim_fiyat: Number(row.birim_fiyat || 0),
  tutar: Number(row.tutar || 0)
});

const dbGetAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
});

const dbAllAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
});

const dbRunAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const parseJsonValue = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const parseEmailList = (value) =>
  String(value || '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const sanitizeOrderEmailSettings = (settings) => ({
  ...settings,
  enabled: Boolean(settings.enabled),
  smtpHost: String(settings.smtpHost || defaultOrderEmailSettings.smtpHost).trim(),
  smtpPort: Number(settings.smtpPort || defaultOrderEmailSettings.smtpPort),
  smtpSecure: Boolean(settings.smtpSecure),
  senderName: String(settings.senderName || defaultOrderEmailSettings.senderName).trim(),
  senderEmail: String(settings.senderEmail || '').trim(),
  smtpUser: String(settings.smtpUser || '').trim(),
  smtpPassword: '',
  recipientEmails: String(settings.recipientEmails || '').trim(),
  approvalEmails: String(settings.approvalEmails || '').trim(),
  approvalShowPrices: settings.approvalShowPrices !== undefined ? Boolean(settings.approvalShowPrices) : true,
  testRecipient: String(settings.testRecipient || '').trim(),
  replyTo: String(settings.replyTo || '').trim(),
  lastAuthError: String(settings.lastAuthError || '').trim()
});

const createHttpError = (statusCode, body) => {
  const error = new Error(body?.error || 'İşlem başarısız');
  error.statusCode = statusCode;
  error.body = body;
  return error;
};

const resolveOrderEmailSender = (settings) => String(settings.senderEmail || settings.smtpUser || '').trim();

const createOrderEmailTransport = ({ nodemailer, settings }) => {
  const host = String(settings.smtpHost || 'smtp.gmail.com').trim() || 'smtp.gmail.com';
  const port = Number(settings.smtpPort || 587);
  const secure = Boolean(settings.smtpSecure);
  const user = String(settings.smtpUser || settings.senderEmail || '').trim();
  const pass = String(settings.smtpPassword || '').trim();

  if (!user) {
    const error = new Error('SMTP kullanıcı veya gönderici e-posta boş');
    error.code = 'ESETTINGS';
    error.responseCode = 400;
    throw error;
  }
  if (!pass) {
    const error = new Error('SMTP parola / uygulama parolası boş');
    error.code = 'ESETTINGS';
    error.responseCode = 400;
    throw error;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure && port === 587,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

const buildApprovalEmailContent = (order, items = [], showPrices = true) => {
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
    `<div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:4px">Sipariş ${siparisNo} – ${firma}</div>`,
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
    `SİPARİŞ ONAYLANDI – ${siparisNo}`,
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

  return { subject: `Sipariş Onaylandı ${siparisNo} – ${firma}`, html, text };
};

const buildOrderEmailContent = (order, items = []) => {
  const title = `Kartelix Siparis #${order.id}`;
  const lines = items.map((item) => `${item.article_code || item.article_no} - ${item.mamul_adi} - ${Number(item.miktar_kg || 0).toFixed(2)} kg`);
  const text = [
    title,
    '',
    `Firma: ${order.firma_adi || order.musteri_adi || '-'}`,
    `İlgili kişi: ${order.ilgili_kisi || '-'}`,
    `Telefon: ${order.telefon || '-'}`,
    `E-posta: ${order.email || '-'}`,
    `Fuar: ${order.fuar_adi || '-'}`,
    `Personel: ${order.personel_username || '-'}`,
    `Durum: ${order.durum || '-'}`,
    `Toplam: ${Number(order.toplam_tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}`,
    '',
    'Kalemler:',
    ...(lines.length ? lines : ['-']),
    '',
    order.aciklama ? `Not: ${order.aciklama}` : ''
  ].filter((line, index, array) => line || array[index - 1] !== '').join('\n');

  const itemRows = items.length
    ? items.map((item) => `
        <tr>
          <td>${item.article_code || item.article_no || '-'}</td>
          <td>${item.mamul_adi || '-'}</td>
          <td>${item.renk || '-'}</td>
          <td style="text-align:right">${Number(item.miktar_kg || 0).toFixed(2)} kg</td>
          <td style="text-align:right">${Number(item.tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="5">-</td></tr>';

  const html = `
    <div style="font-family:Arial,sans-serif;color:#172023;line-height:1.5">
      <h2>${title}</h2>
      <p><strong>Firma:</strong> ${order.firma_adi || order.musteri_adi || '-'}</p>
      <p><strong>İlgili kişi:</strong> ${order.ilgili_kisi || '-'}<br>
      <strong>Telefon:</strong> ${order.telefon || '-'}<br>
      <strong>E-posta:</strong> ${order.email || '-'}<br>
      <strong>Fuar:</strong> ${order.fuar_adi || '-'}<br>
      <strong>Personel:</strong> ${order.personel_username || '-'}</p>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid #d7c5ad">
        <thead>
          <tr style="background:#f3efe7">
            <th align="left">Article</th>
            <th align="left">Mamül</th>
            <th align="left">Renk</th>
            <th align="right">Miktar</th>
            <th align="right">Tutar</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p><strong>Toplam:</strong> ${Number(order.toplam_tutar || 0).toFixed(2)} ${order.para_birimi || 'TRY'}</p>
      ${order.aciklama ? `<p><strong>Not:</strong> ${order.aciklama}</p>` : ''}
    </div>
  `;

  return { subject: `${title} - ${order.firma_adi || order.musteri_adi || '-'}`, text, html };
};

const { exportOrderToTxt } = require('./orderExport');

const createOrdersService = ({ db, nodemailer }) => {
  const loadOrderEmailSettings = async (includeSecrets = false) => {
    const row = await dbGetAsync(db, `SELECT deger FROM ui_ayarlari WHERE anahtar = 'order_email_settings'`, []);
    const parsed = parseJsonValue(row?.deger, {});
    const merged = {
      enabled: Boolean(parsed.enabled),
      smtpHost: String(parsed.smtpHost || defaultOrderEmailSettings.smtpHost).trim() || defaultOrderEmailSettings.smtpHost,
      smtpPort: Number(parsed.smtpPort || defaultOrderEmailSettings.smtpPort),
      smtpSecure: Boolean(parsed.smtpSecure),
      senderName: String(parsed.senderName || defaultOrderEmailSettings.senderName).trim(),
      senderEmail: String(parsed.senderEmail || '').trim(),
      smtpUser: String(parsed.smtpUser || '').trim(),
      smtpPassword: String(parsed.smtpPassword || '').trim(),
      recipientEmails: String(parsed.recipientEmails || '').trim(),
      approvalEmails: String(parsed.approvalEmails || '').trim(),
      approvalShowPrices: parsed.approvalShowPrices !== undefined ? Boolean(parsed.approvalShowPrices) : true,
      testRecipient: String(parsed.testRecipient || '').trim(),
      replyTo: String(parsed.replyTo || '').trim(),
      lastAuthError: String(parsed.lastAuthError || '').trim()
    };

    return includeSecrets ? merged : sanitizeOrderEmailSettings(merged);
  };

  const loadOrderForEmail = async (siparisId) => {
    const order = await dbGetAsync(db, `SELECT * FROM kartelix_orders WHERE id = ?`, [siparisId]);
    if (!order) throw createHttpError(404, { error: 'Siparis bulunamadi' });
    const items = await dbAllAsync(db, `SELECT * FROM kartelix_order_items WHERE siparis_id = ? ORDER BY id ASC`, [siparisId]);
    return { order, items: items.map(mapSiparisKalemi) };
  };

  const sendSmtpMail = async ({ settings, recipients, subject, html, text }) => {
    const transporter = createOrderEmailTransport({ nodemailer, settings });
    const fromEmail = resolveOrderEmailSender(settings);
    if (!fromEmail) {
      const error = new Error('Gönderici e-posta veya SMTP kullanıcı alanı boş');
      error.code = 'ESETTINGS';
      error.responseCode = 400;
      throw error;
    }

    const info = await transporter.sendMail({
      from: `"${settings.senderName || 'Kartelix'}" <${fromEmail}>`,
      to: recipients.join(', '),
      replyTo: settings.replyTo || fromEmail,
      subject,
      text,
      html
    });

    return {
      accepted: info.accepted || recipients,
      rejected: info.rejected || [],
      messageId: info.messageId || ''
    };
  };

  const sendOrderEmailNotification = async (siparisId, overrideRecipients = '') => {
    const settings = await loadOrderEmailSettings(true);
    if (!settings.enabled && !overrideRecipients) {
      return { skipped: true, message: 'E-posta bildirimi pasif' };
    }

    const recipients = parseEmailList(overrideRecipients || settings.recipientEmails);
    if (!recipients.length) {
      return { skipped: true, message: 'Sipariş alıcı e-postası tanımlı değil' };
    }

    if (!settings.smtpHost || !(settings.smtpUser || settings.senderEmail) || !settings.smtpPassword) {
      return { skipped: true, message: 'Gmail SMTP ayarları eksik' };
    }

    const { order, items } = await loadOrderForEmail(siparisId);
    const content = buildOrderEmailContent(order, items);
    const result = await sendSmtpMail({
      settings,
      recipients,
      subject: content.subject,
      html: content.html,
      text: content.text
    });

    return {
      skipped: false,
      message: 'E-posta gönderildi',
      ...result
    };
  };

  return {
    mapSiparisSummary,
    mapSiparisKalemi,
    async getMamulLabels(term = '') {
      const searchTerm = String(term || '').trim();
      const params = [];
      let sql = `
        SELECT mk.*, mt.ad AS mamul_turu_adi, mt.kod_prefix
        FROM mamul_kartlari mk
        INNER JOIN mamul_turleri mt ON mt.id = mk.mamul_turu_id
        WHERE 1 = 1
      `;

      if (searchTerm) {
        const likeTerm = `%${searchTerm}%`;
        sql += ` AND (mk.mamul_adi LIKE ? OR mk.article_no LIKE ? OR mk.article_code LIKE ? OR mk.renk LIKE ?)`;
        params.push(likeTerm, likeTerm, likeTerm, likeTerm);
      }

      sql += ` ORDER BY mk.updated_at DESC, mk.created_at DESC`;
      const rows = await dbAllAsync(db, sql, params);
      return rows.map((row) => ({
        ...row,
        aktif: Boolean(row.aktif),
        yayin_durumu: row.yayin_durumu || (Boolean(row.aktif) ? 'yayinda' : 'taslak'),
        bir_kg_maliyet: Number(row.bir_kg_maliyet || 0),
        bir_kg_satis_fiyati: Number(row.bir_kg_satis_fiyati || 0)
      }));
    },
    async createOrder(payload) {
      const {
        musteriAdi,
        firmaAdi,
        ilgiliKisi,
        telefon,
        email,
        fuarAdi,
        aciklama,
        personelUsername,
        durum = 'kaydedildi',
        paraBirimi = 'TRY',
        items = [],
        kartvizit = {}
      } = payload;

      const normalizedItems = Array.isArray(items)
        ? items.filter((item) => item && item.mamulId && Number(item.miktarKg || 0) > 0)
        : [];

      if (normalizedItems.length === 0) {
        throw createHttpError(400, { error: 'Siparise en az bir mamul eklenmelidir' });
      }

      const normalizedKartvizit = {
        imageDataUrl: String(kartvizit.imageDataUrl || '').trim(),
        note: String(kartvizit.note || '').trim(),
        ocrFirma: String(kartvizit.ocrFirma || '').trim(),
        ocrKisi: String(kartvizit.ocrKisi || '').trim(),
        ocrTelefon: String(kartvizit.ocrTelefon || '').trim(),
        ocrEmail: String(kartvizit.ocrEmail || '').trim(),
        ocrDurumu: String(kartvizit.ocrDurumu || (kartvizit.imageDataUrl ? 'hazir' : 'bekleniyor')).trim()
      };

      const resolvedMusteriAdi = String(
        musteriAdi || firmaAdi || normalizedKartvizit.ocrFirma || (normalizedKartvizit.imageDataUrl ? 'Kartvizit eklendi' : 'Firma adı bilinmiyor')
      ).trim();

      const mamulIds = normalizedItems.map((item) => Number(item.mamulId));
      const placeholders = mamulIds.map(() => '?').join(', ');
      const mamuller = await dbAllAsync(db, `SELECT id, mamul_adi, article_no, article_code, renk, bir_kg_satis_fiyati FROM mamul_kartlari WHERE id IN (${placeholders})`, mamulIds);

      if (mamuller.length !== normalizedItems.length) {
        throw createHttpError(400, { error: 'Secilen mamullerden biri bulunamadi' });
      }

      const mamulMap = new Map(mamuller.map((item) => [Number(item.id), item]));
      const enrichedItems = normalizedItems.map((item) => {
        const mamul = mamulMap.get(Number(item.mamulId));
        const birimFiyat = Number(item.birimFiyat || mamul.bir_kg_satis_fiyati || 0);
        const miktarKg = Number(item.miktarKg || 0);
        return {
          mamulId: Number(item.mamulId),
          mamul_adi: mamul.mamul_adi,
          article_no: mamul.article_no,
          article_code: mamul.article_code,
          renk: mamul.renk,
          miktar_kg: miktarKg,
          birim_fiyat: birimFiyat,
          tutar: Number((miktarKg * birimFiyat).toFixed(2))
        };
      });

      const toplamTutar = Number(enrichedItems.reduce((sum, item) => sum + item.tutar, 0).toFixed(2));

      await dbRunAsync(db, 'BEGIN TRANSACTION');
      try {
        const insertResult = await dbRunAsync(
          db,
          `INSERT INTO kartelix_orders (
            musteri_adi, ilgili_kisi, telefon, email, aciklama, durum,
            kartvizit_gorsel, kartvizit_notu, kartvizit_ocr_firma, kartvizit_ocr_kisi, kartvizit_ocr_telefon, kartvizit_ocr_email, kartvizit_ocr_durumu,
            firma_adi, fuar_adi, personel_username, toplam_tutar, para_birimi
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
          [
            resolvedMusteriAdi,
            String(ilgiliKisi || '').trim(),
            String(telefon || '').trim(),
            String(email || '').trim(),
            String(aciklama || '').trim(),
            String(durum || 'kaydedildi').trim(),
            normalizedKartvizit.imageDataUrl,
            normalizedKartvizit.note,
            normalizedKartvizit.ocrFirma,
            normalizedKartvizit.ocrKisi,
            normalizedKartvizit.ocrTelefon,
            normalizedKartvizit.ocrEmail,
            normalizedKartvizit.ocrDurumu,
            String(firmaAdi || '').trim(),
            String(fuarAdi || '').trim(),
            String(personelUsername || '').trim(),
            toplamTutar,
            String(paraBirimi || 'TRY').trim().toUpperCase()
          ]
        );

        const siparisId = insertResult.lastID;
        for (const item of enrichedItems) {
          await dbRunAsync(
            db,
            `INSERT INTO kartelix_order_items (
              siparis_id, mamul_id, mamul_adi, article_no, article_code, renk,
              miktar_kg, birim_fiyat, tutar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              siparisId,
              item.mamulId,
              item.mamul_adi,
              item.article_no,
              item.article_code,
              item.renk || '',
              item.miktar_kg,
              item.birim_fiyat,
              item.tutar
            ]
          );
        }

        await dbRunAsync(db, 'COMMIT');
        const emailStatus = { skipped: true, message: 'E-posta arka planda gönderiliyor' };
        setImmediate(() => {
          sendOrderEmailNotification(siparisId).catch((emailErr) => {
            console.error('Siparis email gonderme hatasi:', emailErr?.message || emailErr);
          });
        });

        return { siparisId, toplamTutar, kalemSayisi: enrichedItems.length, emailStatus };
      } catch (err) {
        await dbRunAsync(db, 'ROLLBACK');
        throw err;
      }
    },
    async completeOrder(siparisId) {
      const order = await dbGetAsync(db, `SELECT * FROM kartelix_orders WHERE id = ?`, [siparisId]);
      if (!order) throw createHttpError(404, { success: false, error: 'Siparis bulunamadi' });

      await dbRunAsync(db, `UPDATE kartelix_orders SET durum = 'tamamlandi', tamamlandi_at = CURRENT_TIMESTAMP WHERE id = ?`, [siparisId]);

      const items = await dbAllAsync(db, `SELECT * FROM kartelix_order_items WHERE siparis_id = ? ORDER BY id ASC`, [siparisId]);
      let exportPath = null;
      try {
        exportPath = exportOrderToTxt(order, items.map(mapSiparisKalemi));
      } catch (exportErr) {
        console.error('Siparis TXT export hatasi:', exportErr?.message || exportErr);
      }

      const settings = await loadOrderEmailSettings(true);
      const approvalRecipients = parseEmailList(settings.approvalEmails);
      const emailStatus = { skipped: true, message: 'Sipariş onay e-posta adresi tanımlı değil' };

      setImmediate(() => {
        if (approvalRecipients.length && settings.smtpHost && (settings.smtpUser || settings.senderEmail) && settings.smtpPassword) {
          loadOrderForEmail(siparisId)
            .then(({ order: freshOrder, items }) => {
              const content = buildApprovalEmailContent(freshOrder, items, settings.approvalShowPrices !== false);
              return sendSmtpMail({ settings, recipients: approvalRecipients, subject: content.subject, html: content.html, text: content.text });
            })
            .catch((emailErr) => {
              console.error('Onay email gonderme hatasi:', emailErr?.message || emailErr);
            });
        }
      });

      return { siparisId: Number(siparisId), emailStatus, exportPath };
    },
    async listOrders() {
      const rows = await dbAllAsync(db, `
        SELECT s.*,
               COUNT(sk.id) AS kalem_sayisi,
               GROUP_CONCAT(DISTINCT sk.article_code) AS article_codes,
               GROUP_CONCAT(DISTINCT sk.article_no) AS article_nos,
               GROUP_CONCAT(DISTINCT sk.mamul_adi) AS mamul_adlari
        FROM kartelix_orders s
        LEFT JOIN kartelix_order_items sk ON sk.siparis_id = s.id
        GROUP BY s.id
        ORDER BY s.id DESC
      `, []);
      return rows.map(mapSiparisSummary);
    },
    async getOrderById(siparisId) {
      const siparis = await dbGetAsync(db, `SELECT * FROM kartelix_orders WHERE id = ?`, [siparisId]);
      if (!siparis) throw createHttpError(404, { error: 'Siparis bulunamadi' });
      const items = await dbAllAsync(db, `SELECT * FROM kartelix_order_items WHERE siparis_id = ? ORDER BY id ASC`, [siparisId]);
      return {
        ...mapSiparisSummary(siparis),
        items: items.map(mapSiparisKalemi)
      };
    },
    async deleteOrder(siparisId) {
      await dbRunAsync(db, 'BEGIN TRANSACTION');
      try {
        await dbRunAsync(db, `DELETE FROM kartelix_order_items WHERE siparis_id = ?`, [siparisId]);
        const result = await dbRunAsync(db, `DELETE FROM kartelix_orders WHERE id = ?`, [siparisId]);
        if (result.changes === 0) {
          await dbRunAsync(db, 'ROLLBACK');
          throw createHttpError(404, { error: 'Siparis bulunamadi' });
        }
        await dbRunAsync(db, 'COMMIT');
        return { success: true, message: 'Sipariş silindi' };
      } catch (err) {
        await dbRunAsync(db, 'ROLLBACK');
        throw err;
      }
    },
    async updateOrder(siparisId, payload) {
      const {
        musteriAdi,
        firmaAdi,
        ilgiliKisi,
        telefon,
        email,
        fuarAdi,
        aciklama,
        durum = 'kaydedildi',
        personelUsername,
        paraBirimi = 'TRY',
        items = [],
        kartvizit = {}
      } = payload;

      const normalizedItems = Array.isArray(items)
        ? items.filter((item) => item && item.mamulId && Number(item.miktarKg || 0) > 0)
        : [];

      if (normalizedItems.length === 0) {
        throw createHttpError(400, { error: 'Sipariste en az bir mamul olmalidir' });
      }

      const normalizedKartvizit = {
        imageDataUrl: String(kartvizit.imageDataUrl || '').trim(),
        note: String(kartvizit.note || '').trim(),
        ocrFirma: String(kartvizit.ocrFirma || '').trim(),
        ocrKisi: String(kartvizit.ocrKisi || '').trim(),
        ocrTelefon: String(kartvizit.ocrTelefon || '').trim(),
        ocrEmail: String(kartvizit.ocrEmail || '').trim(),
        ocrDurumu: String(kartvizit.ocrDurumu || (kartvizit.imageDataUrl ? 'hazir' : 'bekleniyor')).trim()
      };

      const resolvedMusteriAdi = String(
        musteriAdi || firmaAdi || normalizedKartvizit.ocrFirma || (normalizedKartvizit.imageDataUrl ? 'Kartvizit eklendi' : 'Firma adı bilinmiyor')
      ).trim();

      const existing = await dbGetAsync(db, `SELECT id FROM kartelix_orders WHERE id = ?`, [siparisId]);
      if (!existing) throw createHttpError(404, { error: 'Siparis bulunamadi' });

      const mamulIds = normalizedItems.map((item) => Number(item.mamulId));
      const placeholders = mamulIds.map(() => '?').join(', ');
      const mamuller = await dbAllAsync(db, `SELECT id, mamul_adi, article_no, article_code, renk, bir_kg_satis_fiyati FROM mamul_kartlari WHERE id IN (${placeholders})`, mamulIds);
      if (mamuller.length !== normalizedItems.length) {
        throw createHttpError(400, { error: 'Secilen mamullerden biri bulunamadi' });
      }

      const mamulMap = new Map(mamuller.map((item) => [Number(item.id), item]));
      const enrichedItems = normalizedItems.map((item) => {
        const mamul = mamulMap.get(Number(item.mamulId));
        const miktarKg = Number(item.miktarKg || 0);
        const birimFiyat = Number(item.birimFiyat || mamul.bir_kg_satis_fiyati || 0);
        return {
          mamulId: Number(item.mamulId),
          mamul_adi: mamul.mamul_adi,
          article_no: mamul.article_no,
          article_code: mamul.article_code,
          renk: mamul.renk,
          miktar_kg: miktarKg,
          birim_fiyat: birimFiyat,
          tutar: Number((miktarKg * birimFiyat).toFixed(2))
        };
      });

      const toplamTutar = Number(enrichedItems.reduce((sum, item) => sum + item.tutar, 0).toFixed(2));

      await dbRunAsync(db, 'BEGIN TRANSACTION');
      try {
        await dbRunAsync(
          db,
          `UPDATE kartelix_orders
           SET musteri_adi = ?, firma_adi = ?, ilgili_kisi = ?, telefon = ?, email = ?, fuar_adi = ?, aciklama = ?,
               kartvizit_gorsel = ?, kartvizit_notu = ?, kartvizit_ocr_firma = ?, kartvizit_ocr_kisi = ?, kartvizit_ocr_telefon = ?, kartvizit_ocr_email = ?, kartvizit_ocr_durumu = ?,
               durum = ?, personel_username = ?, toplam_tutar = ?, para_birimi = ?
           WHERE id = ?`,
          [
            resolvedMusteriAdi,
            String(firmaAdi || '').trim(),
            String(ilgiliKisi || '').trim(),
            String(telefon || '').trim(),
            String(email || '').trim(),
            String(fuarAdi || '').trim(),
            String(aciklama || '').trim(),
            normalizedKartvizit.imageDataUrl,
            normalizedKartvizit.note,
            normalizedKartvizit.ocrFirma,
            normalizedKartvizit.ocrKisi,
            normalizedKartvizit.ocrTelefon,
            normalizedKartvizit.ocrEmail,
            normalizedKartvizit.ocrDurumu,
            String(durum || 'kaydedildi').trim(),
            String(personelUsername || '').trim(),
            toplamTutar,
            String(paraBirimi || 'TRY').trim().toUpperCase(),
            siparisId
          ]
        );
        await dbRunAsync(db, `DELETE FROM kartelix_order_items WHERE siparis_id = ?`, [siparisId]);
        for (const item of enrichedItems) {
          await dbRunAsync(
            db,
            `INSERT INTO kartelix_order_items (
              siparis_id, mamul_id, mamul_adi, article_no, article_code, renk,
              miktar_kg, birim_fiyat, tutar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [siparisId, item.mamulId, item.mamul_adi, item.article_no, item.article_code, item.renk || '', item.miktar_kg, item.birim_fiyat, item.tutar]
          );
        }
        await dbRunAsync(db, 'COMMIT');
        return { siparisId: Number(siparisId), toplamTutar, kalemSayisi: enrichedItems.length };
      } catch (err) {
        await dbRunAsync(db, 'ROLLBACK');
        throw err;
      }
    },
    async getAdminOverview() {
      const mamulRow = await dbGetAsync(db, `SELECT COUNT(*) AS count FROM mamul_kartlari`, []);
      const activeRow = await dbGetAsync(db, `SELECT COUNT(*) AS count FROM mamul_kartlari WHERE aktif = 1`, []);
      const orderRow = await dbGetAsync(db, `SELECT COUNT(*) AS count FROM kartelix_orders`, []);
      const viewRow = await dbGetAsync(db, `SELECT COUNT(*) AS count FROM mamul_analitikleri WHERE olay_tipi = 'public_view'`, []);
      const topRows = await dbAllAsync(db, `
        SELECT mk.id, mk.mamul_adi, mk.article_code, COUNT(ma.id) AS okutulma
        FROM mamul_kartlari mk
        LEFT JOIN mamul_analitikleri ma ON ma.mamul_id = mk.id AND ma.olay_tipi = 'public_view'
        GROUP BY mk.id
        ORDER BY okutulma DESC, mk.updated_at DESC
        LIMIT 5
      `, []);
      const bestRows = await dbAllAsync(db, `
        SELECT oi.mamul_id AS id, oi.mamul_adi, oi.article_code, SUM(oi.miktar_kg) AS toplam_kg
        FROM kartelix_order_items oi
        GROUP BY oi.mamul_id, oi.mamul_adi, oi.article_code
        ORDER BY toplam_kg DESC
        LIMIT 5
      `, []);

      return {
        toplamMamul: Number(mamulRow.count || 0),
        publicAktifMamul: Number(activeRow.count || 0),
        toplamSiparis: Number(orderRow.count || 0),
        toplamPublicGoruntulenme: Number(viewRow.count || 0),
        enCokOkutulanlar: topRows.map((row) => ({ ...row, okutulma: Number(row.okutulma || 0) })),
        enCokSipariseGirenler: bestRows.map((row) => ({ ...row, toplam_kg: Number(row.toplam_kg || 0) }))
      };
    },

    async createLegacyOrder(payload, sendSuccess, sendError) {
      const { musteriAdi, ilgiliKisi, telefon, kartelalar, aciklama } = payload;

      const errors = [];
      if (!musteriAdi || String(musteriAdi).trim().length < 2) {
        errors.push('Müşteri adı en az 2 karakter olmalıdır');
      }
      if (!kartelalar || !Array.isArray(kartelalar) || kartelalar.length === 0) {
        errors.push('En az bir kartela eklenmelidir');
      }

      if (errors.length > 0) {
        return sendError({ error: 'Geçersiz veri', details: errors }, 400);
      }

      return new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');

          const siparisSql = `
            INSERT INTO siparisler (musteri_adi, ilgili_kisi, telefon, aciklama)
            VALUES (?, ?, ?, ?)
          `;

          db.run(siparisSql, [String(musteriAdi).trim(), String(ilgiliKisi || '').trim(), String(telefon || '').trim(), String(aciklama || '').trim()],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }

            const siparisId = this.lastID;

            if (kartelalar && kartelalar.length > 0) {
              let completed = 0;

              kartelalar.forEach((kartela) => {
                const kartelaSql = `
                  INSERT INTO siparis_kartelalari (siparis_id, kartela_kodu, mamul_adi, article_no)
                  VALUES (?, ?, ?, ?)
                `;

                db.run(kartelaSql, [siparisId, kartela.kod, kartela.mamul_adi, kartela.article_no], function(kartelaErr) {
                  if (kartelaErr) {
                    db.run('ROLLBACK');
                    return reject(kartelaErr);
                  }

                  completed++;
                  if (completed === kartelalar.length) {
                    db.run('COMMIT', (commitErr) => {
                      if (commitErr) {
                        db.run('ROLLBACK');
                        return reject(commitErr);
                      }

                      resolve({ siparisId, message: `Sipariş başarıyla oluşturuldu (${kartelalar.length} kartela eklendi)` });
                    });
                  }
                });
              });
            } else {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  db.run('ROLLBACK');
                  return reject(commitErr);
                }

                resolve({ siparisId, message: 'Sipariş başarıyla oluşturuldu' });
              });
            }
          }
          );
        });
      });
    },

    async listLegacyOrders() {
      const rows = await dbAllAsync(db, `
        SELECT s.*, 
               COUNT(sk.id) as kartela_sayisi,
               GROUP_CONCAT(sk.kartela_kodu) as kartela_kodlari
        FROM siparisler s
        LEFT JOIN siparis_kartelalari sk ON s.id = sk.siparis_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `, []);
      return rows;
    },

    async getLegacyOrderById(siparisId) {
      const siparis = await dbGetAsync(db, `SELECT * FROM siparisler WHERE id = ?`, [siparisId]);
      if (!siparis) return null;

      const kartelalar = await dbAllAsync(db, `SELECT * FROM siparis_kartelalari WHERE siparis_id = ?`, [siparisId]);
      return { siparis, kartelalar };
    },

    async deleteLegacyOrder(siparisId) {
      await dbRunAsync(db, `DELETE FROM siparis_kartelalari WHERE siparis_id = ?`, [siparisId]);
      const result = await dbRunAsync(db, `DELETE FROM siparisler WHERE id = ?`, [siparisId]);

      if (result.changes === 0) {
        const error = new Error('Sipariş bulunamadı');
        error.statusCode = 404;
        throw error;
      }

      return { message: 'Sipariş başarıyla silindi' };
    }
  };
};

module.exports = { createOrdersService, mapSiparisSummary, mapSiparisKalemi };
