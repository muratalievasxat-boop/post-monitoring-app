import { pool } from '../db/pool.js';
import { parseResponsible } from '../normalizers/responsible.js';

export async function upsertRecommendation(rec) {
  const sql = `
    insert into monitoring.recommendations (
      record_hash, seq_no,
      record_type_raw, record_type_normalized,
      cycle,
      sphere_raw, sphere_normalized,
      proposal_text,
      responsible_org, interested_orgs,
      completion_form, due_raw,
      status_raw, status_normalized, status_group,
      source_row_no, source_file_name, source_sheet_name,
      quality_flag
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19
    )
    on conflict (record_hash) do update set
      status_raw        = excluded.status_raw,
      status_normalized = excluded.status_normalized,
      status_group      = excluded.status_group,
      due_raw           = excluded.due_raw,
      responsible_org   = excluded.responsible_org,
      interested_orgs   = excluded.interested_orgs,
      sphere_raw        = excluded.sphere_raw,
      sphere_normalized = excluded.sphere_normalized,
      proposal_text     = excluded.proposal_text,
      quality_flag      = excluded.quality_flag,
      source_row_no     = excluded.source_row_no,
      source_file_name  = excluded.source_file_name,
      updated_at        = now()
    returning id, xmax
  `;

  const params = [
    rec.record_hash, rec.seq_no,
    rec.record_type_raw, rec.record_type_normalized,
    rec.cycle,
    rec.sphere_raw, rec.sphere_normalized,
    rec.proposal_text,
    rec.responsible_org, rec.interested_orgs,
    rec.completion_form, rec.due_raw,
    rec.status_raw, rec.status_normalized, rec.status_group,
    rec.source_row_no, rec.source_file_name, rec.source_sheet_name,
    rec.quality_flag
  ];

  const result = await pool.query(sql, params);
  const { id } = result.rows[0];

  const { primary, co } = parseResponsible(rec.responsible_org);
  if (primary) {
    await pool.query(
      'DELETE FROM monitoring.recommendation_responsible WHERE record_id = $1',
      [id]
    );
    await pool.query(
      `INSERT INTO monitoring.recommendation_responsible (record_id, org_name, role)
       VALUES ($1, $2, 'primary') ON CONFLICT DO NOTHING`,
      [id, primary]
    );
    for (const org of co) {
      await pool.query(
        `INSERT INTO monitoring.recommendation_responsible (record_id, org_name, role)
         VALUES ($1, $2, 'co') ON CONFLICT DO NOTHING`,
        [id, org]
      );
    }
  }

  return result;
}
