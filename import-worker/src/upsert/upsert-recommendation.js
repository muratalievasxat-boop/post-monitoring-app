import { pool } from '../db/pool.js';
import { parseResponsible } from '../normalizers/responsible.js';

export async function upsertRecommendation(rec) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO public.recommendations (
        seq_no,
        record_type_raw, record_type_normalized,
        cycle,
        sphere_raw, sphere_normalized,
        proposal_text,
        responsible_org, interested_orgs,
        completion_form, due_raw,
        status_raw, status_normalized, status_group,
        source_row_no, source_file_name, source_sheet_name,
        quality_flag
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18
      )
      ON CONFLICT (seq_no) DO UPDATE SET
        record_type_raw        = excluded.record_type_raw,
        record_type_normalized = excluded.record_type_normalized,
        cycle                  = excluded.cycle,
        sphere_raw             = excluded.sphere_raw,
        sphere_normalized      = excluded.sphere_normalized,
        proposal_text          = excluded.proposal_text,
        responsible_org        = excluded.responsible_org,
        interested_orgs        = excluded.interested_orgs,
        completion_form        = excluded.completion_form,
        due_raw                = excluded.due_raw,
        status_raw             = excluded.status_raw,
        status_normalized      = excluded.status_normalized,
        status_group           = excluded.status_group,
        source_row_no          = excluded.source_row_no,
        source_file_name       = excluded.source_file_name,
        source_sheet_name      = excluded.source_sheet_name,
        quality_flag           = excluded.quality_flag
      RETURNING id
    `, [
      rec.seq_no,
      rec.record_type_raw, rec.record_type_normalized,
      rec.cycle,
      rec.sphere_raw, rec.sphere_normalized,
      rec.proposal_text,
      rec.responsible_org, rec.interested_orgs,
      rec.completion_form, rec.due_raw,
      rec.status_raw, rec.status_normalized, rec.status_group,
      rec.source_row_no, rec.source_file_name, rec.source_sheet_name,
      rec.quality_flag,
    ]);

    const { id } = result.rows[0];
    await client.query(
      'DELETE FROM public.recommendation_responsible WHERE record_id = $1',
      [id],
    );

    const { primary, co } = parseResponsible(rec.responsible_org);
    if (primary) {
      await client.query(
        `INSERT INTO public.recommendation_responsible (record_id, org_name, role, position)
         VALUES ($1, $2, 'primary', 0)`,
        [id, primary],
      );
      for (const [index, org] of co.entries()) {
        await client.query(
          `INSERT INTO public.recommendation_responsible (record_id, org_name, role, position)
           VALUES ($1, $2, 'co', $3)
           ON CONFLICT (record_id, org_name) DO NOTHING`,
          [id, org, index + 1],
        );
      }
    }

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
