import express from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';


const router = express.Router();
router.use(authMiddleware, requireRole('admin', 'analyst'));
const upload = multer({ storage: multer.memoryStorage() });


function norm(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}


const STATUS_MAP = {
  'не поддерживается - исключить': 'Для снятия с контроля',
  'не поддерживается': 'Для снятия с контроля',
};

function normalizeStatus(statusRaw) {
  const v = norm(statusRaw);
  if (!v) return '';
  const lower = v.toLowerCase().trim();
  if (STATUS_MAP[lower]) return STATUS_MAP[lower];
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}


const HEADER_MAP = {
  'П/п': 'row_number',
  'Анализ / мониторингB2:N155M146B2:O16B2:N161': 'record_type',
  'ЦИКЛ': 'cycle',
  'Сфера': 'sphere',
  'Предложения': 'proposal_text',
  'Ответственный исполнитель': 'responsible_org',
  'Заинтересованные государственные органы': 'interested_orgs',
  'Форма завершения': 'completion_form',
  'Срок исполнения': 'due_raw',
  'Статус ГО': 'status_raw',
  'Позиция ГО на 2024-2025гг.': 'position_go_2024_2025',
  'Позиция ГО на 27.03.2026': 'position_go_2026_03_27',
  'Позиция АДГС': 'position_adgs',
  'Кейс': 'case_raw',
};


// ---------- IMPORT ----------
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не передан' });
    }

    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS import_hashes (
        hash TEXT PRIMARY KEY,
        filename TEXT,
        imported_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const existing = await pool.query('SELECT filename, imported_at FROM import_hashes WHERE hash = $1', [fileHash]);
    if (existing.rowCount > 0) {
      const row = existing.rows[0];
      const when = new Date(row.imported_at).toLocaleString('ru', { timeZone: 'Asia/Almaty' });
      return res.status(409).json({
        error: `Этот файл уже был загружен (${row.filename || 'файл'}, ${when})`,
        duplicate: true,
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);


    const sheet = workbook.getWorksheet('перечень');
    if (!sheet) {
      return res.status(400).json({ error: 'Лист "перечень" не найден в файле' });
    }


    const headerRowIdx = 2;
    const headerRow = sheet.getRow(headerRowIdx);
    const headerExcel = headerRow.values.slice(1).map(norm);


    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('truncate table registry_records restart identity;');


      const insertSql = `
        insert into registry_records (
          row_number,
          record_type,
          cycle,
          sphere,
          proposal_text,
          responsible_org,
          interested_orgs,
          completion_form,
          due_raw,
          status_raw,
          status_normalized,
          position_go_2024_2025,
          position_go_2026_03_27,
          position_adgs,
          case_raw
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
        )
      `;


      let inserted = 0;


      for (let rowNumber = headerRowIdx + 1; rowNumber <= sheet.rowCount; rowNumber++) {
        const row = sheet.getRow(rowNumber);
        const cells = row.values.slice(1);
        const hasAny = cells.some(
          v => v !== null && v !== undefined && String(v).trim() !== '',
        );
        if (!hasAny) continue;


        const rec = {};
        for (const [src, dst] of Object.entries(HEADER_MAP)) {
          const idx = headerExcel.indexOf(src);
          rec[dst] = idx === -1 ? '' : norm(cells[idx]);
        }


        let rowNumberVal = rec.row_number || null;
        if (rowNumberVal) {
          const parsed = parseInt(String(rowNumberVal).replace(',', '.'), 10);
          rowNumberVal = Number.isNaN(parsed) ? null : parsed;
        }


        const statusRaw = rec.status_raw || '';
        const statusNormalized = normalizeStatus(statusRaw);


        await client.query(insertSql, [
          rowNumberVal,
          rec.record_type || '',
          rec.cycle || '',
          rec.sphere || '',
          rec.proposal_text || '',
          rec.responsible_org || '',
          rec.interested_orgs || '',
          rec.completion_form || '',
          rec.due_raw || '',
          statusRaw,
          statusNormalized,
          rec.position_go_2024_2025 || '',
          rec.position_go_2026_03_27 || '',
          rec.position_adgs || '',
          rec.case_raw || '',
        ]);


        inserted += 1;
      }


      await client.query('commit');
      await pool.query(
        'INSERT INTO import_hashes (hash, filename) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [fileHash, req.file.originalname],
      );
      return res.json({ ok: true, rows: inserted });
    } catch (e) {
      await client.query('rollback');
      console.error('IMPORT ERROR:', e);
      return res
        .status(500)
        .json({ error: 'Ошибка при импорте', details: e.message });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('IMPORT HANDLER ERROR:', err);
    return res
      .status(500)
      .json({ error: 'Ошибка обработки файла', details: err.message });
  }
});


// ---------- EXPORT ----------
router.get('/export', async (req, res) => {
  try {
    const {
      cycle = '',
      status = '',
      sphere = '',
      responsible = '',
      q = '',
    } = req.query;


    const values = [];
    const where = [];


    if (q) {
      values.push(`%${q}%`);
      const i = values.length;
      where.push(`(
        coalesce(proposal_text,'') ilike $${i}
        or coalesce(responsible_org,'') ilike $${i}
        or coalesce(sphere,'') ilike $${i}
      )`);
    }


    if (cycle) {
      values.push(cycle.trim());
      where.push(`btrim(coalesce(cycle,'')) = $${values.length}`);
    }


    if (status) {
      values.push(status.trim().toLowerCase());
      where.push(`lower(btrim(coalesce(status_normalized,''))) = $${values.length}`);
    }


    if (sphere) {
      values.push(sphere.trim());
      where.push(`btrim(coalesce(sphere,'')) = $${values.length}`);
    }


    if (responsible) {
      values.push(`%${responsible.trim()}%`);
      where.push(`coalesce(responsible,'') ilike $${values.length}`);
    }


    const whereSql = where.length ? `where ${where.join(' and ')}` : '';


    const sql = `
      select
        coalesce(row_number, id)         as "№",
        record_type                      as "Тип записи",
        cycle                            as "Цикл",
        sphere                           as "Сфера",
        proposal_text                    as "Предложение",
        responsible_org                  as "Ответственный",
        interested_orgs                  as "Заинтересованные органы",
        completion_form                  as "Форма завершения",
        due_raw                          as "Срок исполнения",
        status_raw                       as "Статус ГО (raw)",
        status_normalized                as "Статус ГО (норм.)",
        position_go_2024_2025            as "Позиция ГО 2024-2025",
        position_go_2026_03_27           as "Позиция ГО 27.03.2026",
        position_adgs                    as "Позиция АДГС",
        case_raw                         as "Кейс"
      from registry_records
      ${whereSql}
      order by coalesce(row_number, id) asc, id asc
    `;


    const { rows } = await pool.query(sql, values);


    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('реестр');


    if (rows.length === 0) {
      sheet.addRow(['Нет данных по заданным фильтрам']);
    } else {
      const headers = Object.keys(rows[0]);
      sheet.addRow(headers);
      rows.forEach(r => {
        sheet.addRow(headers.map(h => r[h]));
      });
      sheet.columns.forEach(col => {
        let maxLength = 10;
        col.eachCell({ includeEmpty: true }, cell => {
          const v = cell.value ? String(cell.value) : '';
          maxLength = Math.max(maxLength, v.length);
        });
        col.width = Math.min(maxLength + 2, 80);
      });
    }


    const fileName = `registry_export_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;


    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );


    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('EXPORT ERROR:', err);
    res
      .status(500)
      .json({ error: 'Ошибка при экспорте', details: err.message });
  }
});


export default router;