#!/usr/bin/env node
// Clean import: xlsx → public.recommendations + public.recommendation_responsible
// Usage: DATABASE_URL=postgresql://... node tools/clean-import.js [path/to/file.xlsx]
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import xlsx from 'xlsx';
import { parseResponsible } from '../backend/src/lib/parseResponsible.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filePath = process.argv[2]
  || path.join(__dirname, 'import', 'Пост-мониторинг свод на 14.04.xlsx');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('ERROR: DATABASE_URL is required'); process.exit(1); }

const pool = new pg.Pool({ connectionString: dbUrl });

function normalizeText(value) {
  return String(value ?? '')
    .replace(/ /g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Preserve newlines so parseResponsible can split multi-org values
function normalizeOrg(value) {
  return String(value ?? '')
    .replace(/ /g, ' ')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function normalizeStatus(value) {
  const raw = normalizeText(value);
  const v = raw.toLowerCase();
  if (!raw) return { raw, normalized: '', group: 'unknown' };
  if (v.includes('исполн'))                            return { raw, normalized: 'Исполнено',                      group: 'done'     };
  if (v.includes('в работе') || v.includes('рассмотр')) return { raw, normalized: 'В работе',                       group: 'active'   };
  if (v.includes('не поддерж') && v.includes('исключ')) return { raw, normalized: 'Не поддерживается - исключить',  group: 'excluded' };
  if (v.includes('не поддерж'))                        return { raw, normalized: 'Не поддерживается',              group: 'active'   };
  if (v.includes('исключ'))                            return { raw, normalized: 'Исключить',                      group: 'excluded' };
  return { raw, normalized: raw, group: 'unknown' };
}

function normalizeSphere(value) {
  const raw = normalizeText(value);
  const v = raw.toLowerCase();
  if (!raw) return { raw, normalized: '' };
  if (v === 'госзакупки') return { raw, normalized: 'Госзакупки' };
  if (['цифровизация', 'цифровое развитие', 'цифровые развития'].includes(v)) return { raw, normalized: 'Цифровизация' };
  if (v === 'госуслуги')  return { raw, normalized: 'Госуслуги' };
  if (v === 'госслужба')  return { raw, normalized: 'Госслужба' };
  return { raw, normalized: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

async function main() {
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'перечень') || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });

  console.log(`File: ${path.basename(filePath)}`);
  console.log(`Sheet: "${sheetName}", total rows (incl. headers): ${rows.length}`);

  const headerRow = rows[1].map(normalizeText);

  function col(name) {
    const exact = headerRow.findIndex(h => h.toLowerCase() === name.toLowerCase());
    if (exact >= 0) return exact;
    return headerRow.findIndex(h => h.toLowerCase().startsWith(name.toLowerCase().slice(0, 8)));
  }

  const COL = {
    seqNo:          col('П/п'),
    recordType:     col('Анализ / мониторинг'),
    cycle:          col('ЦИКЛ'),
    sphere:         col('Сфера'),
    proposal:       col('Предложения'),
    responsible:    col('Ответственный исполнитель'),
    interested:     col('Заинтересованные государственные органы'),
    completionForm: col('Форма завершения'),
    due:            col('Срок исполнения'),
    status:         col('Статус ГО'),
    position2024:   headerRow.findIndex(h => h.includes('2024')),
    position2026:   headerRow.findIndex(h => h.includes('2026')),
    adgs:           col('Позиция АДГС'),
    caseNote:       col('Кейс'),
  };

  console.log('Column map:', JSON.stringify(COL));

  // Truncate all data (clean slate)
  console.log('\nTruncating existing data...');
  await pool.query(`
    TRUNCATE public.recommendation_responsible, public.status_history, public.recommendations
    RESTART IDENTITY CASCADE
  `);

  const dataRows = rows.slice(2);
  let inserted = 0, skipped = 0, errors = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNo = 3 + i;

    if (!row || row.every(c => !String(c).trim())) { skipped++; continue; }

    const proposalText = COL.proposal >= 0 ? normalizeText(row[COL.proposal]) : '';
    if (!proposalText) { skipped++; continue; }

    const statusObj  = normalizeStatus(COL.status       >= 0 ? row[COL.status]       : '');
    const sphereObj  = normalizeSphere(COL.sphere        >= 0 ? row[COL.sphere]        : '');
    const responsible = COL.responsible >= 0 ? normalizeOrg(row[COL.responsible]) : '';

    try {
      const { rows: [{ id: recId }] } = await pool.query(`
        INSERT INTO recommendations (
          seq_no, record_type_raw, record_type_normalized,
          cycle, sphere_raw, sphere_normalized, proposal_text,
          responsible_org, interested_orgs, completion_form, due_raw,
          status_raw, status_normalized, status_group,
          position_2024_2025, position_2026, adgs_position, case_note,
          source_row_no, source_file_name, source_sheet_name, quality_flag
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
        ) RETURNING id
      `, [
        COL.seqNo         >= 0 ? (Number(row[COL.seqNo]) || null) : null,
        COL.recordType    >= 0 ? normalizeText(row[COL.recordType]) : '',
        COL.recordType    >= 0 ? normalizeText(row[COL.recordType]) : '',
        COL.cycle         >= 0 ? normalizeText(row[COL.cycle]) : '',
        sphereObj.raw,
        sphereObj.normalized,
        proposalText,
        responsible,
        COL.interested    >= 0 ? normalizeText(row[COL.interested])    : '',
        COL.completionForm >= 0 ? normalizeText(row[COL.completionForm]) : '',
        COL.due           >= 0 ? normalizeText(row[COL.due])           : '',
        statusObj.raw,
        statusObj.normalized,
        statusObj.group,
        COL.position2024  >= 0 ? normalizeText(row[COL.position2024])  : '',
        COL.position2026  >= 0 ? normalizeText(row[COL.position2026])  : '',
        COL.adgs          >= 0 ? normalizeText(row[COL.adgs])          : '',
        COL.caseNote      >= 0 ? normalizeText(row[COL.caseNote])      : '',
        rowNo,
        path.basename(filePath),
        sheetName,
        !statusObj.raw ? 'no_status' : (sphereObj.normalized ? 'ok' : 'no_sphere'),
      ]);

      // Sync link table
      const { primary, co } = parseResponsible(responsible);
      if (primary) {
        await pool.query(
          `INSERT INTO recommendation_responsible (record_id, org_name, role)
           VALUES ($1, $2, 'primary') ON CONFLICT DO NOTHING`,
          [recId, primary]
        );
        for (const org of co) {
          await pool.query(
            `INSERT INTO recommendation_responsible (record_id, org_name, role)
             VALUES ($1, $2, 'co') ON CONFLICT DO NOTHING`,
            [recId, org]
          );
        }
      }

      inserted++;
    } catch (e) {
      errors++;
      console.error(`  Row ${rowNo}: ${e.message}`);
    }

    if (rowNo % 200 === 0) {
      process.stdout.write(`  ${rowNo}/${rows.length}\r`);
    }
  }

  // Verification query
  const { rows: [cnt] } = await pool.query(`
    SELECT
      count(*)::int                                                            AS total,
      count(*) FILTER (WHERE status_normalized ilike 'исполнено%')::int       AS done,
      count(*) FILTER (WHERE status_normalized ilike 'в работе%'
                          OR status_normalized = 'Не поддерживается')::int   AS active,
      count(*) FILTER (WHERE status_normalized ilike 'не поддерживается%исключ%')::int AS excluded
    FROM recommendations
  `);

  console.log('\n===== Clean Import Complete =====');
  console.log(`Inserted: ${inserted}  Skipped: ${skipped}  Errors: ${errors}`);
  console.log(`Total: ${cnt.total} / Done: ${cnt.done} / Active: ${cnt.active} / Excluded: ${cnt.excluded}`);
  console.log('=================================\n');

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
