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

const defaultGenelAyarlar = {
  publicProsesGoster: false,
  publicFiyatGoster: false,
  publicHikayeGoster: true,
  publicHammaddeGoster: true,
  karYuzdesi: 0
};

const parseJsonValue = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

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

const classifyEmailError = (err) => {
  const code = String(err?.code || '').toUpperCase();
  const responseCode = Number(err?.responseCode || 0);
  const responseText = String(err?.response || err?.body || err?.message || '').trim();

  if (code === 'EAUTH' || responseCode === 401 || responseCode === 403 || responseCode === 535 || responseCode === 534 || responseText.toLowerCase().includes('app password') || responseText.toLowerCase().includes('username and password not accepted')) {
    return { status: 401, message: 'Gmail kimlik doğrulaması başarısız. Uygulama parolası veya kullanıcı bilgileri kontrol edilmeli.', code: code || 'AUTH' };
  }

  if (code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ECONNREFUSED') {
    return { status: 502, message: 'Gmail SMTP sunucusuna bağlanılamadı. Host veya port kontrol edilmeli.', code: code || 'NETWORK' };
  }

  return {
    status: responseCode >= 400 ? 502 : 500,
    message: responseText || err?.message || 'Gmail SMTP işlemi başarısız oldu',
    code: code || `HTTP_${responseCode || 500}`
  };
};

const resolveOrderEmailSender = (settings) => String(settings.senderEmail || settings.smtpUser || '').trim();

const createOrderEmailTransport = (nodemailer, settings) => {
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

const loadOrderEmailSettings = async (db, includeSecrets = false) => {
  const row = await new Promise((resolve, reject) => {
    db.get('SELECT deger FROM ui_ayarlari WHERE anahtar = ?', ['order_email_settings'], (err, resolvedRow) => {
      if (err) return reject(err);
      resolve(resolvedRow || null);
    });
  });

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

const saveOrderEmailSettings = async (db, incomingSettings) => {
  const existing = await loadOrderEmailSettings(db, true);
  const next = {
    enabled: Boolean(incomingSettings.enabled),
    smtpHost: String(incomingSettings.smtpHost || existing.smtpHost || defaultOrderEmailSettings.smtpHost).trim() || defaultOrderEmailSettings.smtpHost,
    smtpPort: Number(incomingSettings.smtpPort || existing.smtpPort || defaultOrderEmailSettings.smtpPort),
    smtpSecure: Boolean(incomingSettings.smtpSecure),
    senderName: String(incomingSettings.senderName || existing.senderName || defaultOrderEmailSettings.senderName).trim(),
    senderEmail: String(incomingSettings.senderEmail || existing.senderEmail || '').trim(),
    smtpUser: String(incomingSettings.smtpUser || existing.smtpUser || '').trim(),
    smtpPassword: String(incomingSettings.smtpPassword || existing.smtpPassword || '').trim(),
    recipientEmails: String(incomingSettings.recipientEmails || existing.recipientEmails || '').trim(),
    approvalEmails: String(incomingSettings.approvalEmails !== undefined ? incomingSettings.approvalEmails : (existing.approvalEmails || '')).trim(),
    approvalShowPrices: incomingSettings.approvalShowPrices !== undefined ? Boolean(incomingSettings.approvalShowPrices) : (existing.approvalShowPrices !== undefined ? Boolean(existing.approvalShowPrices) : true),
    testRecipient: String(incomingSettings.testRecipient || existing.testRecipient || '').trim(),
    replyTo: String(incomingSettings.replyTo || existing.replyTo || '').trim(),
    lastAuthError: ''
  };

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO ui_ayarlari (anahtar, deger)
       VALUES ('order_email_settings', ?)
       ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(next)],
      (err) => (err ? reject(err) : resolve())
    );
  });

  return sanitizeOrderEmailSettings(next);
};

const loadGenelAyarlar = async (db) => {
  const row = await new Promise((resolve, reject) => {
    db.get('SELECT deger FROM ui_ayarlari WHERE anahtar = ?', ['genel_ayarlar'], (err, resolvedRow) => {
      if (err) return reject(err);
      resolve(resolvedRow || null);
    });
  });

  const parsed = parseJsonValue(row?.deger, {});
  return { ...defaultGenelAyarlar, ...parsed };
};

const saveGenelAyarlar = async (db, nextValues) => {
  const nextVal = { ...defaultGenelAyarlar, ...nextValues };
  await new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO ui_ayarlari (anahtar, deger) VALUES (?, ?) ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger, updated_at = CURRENT_TIMESTAMP',
      ['genel_ayarlar', JSON.stringify(nextVal)],
      (err) => (err ? reject(err) : resolve())
    );
  });
  return nextVal;
};

const parseEmailList = (value) => String(value || '').split(/[;,]/).map((item) => item.trim()).filter(Boolean);

const sendSmtpMail = async (nodemailer, settings, recipients, subject, text, html) => {
  const transport = createOrderEmailTransport(nodemailer, settings);
  return transport.sendMail({
    from: `${settings.senderName} <${settings.senderEmail || settings.smtpUser || ''}>`,
    to: recipients.join(','),
    subject,
    text,
    html
  });
};

module.exports = {
  defaultOrderEmailSettings,
  defaultGenelAyarlar,
  parseJsonValue,
  sanitizeOrderEmailSettings,
  classifyEmailError,
  resolveOrderEmailSender,
  loadOrderEmailSettings,
  saveOrderEmailSettings,
  loadGenelAyarlar,
  saveGenelAyarlar,
  parseEmailList,
  sendSmtpMail
};
