#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import xlsx from 'xlsx';
import { parseResponsible } from '../backend/src/lib/parseResponsible.js';

const { Pool } = pg;

const FILE_NAME = 'Пост-мониторинг свод на 14.04.xlsx';
const SHEET_NAME = 'перечень';
const FIRST_DATA_ROW = 3;
const LAST_DATA_ROW = 1337;
const EXPECTED = Object.freeze({ total: 1335, active: 667, done: 475, excluded: 193 });

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function normalizeRecordType(value, rowNo) {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'мониторинг') return 'Мониторинг';
  if (raw === 'анализ') return 'Анализ';
  throw new Error(`Строка ${rowNo}: неизвестный тип записи "${normalizeText(value)}"`);
}

function normalizeStatus(value, rowNo) {
  const raw = normalizeText(value);
  const normalized = raw.toLowerCase();

  if (normalized === 'в работе') return 'В работе';
  if (normalized === 'не поддерживается') return 'Не поддерживается';
  if (normalized === 'исполнено') return 'Исполнено';
  if (
    normalized === 'не поддерживается - исключить'
    || normalized.startsWith('для снятия с контроля')
  ) {
    return 'Для снятия с контроля';
  }

  throw new Error(`Строка ${rowNo}: неизвестный статус "${raw}"`);
}

function resolveInputPath(explicitPath) {
  if (explicitPath) return path.resolve(explicitPath);

  const candidates = [
    path.join(os.homedir(), 'Downloads', FILE_NAME),
    path.join(projectRoot, FILE_NAME),
    path.join(projectRoot, 'tools', 'import', FILE_NAME),
  ];
  const found = candidates.find(existsSync);
  if (!found) {
    throw new Error(`Файл ${FILE_NAME} не найден; передайте путь первым аргументом`);
  }
  return found;
}

export function readImportRows(filePath) {
  if (!existsSync(filePath)) throw new Error(`Файл не найден: ${filePath}`);

  const workbook = xlsx.readFile(filePath, { sheetRows: LAST_DATA_ROW });
  const worksheet = workbook.Sheets[SHEET_NAME];
  if (!worksheet) throw new Error(`Лист "${SHEET_NAME}" не найден`);

  const rows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: true,
    raw: false,
  });

  if (rows.length < LAST_DATA_ROW) {
    throw new Error(
      `На листе "${SHEET_NAME}" доступно только ${rows.length} строк; требуется ${LAST_DATA_ROW}`,
    );
  }

  const createdAt = new Date();
  const records = [];
  for (let rowNo = FIRST_DATA_ROW; rowNo <= LAST_DATA_ROW; rowNo += 1) {
    const row = rows[rowNo - 1] ?? [];
    const seqNo = Number(normalizeText(row[0]));
    if (!Number.isInteger(seqNo) || seqNo <= 0) {
      throw new Error(`Строка ${rowNo}: некорректный П/п "${normalizeText(row[0])}"`);
    }

    const proposalText = normalizeText(row[4]);
    if (!proposalText) throw new Error(`Строка ${rowNo}: пустое предложение`);

    records.push({
      id: randomUUID(),
      seqNo,
      recordType: normalizeRecordType(row[1], rowNo),
      cycle: normalizeText(row[2]),
      sphere: normalizeText(row[3]),
      proposalText,
      responsibleOrg: normalizeOrg(row[5]),
      interestedOrgs: normalizeText(row[6]),
      completionForm: normalizeText(row[7]),
      dueRaw: normalizeText(row[8]),
      status: normalizeStatus(row[9], rowNo),
      createdAt,
    });
  }

  const uniqueSeq = new Set(records.map(record => record.seqNo));
  if (records.length !== EXPECTED.total || uniqueSeq.size !== EXPECTED.total) {
    throw new Error(
      `Ожидалось ${EXPECTED.total} уникальных строк, получено ${records.length} строк / ${uniqueSeq.size} П/п`,
    );
  }

  return records;
}

async function assertUuidSchema(client) {
  const requiredColumns = [
    'id', 'seq_no', 'record_type_normalized', 'cycle', 'sphere_normalized',
    'proposal_text', 'responsible_org', 'interested_orgs', 'completion_form',
    'due_raw', 'status_normalized', 'created_at', 'updated_at',
  ];
  const result = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recommendations'
      AND column_name = ANY($1::text[])
  `, [requiredColumns]);

  const columns = new Map(result.rows.map(row => [row.column_name, row.data_type]));
  const missing = requiredColumns.filter(column => !columns.has(column));
  if (missing.length > 0 || columns.get('id') !== 'uuid') {
    throw new Error(
      'public.recommendations не соответствует UUID-схеме; примените sql/009_public_recommendations_uuid.sql',
    );
  }
}

async function insertRecommendations(client, records) {
  const columnsPerRow = 13;
  const values = [];
  const tuples = records.map((record, rowIndex) => {
    const start = rowIndex * columnsPerRow;
    values.push(
      record.id,
      record.seqNo,
      record.recordType,
      record.cycle,
      record.sphere,
      record.proposalText,
      record.responsibleOrg,
      record.interestedOrgs,
      record.completionForm,
      record.dueRaw,
      record.status,
      record.createdAt,
      record.createdAt,
    );
    return `(${Array.from({ length: columnsPerRow }, (_, index) => `$${start + index + 1}`).join(',')})`;
  });

  await client.query(`
    INSERT INTO public.recommendations (
      id, seq_no, record_type_normalized, cycle, sphere_normalized,
      proposal_text, responsible_org, interested_orgs, completion_form,
      due_raw, status_normalized, created_at, updated_at
    ) VALUES ${tuples.join(',')}
  `, values);
}

async function ensureResponsibleTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.recommendation_responsible (
      id bigserial primary key,
      record_id uuid not null references public.recommendations(id) on delete cascade,
      org_name text not null,
      role text not null check (role in ('primary', 'co')),
      position int not null,
      created_at timestamptz not null default now()
    )
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_rec_resp_record_org
      ON public.recommendation_responsible(record_id, org_name)
  `);
}

async function copyMonitoringResponsible(client) {
  const tables = await client.query(`
    SELECT
      to_regclass('monitoring.recommendations') IS NOT NULL AS has_recommendations,
      to_regclass('monitoring.recommendation_responsible') IS NOT NULL AS has_responsible
  `);
  if (!tables.rows[0]?.has_recommendations || !tables.rows[0]?.has_responsible) return 0;

  const duplicates = await client.query(`
    SELECT count(*)::int AS count
    FROM (
      SELECT seq_no
      FROM monitoring.recommendations
      WHERE seq_no IS NOT NULL
      GROUP BY seq_no
      HAVING count(*) > 1
    ) duplicate_seq
  `);
  if (duplicates.rows[0].count > 0) {
    throw new Error('monitoring.recommendations содержит дубли seq_no; перенос связей неоднозначен');
  }

  const sourceColumns = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'monitoring'
      AND table_name = 'recommendation_responsible'
      AND column_name IN ('position', 'created_at')
  `);
  const available = new Set(sourceColumns.rows.map(row => row.column_name));
  const fallbackPosition = `
    row_number() OVER (
      PARTITION BY mr.record_id
      ORDER BY CASE mr.role WHEN 'primary' THEN 0 ELSE 1 END, mr.org_name, mr.id
    ) - 1
  `;
  const positionExpression = available.has('position')
    ? `coalesce(mr.position, ${fallbackPosition})`
    : fallbackPosition;
  const createdAtExpression = available.has('created_at') ? 'mr.created_at' : 'now()';

  const result = await client.query(`
    INSERT INTO public.recommendation_responsible (
      record_id, org_name, role, position, created_at
    )
    SELECT
      target.id,
      mr.org_name,
      mr.role,
      ${positionExpression},
      ${createdAtExpression}
    FROM monitoring.recommendation_responsible mr
    JOIN monitoring.recommendations source ON source.id = mr.record_id
    JOIN public.recommendations target ON target.seq_no = source.seq_no
    ON CONFLICT (record_id, org_name) DO NOTHING
  `);
  return result.rowCount;
}

async function fillMissingResponsible(client, importedAt) {
  const result = await client.query(`
    SELECT r.id, r.responsible_org
    FROM public.recommendations r
    WHERE coalesce(btrim(r.responsible_org), '') <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM public.recommendation_responsible rr
        WHERE rr.record_id = r.id
      )
    ORDER BY r.seq_no
  `);

  const links = [];
  for (const row of result.rows) {
    const { primary, co } = parseResponsible(row.responsible_org);
    if (primary) links.push([row.id, primary, 'primary', 0, importedAt]);
    co.forEach((orgName, index) => links.push([row.id, orgName, 'co', index + 1, importedAt]));
  }
  if (links.length === 0) return 0;

  const values = links.flat();
  const tuples = links.map((_, rowIndex) => {
    const start = rowIndex * 5;
    return `($${start + 1},$${start + 2},$${start + 3},$${start + 4},$${start + 5})`;
  });
  const inserted = await client.query(`
    INSERT INTO public.recommendation_responsible (
      record_id, org_name, role, position, created_at
    ) VALUES ${tuples.join(',')}
    ON CONFLICT (record_id, org_name) DO NOTHING
  `, values);
  return inserted.rowCount;
}

async function verifyControlValues(client) {
  const result = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (
        WHERE lower(btrim(status_normalized)) IN ('в работе', 'не поддерживается')
      )::int AS active,
      COUNT(*) FILTER (
        WHERE lower(btrim(status_normalized)) = 'исполнено'
      )::int AS done,
      COUNT(*) FILTER (
        WHERE lower(btrim(status_normalized)) = 'для снятия с контроля'
      )::int AS excluded
    FROM public.recommendations
  `);
  const actual = result.rows[0];
  for (const [key, expected] of Object.entries(EXPECTED)) {
    if (actual[key] !== expected) {
      throw new Error(`Контроль ${key}: ожидалось ${expected}, получено ${actual[key]}`);
    }
  }
  return actual;
}

export async function runCleanImport(inputPath, databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error('DATABASE_URL обязателен');

  const filePath = resolveInputPath(inputPath);
  const records = readImportRows(filePath);
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await assertUuidSchema(client);
    await ensureResponsibleTable(client);
    await client.query('TRUNCATE TABLE public.recommendations CASCADE');
    await insertRecommendations(client, records);
    const copiedResponsible = await copyMonitoringResponsible(client);
    const fallbackResponsible = await fillMissingResponsible(client, records[0].createdAt);
    const control = await verifyControlValues(client);
    const linkCount = await client.query(`
      SELECT count(*)::int AS count FROM public.recommendation_responsible
    `);
    await client.query('COMMIT');

    return {
      filePath,
      sheetName: SHEET_NAME,
      rows: records.length,
      copiedResponsible,
      fallbackResponsible,
      responsibleLinks: linkCount.rows[0].count,
      control,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const result = await runCleanImport(process.argv[2]);
  console.log(`Файл: ${path.basename(result.filePath)}`);
  console.log(`Лист: ${result.sheetName}; импортировано строк: ${result.rows}`);
  console.log(
    `Связи ответственных: ${result.responsibleLinks} `
    + `(из monitoring: ${result.copiedResponsible}, дополнено: ${result.fallbackResponsible})`,
  );
  console.log(
    `Контроль: ${result.control.total} | ${result.control.active} | `
    + `${result.control.done} | ${result.control.excluded}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => {
    console.error(`Импорт отменён: ${error.message}`);
    process.exitCode = 1;
  });
}
