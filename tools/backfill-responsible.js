#!/usr/bin/env node
// One-time idempotent backfill: populate recommendation_responsible from recommendations.responsible
// Usage: DATABASE_URL=postgresql://... node tools/backfill-responsible.js
import pg from 'pg';
import { parseResponsible } from '../backend/src/lib/parseResponsible.js';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });

async function main() {
  const { rows } = await pool.query(
    "SELECT id, responsible FROM recommendations WHERE responsible IS NOT NULL AND btrim(responsible) <> ''"
  );
  console.log(`Found ${rows.length} records with responsible data`);

  let backfilled = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const { primary, co } = parseResponsible(row.responsible);
    if (!primary) { skipped++; continue; }

    try {
      await pool.query('BEGIN');
      await pool.query('DELETE FROM recommendation_responsible WHERE record_id = $1', [row.id]);
      await pool.query(
        `INSERT INTO recommendation_responsible (record_id, org_name, role)
         VALUES ($1, $2, 'primary') ON CONFLICT DO NOTHING`,
        [row.id, primary]
      );
      for (const org of co) {
        await pool.query(
          `INSERT INTO recommendation_responsible (record_id, org_name, role)
           VALUES ($1, $2, 'co') ON CONFLICT DO NOTHING`,
          [row.id, org]
        );
      }
      await pool.query('COMMIT');
      backfilled++;
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error(`  record ${row.id} failed: ${e.message}`);
      errors++;
    }
  }

  console.log(`Done: ${backfilled} backfilled, ${skipped} skipped (no primary), ${errors} errors`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
