import express from 'express';
import ExcelJS from 'exceljs';
import { pool } from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware, requireRole('admin', 'analyst'));

router.get('/', async (req, res) => {
  try {
    const { cycle, status, sphere, responsible, q } = req.query;

    const conditions = [];
    const values = [];

    if (cycle) { values.push(cycle); conditions.push(`cycle = $${values.length}`); }
    if (status) { values.push(status); conditions.push(`status_normalized = $${values.length}`); }
    if (sphere) { values.push(sphere); conditions.push(`sphere = $${values.length}`); }
    if (responsible) { values.push(`%${responsible}%`); conditions.push(`responsible_org ilike $${values.length}`); }
    if (q) {
      values.push(`%${q}%`);
      const i = values.length;
      conditions.push(`(proposal_text ilike $${i} OR responsible_org ilike $${i} OR sphere ilike $${i})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT
        cycle,
        sphere,
        record_type,
        proposal_text,
        responsible_org,
        interested_orgs,
        completion_form,
        due_raw,
        status_normalized,
        position_go_2024_2025,
        position_go_2026_03_27,
        position_adgs,
        case_raw
      FROM registry_records
      ${where}
      ORDER BY cycle, sphere
    `;

    const result = await pool.query(sql, values);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('перечень');

    sheet.columns = [
      { header: 'Цикл',                 key: 'cycle',                  width: 8  },
      { header: 'Сфера',                key: 'sphere',                 width: 26 },
      { header: 'Тип',                  key: 'record_type',            width: 14 },
      { header: 'Предложение/поручение',key: 'proposal_text',          width: 60 },
      { header: 'Ответственный орган',  key: 'responsible_org',        width: 30 },
      { header: 'Заинтересованные',     key: 'interested_orgs',        width: 30 },
      { header: 'Форма исполнения',     key: 'completion_form',        width: 20 },
      { header: 'Срок',                 key: 'due_raw',                width: 14 },
      { header: 'Статус',               key: 'status_normalized',      width: 22 },
      { header: 'Позиция ГО 2024-2025', key: 'position_go_2024_2025',  width: 28 },
      { header: 'Позиция ГО 27.03.2026',key: 'position_go_2026_03_27', width: 28 },
      { header: 'Позиция АДГС',         key: 'position_adgs',          width: 28 },
      { header: 'Дело',                 key: 'case_raw',               width: 16 },
    ];

    // Стиль заголовка
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    headerRow.alignment = { wrapText: true, vertical: 'middle' };
    headerRow.height = 32;

    // Данные
    result.rows.forEach(row => {
      const added = sheet.addRow(row);
      added.alignment = { wrapText: true, vertical: 'top' };
    });

    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="registry-export.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('export error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
