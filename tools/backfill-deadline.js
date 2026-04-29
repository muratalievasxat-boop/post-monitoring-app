#!/usr/bin/env node
// One-time idempotent backfill: populate due_sort_key / due_parse_failed
// from recommendations.due_raw.
// Usage: DATABASE_URL=postgresql://... node tools/backfill-deadline.js
import pg from 'pg';
import { parseDeadline } from '../backend/src/lib/parseDeadline.js';

const url = process.env.DATABASE_URL;
if (!url) { console.error('ERROR: DATABASE_URL required'); process.exit(1); }

const pool = new pg.Pool({ connectionString: url });

async function main() {
  const { rows } = await pool.query(
    'SELECT id, due_raw FROM recommendations ORDER BY id'
  );
  console.log(`Processing ${rows.length} records...`);

  let parsed = 0, failed = 0, empty = 0;
  const unparsed = [];

  for (const r of rows) {
    const date = parseDeadline(r.due_raw);

    if (date) {
      await pool.query(
        'UPDATE recommendations SET due_sort_key = $1, due_parse_failed = false WHERE id = $2',
        [date, r.id]
      );
      parsed++;
    } else if (r.due_raw && r.due_raw.trim()) {
      await pool.query(
        'UPDATE recommendations SET due_sort_key = NULL, due_parse_failed = true WHERE id = $1',
        [r.id]
      );
      failed++;
      unparsed.push(r.due_raw.trim());
    } else {
      empty++;
    }
  }

  console.log(`\nParsed: ${parsed}  Failed: ${failed}  Empty: ${empty}`);
  console.log(`Coverage: ${((parsed / (parsed + failed)) * 100).toFixed(1)}% of non-empty values`);

  if (unparsed.length) {
    const unique = [...new Set(unparsed)].sort();
    console.log(`\nUnparsed unique values (${unique.length}):`);
    for (const v of unique.slice(0, 30)) console.log(' ', JSON.stringify(v));
    if (unique.length > 30) console.log(`  ... and ${unique.length - 30} more`);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
