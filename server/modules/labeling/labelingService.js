const mapMamulCard = (row) => ({
  ...row,
  aktif: Boolean(row.aktif),
  yayin_durumu: row.yayin_durumu || (Boolean(row.aktif) ? 'yayinda' : 'taslak'),
  bir_kg_maliyet: Number(row.bir_kg_maliyet || 0),
  bir_kg_satis_fiyati: Number(row.bir_kg_satis_fiyati || 0)
});

const createLabelingService = ({ db }) => {
  const runDb = (query, params = []) => new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

  const getDb = (query, params = []) => new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

  const allDb = (query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  const escapeCsvValue = (value) => {
    const text = String(value ?? '');
    if (text.includes('"') || text.includes(',') || text.includes('\n') || text.includes('\r')) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  };

  const parseLabelTemplateCsv = (rawText) => {
    const lines = rawText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];

    const rows = [];
    let header = null;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!header) {
        header = line.split(',').map((part) => part.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        continue;
      }

      const match = line.match(/^("[^"]*(?:""[^"]*)*")|[^,]*/);
      if (!match || match.index !== 0) continue;

      const first = match[0].replace(/^"|"$/g, '').replace(/""/g, '"');
      const afterFirst = line.slice(match[0].length);

      const secondMatch = afterFirst.match(/^("[^"]*(?:""[^"]*)*")|[^,]*/);
      const second = secondMatch ? secondMatch[0].replace(/^"|"$/g, '').replace(/""/g, '"') : '';

      const afterSecond = secondMatch ? afterFirst.slice(secondMatch[0].length) : afterFirst;
      const thirdMatch = afterSecond.match(/^("[^"]*(?:""[^"]*)*")|[^,]*/);
      const third = thirdMatch ? thirdMatch[0].replace(/^"|"$/g, '').replace(/""/g, '"') : '';

      const fourth = afterSecond.slice(thirdMatch ? thirdMatch[0].length : 0).replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"');

      rows.push({
        template_id: first,
        name: second,
        is_active: third,
        template_json: fourth
      });
    }

    return rows;
  };

  return {
    async getMamulLabels(term) {
      const params = [];
      let sql = `
        SELECT mk.*, mt.ad AS mamul_turu_adi, mt.kod_prefix
        FROM mamul_kartlari mk
        INNER JOIN mamul_turleri mt ON mt.id = mk.mamul_turu_id
        WHERE 1 = 1
      `;

      if (term) {
        const likeTerm = `%${term}%`;
        sql += ` AND (mk.mamul_adi LIKE ? OR mk.article_no LIKE ? OR mk.article_code LIKE ? OR mk.renk LIKE ?)`;
        params.push(likeTerm, likeTerm, likeTerm, likeTerm);
      }

      sql += ` ORDER BY mk.updated_at DESC, mk.created_at DESC`;

      const rows = await allDb(sql, params);
      return rows.map(mapMamulCard);
    },

    async exportLabelTemplates() {
      const rows = await allDb(`SELECT template_id, name, template_json, is_active FROM label_templates ORDER BY created_at ASC`, []);
      if (!rows.length) {
        return null;
      }

      const header = 'template_id,name,is_active,template_json';
      const body = rows.map((row) => {
        const templateJson = escapeCsvValue(row.template_json);
        return [row.template_id, row.name, row.is_active, templateJson].join(',');
      }).join('\n');

      return `${header}\n${body}\n`;
    },

    async getActiveLabelTemplate() {
      let row = await getDb(`SELECT * FROM label_templates WHERE is_active = 1 LIMIT 1`, []);

      if (!row) {
        row = await getDb(`SELECT * FROM label_templates ORDER BY created_at ASC LIMIT 1`, []);
        if (row) {
          await runDb(`UPDATE label_templates SET is_active = 1 WHERE template_id = ?`, [row.template_id]);
        }
      }

      if (!row) {
        return null;
      }

      try {
        const template = JSON.parse(row.template_json);
        return { id: row.template_id, name: row.name, ...template };
      } catch {
        return { id: row.template_id, name: row.name };
      }
    },

    async listLabelTemplates() {
      return allDb(`SELECT id, template_id, name, is_active FROM label_templates ORDER BY created_at ASC`, []);
    },

    async getLabelTemplate(templateId) {
      const row = await getDb(`SELECT * FROM label_templates WHERE template_id = ? LIMIT 1`, [templateId]);
      if (!row) {
        return null;
      }

      try {
        const template = JSON.parse(row.template_json);
        return { ...template, id: row.template_id };
      } catch {
        return { id: row.template_id, name: row.name };
      }
    },

    async saveLabelTemplate({ templateId, name, template, setActive }) {
      const resolvedTemplateId = templateId || `template-${Date.now()}`;
      const resolvedName = String(name || '').trim() || `Şablon ${Date.now()}`;

      await runDb(
        `
          INSERT INTO label_templates (template_id, name, template_json, is_active)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(template_id) DO UPDATE SET
            name = excluded.name,
            template_json = excluded.template_json,
            is_active = excluded.is_active,
            updated_at = CURRENT_TIMESTAMP
        `,
        [resolvedTemplateId, resolvedName, JSON.stringify(template), setActive ? 1 : 0]
      );

      if (setActive) {
        await runDb(`UPDATE label_templates SET is_active = 0 WHERE template_id != ?`, [resolvedTemplateId]);
      }

      return { templateId: resolvedTemplateId, name: resolvedName };
    },

    async deleteLabelTemplate(templateId) {
      const result = await runDb(`DELETE FROM label_templates WHERE template_id = ?`, [templateId]);
      return { deleted: Boolean(result?.changes) };
    },

    async importLabelTemplates(rawText) {
      const rows = parseLabelTemplateCsv(rawText);
      const imported = [];
      const skipped = [];
      let activatedId = null;

      await runDb('BEGIN TRANSACTION');
      try {
        for (const row of rows) {
          const templateId = String(row.template_id || '').trim();
          const name = String(row.name || 'Şablon').trim();
          const isActive = String(row.is_active || '0').trim() !== '0';
          const templateJson = String(row.template_json || '').trim();

          if (!templateId) {
            skipped.push({ reason: 'template_id eksik', row });
            continue;
          }

          let templateData = { name, template_json: templateJson };
          try {
            if (templateJson) {
              const parsed = JSON.parse(templateJson);
              templateData = { name, template_json: JSON.stringify(parsed) };
            }
          } catch {
            skipped.push({ reason: 'template_json geçersiz', template_id: templateId });
            continue;
          }

          await runDb(
            `INSERT INTO label_templates (template_id, name, template_json, is_active)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(template_id) DO UPDATE SET
               name = excluded.name,
               template_json = excluded.template_json,
               updated_at = CURRENT_TIMESTAMP`,
            [templateId, name, templateData.template_json, isActive ? 1 : 0]
          );

          imported.push({ template_id: templateId, name });
          if (isActive) {
            activatedId = templateId;
          }
        }

        if (activatedId) {
          await runDb(`UPDATE label_templates SET is_active = 0 WHERE template_id != ?`, [activatedId]);
        }

        await runDb('COMMIT');
        return { importedCount: imported.length, skippedCount: skipped.length, templates: imported, skipped };
      } catch (err) {
        await runDb('ROLLBACK');
        throw err;
      }
    },

    async getEtiketAyarlari() {
      return allDb(`SELECT * FROM etiket_ayarlari ORDER BY sira_no ASC`, []);
    },

    async updateEtiketAyarlari(ayarlar) {
      await runDb('BEGIN TRANSACTION');
      try {
        await runDb(`UPDATE etiket_ayarlari SET sira_no = NULL, aktif = 0`);

        for (const [index, ayar] of ayarlar.entries()) {
          await runDb(
            `UPDATE etiket_ayarlari SET sira_no = ?, aktif = ? WHERE alan_adi = ?`,
            [index + 1, ayar.aktif ? 1 : 0, ayar.alan_adi]
          );
        }

        await runDb('COMMIT');
        return { message: 'Etiket ayarları başarıyla güncellendi' };
      } catch (err) {
        await runDb('ROLLBACK');
        throw err;
      }
    },

    async getPrefixAyarlari() {
      return allDb(`SELECT * FROM prefix_ayarlari ORDER BY prefix ASC`, []);
    },

    async createPrefix(prefixData) {
      const { prefix, aciklama } = prefixData;
      const result = await runDb(
        `INSERT INTO prefix_ayarlari (prefix, aciklama) VALUES (?, ?)`,
        [prefix.trim().toUpperCase(), aciklama?.trim() || '']
      );
      return { id: result?.lastID };
    },

    async deletePrefix(prefixId) {
      const result = await runDb(`DELETE FROM prefix_ayarlari WHERE id = ?`, [prefixId]);
      return { deleted: Boolean(result?.changes) };
    },

    async updatePrefix(prefixId, prefixData) {
      const { prefix, aciklama } = prefixData;
      const result = await runDb(
        `UPDATE prefix_ayarlari SET prefix = ?, aciklama = ? WHERE id = ?`,
        [prefix.trim().toUpperCase(), aciklama?.trim() || '', prefixId]
      );
      return { updated: Boolean(result?.changes) };
    }
  };
};

module.exports = { createLabelingService, mapMamulCard };
