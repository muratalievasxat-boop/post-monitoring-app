import { pool } from '../pool.js';

function norm(v) {
  return String(v || '').trim().toLowerCase();
}

function normalizeStatusGroup(status) {
  const v = norm(status);
  if (!v) return 'unknown';
  if (v === 'исполнено') return 'done';
  if (v.startsWith('в работе')) return 'active';
  if (v.startsWith('не поддерживается')) return 'rejected';
  if (v.includes('исключ')) return 'excluded';
  return 'unknown';
}

const statusNormSql = `btrim(lower(coalesce(status_normalized, '')))`;

export async function getDashboardSummary() {
  const totalsRes = await pool.query(`
    select
      count(*)::int as all,
      count(*) filter (where ${statusNormSql} = 'в работе')::int as active,
      count(*) filter (where ${statusNormSql} = 'исполнено')::int as done,
      count(*) filter (where ${statusNormSql} like 'не поддерживается%')::int as rejected,
      count(*) filter (where ${statusNormSql} like '%исключ%')::int as excluded,
      count(*) filter (where ${statusNormSql} = '')::int as unknown,
      0::int as overdue
    from registry_records
  `);

  const bySphereRes = await pool.query(`
    select coalesce(nullif(btrim(sphere), ''), 'Без сферы') as sphere, count(*)::int as count
    from registry_records
    group by 1
    order by 2 desc, 1 asc
    limit 20
  `);

  const byResponsibleRes = await pool.query(`
    select coalesce(nullif(btrim(responsible_org), ''), 'Не указан') as responsible_org, count(*)::int as count
    from registry_records
    group by 1
    order by 2 desc, 1 asc
    limit 20
  `);

  const byCycleRes = await pool.query(`
    select coalesce(nullif(btrim(cycle), ''), 'Без цикла') as cycle, count(*)::int as count
    from registry_records
    group by 1
    order by 1 asc
  `);

  return {
    totals: totalsRes.rows[0],
    bySphere: bySphereRes.rows,
    byResponsibleOrg: byResponsibleRes.rows,
    byCycle: byCycleRes.rows,
  };
}

export async function getRecommendationFilters() {
  const cycles = await pool.query(`
    select distinct btrim(cycle) as cycle
    from registry_records
    where coalesce(btrim(cycle), '') <> ''
    order by 1
  `);

  const statuses = await pool.query(`
    select distinct btrim(status_normalized) as status_normalized
    from registry_records
    where coalesce(btrim(status_normalized), '') <> ''
    order by 1
  `);

  const spheres = await pool.query(`
    select distinct btrim(sphere) as sphere
    from registry_records
    where coalesce(btrim(sphere), '') <> ''
    order by 1
  `);

  const types = await pool.query(`
    select distinct btrim(record_type) as record_type
    from registry_records
    where coalesce(btrim(record_type), '') <> ''
    order by 1
  `);

  return {
    cycles: cycles.rows.map(r => r.cycle),
    statuses: statuses.rows.map(r => r.status_normalized),
    spheres: spheres.rows.map(r => r.sphere),
    types: types.rows.map(r => r.record_type),
  };
}

export async function listRecommendations(params) {
  const q = params.q || '';
  const cycle = params.cycle || '';
  const status = params.status || '';
  const sphere = params.sphere || '';
  const type = params.type || '';
  const page = Math.max(Number(params.page || 1), 1);
  const limit = Math.min(Number(params.limit || params.pageSize || 100), 500);
  const offset = (page - 1) * limit;

  const values = [];
  const where = [];

  if (q) {
    values.push(`%${q}%`);
    const i = values.length;
    where.push(`
      (
        coalesce(proposal_text,'') ilike $${i}
        or coalesce(responsible_org,'') ilike $${i}
        or coalesce(sphere,'') ilike $${i}
      )
    `);
  }

  if (cycle) {
    values.push(cycle.trim());
    where.push(`btrim(coalesce(cycle,'')) = $${values.length}`);
  }

  if (status) {
    values.push(status.trim());
    where.push(`btrim(coalesce(status_normalized,'')) = $${values.length}`);
  }

  if (sphere) {
    values.push(sphere.trim());
    where.push(`btrim(coalesce(sphere,'')) = $${values.length}`);
  }

  if (type) {
    values.push(type.trim());
    where.push(`btrim(coalesce(record_type,'')) = $${values.length}`);
  }

  const whereSql = where.length ? `where ${where.join(' and ')}` : '';

  const sql = `
    select
      id,
      coalesce(row_number, id) as seq_no,
      btrim(coalesce(record_type, '')) as record_type_normalized,
      btrim(coalesce(cycle, '')) as cycle,
      btrim(coalesce(sphere, '')) as sphere_normalized,
      coalesce(proposal_text, '') as proposal_text,
      btrim(coalesce(responsible_org, '')) as responsible_org,
      btrim(coalesce(due_raw, '')) as due_raw,
      btrim(coalesce(status_normalized, '')) as status_normalized
    from registry_records
    ${whereSql}
    order by coalesce(row_number, id) asc, id asc
    limit $${values.length + 1}
    offset $${values.length + 2}
  `;

  const countSql = `
    select count(*)::int as total
    from registry_records
    ${whereSql}
  `;

  const rowsRes = await pool.query(sql, [...values, limit, offset]);
  const countRes = await pool.query(countSql, values);

  const total = countRes.rows[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  return {
    items: rowsRes.rows,
    total,
    page,
    pages,
    limit,
    offset,
  };
}

export async function getRecommendationById(id) {
  const res = await pool.query(`
    select
      id,
      coalesce(row_number, id) as seq_no,
      btrim(coalesce(record_type, '')) as record_type_raw,
      btrim(coalesce(record_type, '')) as record_type_normalized,
      btrim(coalesce(cycle, '')) as cycle,
      btrim(coalesce(sphere, '')) as sphere_raw,
      btrim(coalesce(sphere, '')) as sphere_normalized,
      coalesce(proposal_text, '') as proposal_text,
      btrim(coalesce(responsible_org, '')) as responsible_org,
      coalesce(interested_orgs, '') as interested_orgs,
      coalesce(completion_form, '') as completion_form,
      btrim(coalesce(due_raw, '')) as due_raw,
      btrim(coalesce(status_raw, '')) as status_raw,
      btrim(coalesce(status_normalized, '')) as status_normalized,
      coalesce(position_go_2024_2025, '') as position_2024_2025,
      coalesce(position_go_2026_03_27, '') as position_2026,
      coalesce(position_adgs, '') as adgs_position,
      null::text as changed_by,
      coalesce(case_raw, '') as case_note,
      updated_at as status_updated_at,
      null::int as source_row_no,
      null::text as source_file_name,
      null::text as source_sheet_name,
      created_at,
      updated_at
    from registry_records
    where id = $1
  `, [id]);

  const row = res.rows[0];
  if (!row) return null;

  row.status_group = normalizeStatusGroup(row.status_normalized);
  return row;
}

export async function updateRecommendationStatus(id, payload) {
  const status_normalized = payload.status_normalized?.trim() || null;
  const due_raw = payload.due_raw?.trim() || null;
  const position_go_2026_03_27 = payload.position_go_2026_03_27 ?? null;
  const position_adgs = payload.position_adgs ?? null;
  const comment = payload.comment ?? null;

  const res = await pool.query(`
    update registry_records
    set
      status_raw = coalesce($2, status_raw),
      status_normalized = coalesce($2, status_normalized),
      due_raw = coalesce($3, due_raw),
      position_go_2026_03_27 = coalesce($4, position_go_2026_03_27),
      position_adgs = coalesce($5, position_adgs),
      case_raw = coalesce($6, case_raw),
      updated_at = now()
    where id = $1
    returning id
  `, [
    id,
    status_normalized,
    due_raw,
    position_go_2026_03_27,
    position_adgs,
    comment,
  ]);

  return res.rows[0] || null;
}
