import path from 'node:path';
import { pool } from './db/pool.js';
import { readWorkbook } from './readers/read-xlsx.js';
import { normalizeSphere } from './normalizers/sphere.js';
import { normalizeStatus } from './normalizers/status.js';
import { normalizeText } from './normalizers/text.js';
import { upsertRecommendation } from './upsert/upsert-recommendation.js';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Укажите путь к Excel-файлу');
  process.exit(1);
}

function normalizeRecordType(value, rowNo) {
  const type = normalizeText(value).toLowerCase();
  if (type === 'мониторинг') return 'Мониторинг';
  if (type === 'анализ') return 'Анализ';
  throw new Error(`Строка ${rowNo}: неизвестный тип записи`);
}

function normalizeOrg(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(part => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

async function main() {
  const { sheetName, rows } = readWorkbook(filePath);
  if (sheetName.toLowerCase() !== 'перечень') {
    throw new Error('Лист "перечень" не найден');
  }

  const dataRows = rows.slice(2, 1337);
  if (dataRows.length !== 1335) {
    throw new Error(`Ожидалось 1335 строк данных, получено ${dataRows.length}`);
  }

  let processed = 0;
  for (const [index, row] of dataRows.entries()) {
    const rowNo = index + 3;
    const seqNo = Number(normalizeText(row[0]));
    const proposalText = normalizeText(row[4]);
    if (!Number.isInteger(seqNo) || !proposalText) {
      throw new Error(`Строка ${rowNo}: некорректный П/п или пустое предложение`);
    }

    const recordType = normalizeRecordType(row[1], rowNo);
    const sphere = normalizeSphere(row[3]);
    const status = normalizeStatus(row[9]);
    await upsertRecommendation({
      seq_no: seqNo,
      record_type_raw: recordType,
      record_type_normalized: recordType,
      cycle: normalizeText(row[2]),
      sphere_raw: sphere.raw,
      sphere_normalized: sphere.normalized,
      proposal_text: proposalText,
      responsible_org: normalizeOrg(row[5]),
      interested_orgs: normalizeText(row[6]),
      completion_form: normalizeText(row[7]),
      due_raw: normalizeText(row[8]),
      status_raw: status.raw,
      status_normalized: status.normalized,
      status_group: status.group,
      source_row_no: rowNo,
      source_file_name: path.basename(filePath),
      source_sheet_name: sheetName,
      quality_flag: status.raw && sphere.raw ? 'ok' : 'incomplete',
    });
    processed += 1;
  }

  console.log(`Лист: ${sheetName}; обработано строк: ${processed}`);
  await pool.end();
}

main().catch(async error => {
  console.error(error.message);
  await pool.end();
  process.exit(1);
});
