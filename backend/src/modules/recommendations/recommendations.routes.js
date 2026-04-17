const express = require('express');
const { pool } = require('../../db');
const { buildWhere } = require('../../db/queries/recommendations');

const router = express.Router();

router.get('/meta', async (_req, res) => {
  const [cycles, statuses, spheres, types] = await Promise.all([
    pool.query(`select distinct coalesce(cycle, '') as cycle from registry_records order by 1`),
    pool.query(`select distinct coalesce(status_normalized, '') as status_normalized from registry_records order by 1`),
    pool.query(`select distinct coalesce(sphere, '') as sphere from registry_records order by 1`),
    pool.query(`select distinct coalesce(record_type, '') as record_type from registry_records order by 1`),
  ]);

  res.json({ __probe: 'recommendations-routes-live',
    cycles: cycles.rows.map(r => r.cycle),
    statuses: statuses.rows.map(r => r.status_normalized),
    spheres: spheres.rows.map(r => r.sphere),
    types: types.rows.map(r => r.record_type),
  });
});

router.get('/', async (req, res) => {
  const {
    q = '',
    cycle = '',
    status = '',
    sphere = '',
    type = '',
    limit = '100',
    offset = '',
  } = req.query;

  const page = Math.max(Number(req.query.page ?? 1), 1);
  const safeLimit = Math.min(Number(limit) || 100, 500);
  const safeOffset =
    Number.isFinite(Number(offset)) && String(offset) !== ''
      ? Number(offset)
      : (page - 1) * safeLimit;

  const { where, params } = buildWhere({ q, cycle, status, sphere, type });

  const listSql = `
    select
      id::text as id,
      row_number as seq_no,
      coalesce(record_type, '') as record_type_normalized,
      coalesce(cycle, '') as cycle,
      coalesce(sphere, '') as sphere_normalized,
      coalesce(proposal_text, '') as proposal_text,
      coalesce(responsible_org, '') as responsible_org,
      coalesce(interested_orgs, '') as interested_orgs,
      coalesce(completion_form, '') as completion_form,
      coalesce(due_raw, '') as due_raw,
      coalesce(status_normalized, '') as status_normalized,
      coalesce(position_2024_2025, '') as position_2024_2025,
      coalesce(position_2026, '') as position_2026,
      coalesce(adgs_position, '') as adgs_position,
      coalesce(case_note, '') as case_note
    from registry_records
    ${where}
    order by row_number asc nulls last, id asc
    limit $${params.length + 1}
    offset $${params.length + 2}
  `;

  const countSql = `
    select count(*)::int as total
    from registry_records
    ${where}
  `;

  const [rowsResult, countResult] = await Promise.all([
    pool.query(listSql, [...params, safeLimit, safeOffset]),
    pool.query(countSql, params),
  ]);

  const total = countResult.rows[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / safeLimit));

  res.json({
    items: rowsResult.rows,
    total,
    page,
    pages,
    limit: safeLimit,
    offset: safeOffset,
  });
});

router.get('/:id', async (req, res) => {
  const result = await pool.query(
    `
    select
      id::text as id,
      row_number as seq_no,
      coalesce(record_type, '') as record_type_raw,
      coalesce(record_type, '') as record_type_normalized,
      coalesce(cycle, '') as cycle,
      coalesce(sphere, '') as sphere_raw,
      coalesce(sphere, '') as sphere_normalized,
      coalesce(proposal_text, '') as proposal_text,
      coalesce(responsible_org, '') as responsible_org,
      coalesce(interested_orgs, '') as interested_orgs,
      coalesce(completion_form, '') as completion_form,
      coalesce(due_raw, '') as due_raw,
      coalesce(status_raw, '') as status_raw,
      coalesce(status_normalized, '') as status_normalized,
      coalesce(position_2024_2025, '') as position_2024_2025,
      coalesce(position_2026, '') as position_2026,
      coalesce(adgs_position, '') as adgs_position,
      coalesce(case_note, '') as case_note
    from registry_records
    where id = $1
    limit 1
    `,
    [req.params.id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json(result.rows[0]);
});

module.exports = router;
