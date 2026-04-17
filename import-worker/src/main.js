import path from 'path';
import xlsx from 'xlsx';
import crypto from 'crypto';
import { pool } from './db/pool.js';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Укажите путь к Excel-файлу');
  console.error('Пример: node src/main.js "/Users/askhat/projects/post-monitoring-app/Пост-мониторинг свод на 06.04.xlsx"');
  process.exit(1);
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Нормализация статуса
function normalizeStatus(value) {
  const raw = normalizeText(value);
  const v = raw.toLowerCase();

  if (!raw) return { raw, normalized: 'Без статуса', group: 'unknown' };
  if (v.includes('исполн')) return { raw, normalized: 'Исполнено', group: 'done' };
  if (v.includes('в работе')) return { raw, normalized: 'В работе', group: 'active' };
  if (v.includes('не поддерж')) return { raw, normalized: 'Не поддерживается', group: 'rejected' };
  if (v.includes('исключ')) return { raw, normalized: 'Исключить', group: 'excluded' };
  if (v.includes('на рассмотр')) return { raw, normalized: 'На рассмотрении', group: 'active' };

  return { raw, normalized: raw, group: 'unknown' };
}

// Нормализация сферы
function normalizeSphere(value) {
  const raw = normalizeText(value);
  const v = raw.toLowerCase();

  if (!raw) return { raw, normalized: 'Без сферы' };

  if (v === 'госзакупки') return { raw, normalized: 'Госзакупки' };
  if (['цифровизация', 'цифровое развитие', 'цифровые развития'].includes(v))
    return { raw, normalized: 'Цифровизация' };
  if (v === 'госуслуги') return { raw, normalized: 'Госуслуги' };
  if (v === 'госслужба') return { raw, normalized: 'Госслужба' };

  return { raw, normalized: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

function buildRecordHash(row) {
  const source = [
    normalizeText(row.cycle).toLowerCase(),
    normalizeText(row.sphere_normalized || row.sphere_raw).toLowerCase(),
    normalizeText(row.proposal_text).toLowerCase(),
    normalizeText(row.responsible_org).toLowerCase()
  ].join('|');

  return crypto.createHash('sha256').update(source).digest('hex');
}

async function upsertRecord(rec) {
  const sql = `
    insert into monitoring.recommendations (
      record_hash,
      seq_no,
      record_type_raw,
      record_type_normalized,
      cycle,
      sphere_raw,
      sphere_normalized,
      proposal_text,
      responsible_org,
      interested_orgs,
      completion_form,
      due_raw,
      status_raw,
      status_normalized,
      status_group,
      source_row_no,
      source_file_name,
      source_sheet_name,
      quality_flag
    )
    values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19
    )
    on conflict (record_hash) do update set
      cycle             = excluded.cycle,
      sphere_raw        = excluded.sphere_raw,
      sphere_normalized = excluded.sphere_normalized,
      proposal_text     = excluded.proposal_text,
      responsible_org   = excluded.responsible_org,
      interested_orgs   = excluded.interested_orgs,
      completion_form   = excluded.completion_form,
      due_raw           = excluded.due_raw,
      status_raw        = excluded.status_raw,
      status_normalized = excluded.status_normalized,
      status_group      = excluded.status_group,
      source_row_no     = excluded.source_row_no,
      source_file_name  = excluded.source_file_name,
      source_sheet_name = excluded.source_sheet_name,
      quality_flag      = excluded.quality_flag,
      updated_at        = now()
  `;

  const params = [
    rec.record_hash,
    rec.seq_no,
    rec.record_type_raw,
    rec.record_type_normalized,
    rec.cycle,
    rec.sphere_raw,
    rec.sphere_normalized,
    rec.proposal_text,
    rec.responsible_org,
    rec.interested_orgs,
    rec.completion_form,
    rec.due_raw,
    rec.status_raw,
    rec.status_normalized,
    rec.status_group,
    rec.source_row_no,
    rec.source_file_name,
    rec.source_sheet_name,
    rec.quality_flag
  ];

  await pool.query(sql, params);
}

async function main() {
  const workbook = xlsx.readFile(filePath);

  // Берём именно лист "перечень"
  const sheetName = workbook.SheetNames.find(
    (name) => name.toLowerCase() === 'перечень'
  ) || workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];

  const rows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false
  });

  console.log(`Читаем лист: "${sheetName}", строк: ${rows.length}`);

  // Строка 2 с заголовками (индекс 1, т.к. индекс 0 — первая строка)
  if (rows.length < 2) {
    throw new Error('На листе меньше двух строк, нет заголовков');
  }

  const headerRow = rows[1].map(normalizeText);
  console.log('Заголовки:', headerRow);

  function colIndex(name) {
    return headerRow.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  }

  const COL = {
    seqNo:           colIndex('П/п'),
    recordType:      colIndex('Анализ / мониторинг'),
    cycle:           colIndex('ЦИКЛ'),
    sphere:          colIndex('Сфера'),
    proposal:        colIndex('Предложения'),
    responsible:     colIndex('Ответственный исполнитель'),
    interested:      colIndex('Заинтересованные государственные органы'),
    completionForm:  colIndex('Форма завершения'),
    due:             colIndex('Срок исполнения'),
    status:          colIndex('Статус ГО'),
  };

  console.log('Маппинг колонок:', COL);

  const dataRows = rows.slice(2); // начиная с строки 3

  let insertedOrUpdated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNo = 3 + i; // строка в Excel (1‑based)

    // Пустые строки пропускаем
    if (!row || row.every((c) => normalizeText(c) === '')) {
      skipped++;
      continue;
    }

    const proposalText = COL.proposal >= 0 ? normalizeText(row[COL.proposal]) : '';
    if (!proposalText) {
      skipped++;
      continue;
    }

    const statusObj = normalizeStatus(
      COL.status >= 0 ? row[COL.status] : ''
    );
    const sphereObj = normalizeSphere(
      COL.sphere >= 0 ? row[COL.sphere] : ''
    );

    const rec = {
      seq_no: COL.seqNo >= 0 ? Number(row[COL.seqNo]) || null : null,
      record_type_raw: COL.recordType >= 0 ? normalizeText(row[COL.recordType]) : '',
      record_type_normalized: COL.recordType >= 0 ? normalizeText(row[COL.recordType]) : '',
      cycle: COL.cycle >= 0 ? normalizeText(row[COL.cycle]) : '',
      sphere_raw: sphereObj.raw,
      sphere_normalized: sphereObj.normalized,
      proposal_text: proposalText,
      responsible_org: COL.responsible >= 0 ? normalizeText(row[COL.responsible]) : '',
      interested_orgs: COL.interested >= 0 ? normalizeText(row[COL.interested]) : '',
      completion_form: COL.completionForm >= 0 ? normalizeText(row[COL.completionForm]) : '',
      due_raw: COL.due >= 0 ? normalizeText(row[COL.due]) : '',
      status_raw: statusObj.raw,
      status_normalized: statusObj.normalized,
      status_group: statusObj.group,
      source_row_no: rowNo,
      source_file_name: path.basename(filePath),
      source_sheet_name: sheetName,
      quality_flag:
        (!statusObj.raw ? 'no_status' : '') ||
        (sphereObj.normalized === 'Без сферы' ? 'no_sphere' : 'ok'),
    };

    rec.record_hash = buildRecordHash(rec);

    try {
      await upsertRecord(rec);
      insertedOrUpdated++;
    } catch (err) {
      errors++;
      console.error(`Ошибка строки ${rowNo}: ${err.message}`);
    }

    if (rowNo % 100 === 0) {
      console.log(
        `Обработано строк: ${rowNo}/${rows.length}, upsert: ${insertedOrUpdated}, пропущено: ${skipped}, ошибок: ${errors}`
      );
    }
  }

  console.log('');
  console.log('===== Результат v2 (табличный лист) =====');
  console.log(`Лист: ${sheetName}`);
  console.log(`Всего строк (включая заголовки): ${rows.length}`);
  console.log(`Строк данных: ${dataRows.length}`);
  console.log(`Upsert (insert+update): ${insertedOrUpdated}`);
  console.log(`Пропущено: ${skipped}`);
  console.log(`Ошибок: ${errors}`);
  console.log('=========================================');
  console.log('');

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
