import ExcelJS from 'exceljs';
import path from 'path';
import { pool } from '../src/db/pool.js';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/import-recommendations.js <path-to-xlsx>');
  process.exit(1);
}

function norm(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/ /g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HEADERS = {
  'Анализ / мониторинг': 'type',
  'ЦИКЛ':                'cycle',
  'Сфера':               'sphere',
  'Предложения':         'proposal',
  'Ответственный исполнитель': 'responsible',
  'Заинтересованные государственные органы': 'stakeholders',
  'Форма завершения':    'completionForm',
  'Срок исполнения':     'deadline',
  'Статус ГО':           'status',
  'Позиция ГО на 2024-2025гг.': 'position2024',
  'Позиция ГО на 27.03.2026':   'position2026',
  'Позиция АДГС':        'adgsPosition',
  'Кейс':                'caseNote',
};

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const sheet = wb.getWorksheet('перечень');
  if (!sheet) {
    console.error('Лист "перечень" не найден');
    process.exit(1);
  }

  // Строим маппинг: номер колонки → поле БД
  const headerRow = sheet.getRow(2);
  const colMap = {}; // colIndex → fieldName
  headerRow.eachCell((cell, colIdx) => {
    const h = norm(cell.value);
    // ищем по совпадению с trim (заголовки могут иметь trailing space)
    for (const [key, field] of Object.entries(HEADERS)) {
      if (h === key || h.startsWith(key)) {
        colMap[colIdx] = field;
        break;
      }
    }
  });

  console.log('Маппинг колонок:', colMap);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Backup
    await client.query(`
      CREATE TABLE IF NOT EXISTS recommendations_backup AS
        SELECT * FROM recommendations WHERE false
    `);
    await client.query(`INSERT INTO recommendations_backup SELECT * FROM recommendations`);
    const backupCount = await client.query(`SELECT count(*) FROM recommendations_backup`);
    console.log(`Backup: ${backupCount.rows[0].count} строк → recommendations_backup`);

    // Truncate
    await client.query(`TRUNCATE TABLE recommendations RESTART IDENTITY`);
    console.log('recommendations очищена');

    const insertSql = `
      INSERT INTO recommendations (
        id, type, cycle, sphere, proposal, responsible,
        stakeholders, "completionForm", deadline, status,
        "position2024", "position2026", "adgsPosition", "caseNote"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      )
    `;

    let inserted = 0;
    let skipped = 0;
    let idCounter = 1;

    for (let rowNo = 3; rowNo <= sheet.rowCount; rowNo++) {
      const row = sheet.getRow(rowNo);

      const rec = {};
      row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        if (colMap[colIdx]) {
          rec[colMap[colIdx]] = norm(cell.value);
        }
      });

      // Пропускаем пустые строки
      if (!rec.proposal) { skipped++; continue; }

      await client.query(insertSql, [
        idCounter++,
        rec.type        || '',
        rec.cycle       || '',
        rec.sphere      || '',
        rec.proposal    || '',
        rec.responsible || '',
        rec.stakeholders || '',
        rec.completionForm || '',
        rec.deadline    || '',
        rec.status      || '',
        rec.position2024 || '',
        rec.position2026 || '',
        rec.adgsPosition || '',
        rec.caseNote    || '',
      ]);
      inserted++;
    }

    await client.query('COMMIT');
    console.log(`\nИмпорт завершён: вставлено ${inserted}, пропущено ${skipped}`);

    // Проверка
    const check = await pool.query(`
      SELECT
        count(*)::int as all,
        count(*) filter (where status ilike 'в работе%' or status = 'Не поддерживается')::int as active,
        count(*) filter (where status ilike 'исполнено%')::int as done,
        count(*) filter (where status = 'Не поддерживается - исключить')::int as excluded
      FROM recommendations
    `);
    console.log('\n=== Итоговые цифры ===');
    console.log(JSON.stringify(check.rows[0], null, 2));

    console.log('\n=== Распределение статусов ===');
    const dist = await pool.query(`SELECT status, count(*)::int FROM recommendations GROUP BY status ORDER BY 2 DESC`);
    dist.rows.forEach(r => console.log(`  ${String(r.status).padEnd(40)} ${r.count}`));

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Ошибка:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
