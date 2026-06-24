const normalizeUsername = (value = '') => String(value || '').trim().toLowerCase();

const LEGACY_DEFAULT_PASSWORDS = {
  yonetici: ['1234', '123456'],
  satici: ['1234', '123456'],
  mamul: ['1234', '123456']
};

const resolveLoginUsername = (username) => {
  const normalized = normalizeUsername(username);
  const aliases = {
    admin: 'yonetici',
    staff: 'satici',
    yonetici: 'yonetici',
    satici: 'satici',
    mamul: 'mamul'
  };

  return aliases[normalized] || normalized;
};

const getPasswordLength = async (db, username) => {
  const row = await new Promise((resolve, reject) => {
    db.get('SELECT password_length FROM kullanicilar WHERE username = ?', [username], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

  return row?.password_length || 4;
};

const verifyUserPassword = async ({ db, username, password, bcrypt, bcryptRounds = 12 }) => {
  const row = await new Promise((resolve, reject) => {
    db.get('SELECT id, username, password, yetki FROM kullanicilar WHERE username = ?', [username], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

  if (!row) return null;

  const normalizedUsername = normalizeUsername(username);
  const candidatePasswords = [String(password)];
  const legacyPasswords = LEGACY_DEFAULT_PASSWORDS[normalizedUsername] || [];
  candidatePasswords.push(...legacyPasswords);

  const uniqueCandidates = [...new Set(candidatePasswords.filter(Boolean))];

  for (const candidatePassword of uniqueCandidates) {
    const passwordMatch = await bcrypt.compare(candidatePassword, row.password);
    if (!passwordMatch) continue;

    if (candidatePassword !== String(password)) {
      const hash = await bcrypt.hash(String(password), bcryptRounds);
      await new Promise((resolve, reject) => {
        db.run('UPDATE kullanicilar SET password = ?, password_length = ? WHERE username = ?', [hash, String(password).length, username], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }

    return row;
  }

  return null;
};

const createAuthToken = ({ payload, jwt, jwtSecret, expiresIn = '12h' }) =>
  jwt.sign(payload, jwtSecret, { expiresIn });

const buildRedirectTo = (role) => {
  if (role === 'staff') return '/staff/orders/new';
  if (role === 'mamul') return '/mamul';
  return '/admin';
};

const changePassword = async ({ db, username, currentPassword, newPassword, bcrypt, bcryptRounds, skipCurrentPasswordCheck = false }) => {
  const row = await new Promise((resolve, reject) => {
    db.get('SELECT * FROM kullanicilar WHERE username = ?', [username], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

  if (!row) return { ok: false, status: 404, message: 'Kullanıcı bulunamadı' };

  if (!skipCurrentPasswordCheck) {
    const match = await bcrypt.compare(String(currentPassword || ''), row.password);
    if (!match) return { ok: false, status: 401, message: 'Mevcut şifre hatalı' };
  }

  const hash = await bcrypt.hash(String(newPassword), bcryptRounds);
  await new Promise((resolve, reject) => {
    db.run('UPDATE kullanicilar SET password = ?, password_length = ? WHERE username = ?', [hash, String(newPassword).length, username], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  return { ok: true, message: 'Şifre başarıyla güncellendi' };
};

module.exports = {
  normalizeUsername,
  resolveLoginUsername,
  getPasswordLength,
  verifyUserPassword,
  createAuthToken,
  buildRedirectTo,
  changePassword
};
