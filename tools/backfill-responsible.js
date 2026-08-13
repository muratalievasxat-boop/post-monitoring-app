#!/usr/bin/env node

// Idempotent backfill for the canonical public UUID schema.
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
  const { rows } = await pool.query(`
    SELECT id, responsible_org
    FROM public.recommendations
    WHERE responsible_org IS NOT NULL AND btrim(responsible_org) <> ''
  `);
  console.log(`Found ${rows.length} records with responsible data`);

  let backfilled = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const { primary, co } = parseResponsible(row.responsible_org);
    if (!primary) { skipped += 1; continue; }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'DELETE FROM public.recommendation_responsible WHERE record_id = $1',
        [row.id],
      );
      await client.query(
        `INSERT INTO public.recommendation_responsible (record_id, org_name, role, position)
         VALUES ($1, $2, 'primary', 0)`,
        [row.id, primary],
      );
      for (const [index, org] of co.entries()) {
        await client.query(
          `INSERT INTO public.recommendation_responsible (record_id, org_name, role, position)
           VALUES ($1, $2, 'co', $3)
           ON CONFLICT (record_id, org_name) DO NOTHING`,
          [row.id, org, index + 1],
        );
      }
      await client.query('COMMIT');
      backfilled += 1;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`  record ${row.id} failed: ${error.message}`);
      errors += 1;
    } finally {
      client.release();
    }
  }

  console.log(`Done: ${backfilled} backfilled, ${skipped} skipped (no primary), ${errors} errors`);
  await pool.end();
}

main().catch(async error => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
