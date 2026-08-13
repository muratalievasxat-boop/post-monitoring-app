import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readImportRows } from './import-xlsx-clean.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = path.join(projectRoot, 'tools', 'import', 'Пост-мониторинг свод на 14.04.xlsx');

test('reads rows 3-1337 and produces the required control values', () => {
  const rows = readImportRows(fixture);
  const active = rows.filter(
    row => row.status === 'В работе' || row.status === 'Не поддерживается',
  ).length;
  const done = rows.filter(row => row.status === 'Исполнено').length;
  const excluded = rows.filter(row => row.status === 'Для снятия с контроля').length;

  assert.deepEqual(
    { total: rows.length, active, done, excluded },
    { total: 1335, active: 667, done: 475, excluded: 193 },
  );
  assert.equal(rows[0].seqNo, 1);
  assert.equal(rows.at(-1).seqNo, 1335);
  assert.equal(new Set(rows.map(row => row.seqNo)).size, 1335);
  assert.ok(rows.every(row => /^[0-9a-f-]{36}$/.test(row.id)));
});
