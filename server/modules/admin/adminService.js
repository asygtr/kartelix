const countRows = (db, tableName) => new Promise((resolve) => {
  db.get(`SELECT COUNT(*) AS count FROM ${tableName}`, [], (err, row) => {
    if (err) {
      resolve(0);
      return;
    }

    resolve(Number(row?.count || 0));
  });
});

const createAdminService = ({ db }) => ({
  async getStats() {
    const [totalSiparis, totalFirma, totalMamul, totalKullanici] = await Promise.all([
      countRows(db, 'siparisler').catch(() => 0),
      countRows(db, 'firmalar').catch(() => 0),
      countRows(db, 'mamul_kartlari').catch(() => 0),
      countRows(db, 'kullanicilar').catch(() => 0)
    ]);

    return {
      totalSiparis,
      totalFirma,
      totalMamul,
      totalKullanici
    };
  }
});

module.exports = { createAdminService };