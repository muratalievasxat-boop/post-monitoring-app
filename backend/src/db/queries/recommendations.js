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
  if (v.includes('исключ') || v.includes('снятия с контроля')) return 'excluded';
  return 'unknown';
}

const statusNormSql = `btrim(lower(coalesce(status_normalized, '')))`;

export async function getDashboardSummary() {
  const excludedSql = `(${statusNormSql} like '%исключ%' or ${statusNormSql} = 'для снятия с контроля')`;

  const totalsRes = await pool.query(`
    select
      count(*)::int as all,
      count(*) filter (where ${statusNormSql} like 'в работе%')::int as active,
      count(*) filter (where ${statusNormSql} = 'исполнено')::int as done,
      count(*) filter (where ${statusNormSql} like 'не поддерживается%')::int as rejected,
      count(*) filter (where ${excludedSql})::int as excluded,
      count(*) filter (where ${statusNormSql} = '')::int as unknown,
      count(*) filter (
        where ${statusNormSql} like 'в работе%'
        and (due_raw like '%2024%' or due_raw like '%2025%')
      )::int as overdue
    from registry_records
  `);

  const byCycleRes = await pool.query(`
    select coalesce(nullif(btrim(cycle), ''), 'Без цикла') as cycle, count(*)::int as count
    from registry_records
    group by 1
    order by 1 asc
  `);

  const byCycleStatusRes = await pool.query(`
    select
      coalesce(nullif(btrim(cycle), ''), 'Без цикла') as cycle,
      count(*) filter (where ${statusNormSql} = 'исполнено')::int as done,
      count(*) filter (where ${statusNormSql} like 'в работе%')::int as active,
      count(*) filter (where ${statusNormSql} like 'не поддерживается%')::int as rejected,
      count(*) filter (where ${excludedSql})::int as excluded,
      count(*)::int as total
    from registry_records
    group by 1
    order by 1 asc
  `);

  const byCycleTypeCompletionRes = await pool.query(`
    select
      coalesce(nullif(btrim(cycle), ''), 'Без цикла') as cycle,
      count(*) filter (where btrim(record_type) = 'Анализ')::int as analiz_total,
      count(*) filter (where btrim(record_type) = 'Анализ' and ${statusNormSql} = 'исполнено')::int as analiz_done,
      count(*) filter (where btrim(record_type) = 'Мониторинг')::int as monitoring_total,
      count(*) filter (where btrim(record_type) = 'Мониторинг' and ${statusNormSql} = 'исполнено')::int as monitoring_done
    from registry_records
    group by 1
    order by 1 asc
  `);

  const byOrgStatusRes = await pool.query(`
    select
      coalesce(nullif(btrim(responsible_org), ''), 'Не указан') as responsible_org,
      count(*) filter (where ${statusNormSql} = 'исполнено')::int as done,
      count(*)::int as total,
      round(
        count(*) filter (where ${statusNormSql} = 'исполнено')::numeric * 100
        / nullif(count(*), 0)
      )::int as pct
    from registry_records
    group by 1
    having count(*) >= 5
    order by pct desc, total desc
    limit 15
  `);

  const byOverdueOrgRes = await pool.query(`
    select
      coalesce(nullif(btrim(responsible_org), ''), 'Не указан') as responsible_org,
      count(*)::int as overdue_count
    from registry_records
    where ${statusNormSql} like 'в работе%'
      and (due_raw like '%2024%' or due_raw like '%2025%')
    group by 1
    order by 2 desc
    limit 15
  `);

  const bySphereStatusRes = await pool.query(`
    select
      coalesce(nullif(btrim(sphere), ''), 'Без сферы') as sphere,
      count(*) filter (where ${statusNormSql} = 'исполнено')::int as done,
      count(*)::int as total,
      round(
        count(*) filter (where ${statusNormSql} = 'исполнено')::numeric * 100
        / nullif(count(*), 0)
      )::int as pct
    from registry_records
    group by 1
    having count(*) >= 3
    order by pct desc, total desc
    limit 15
  `);

  const byAttentionRes = await pool.query(`
    select responsible_org, total, done, pct
    from (
      select
        coalesce(nullif(btrim(responsible_org), ''), 'Не указан') as responsible_org,
        count(*)::int as total,
        count(*) filter (where ${statusNormSql} = 'исполнено')::int as done,
        round(
          count(*) filter (where ${statusNormSql} = 'исполнено')::numeric * 100
          / nullif(count(*), 0)
        )::int as pct
      from registry_records
      where btrim(cycle) = 'VII'
      group by 1
    ) t
    where total >= 10 and pct <= 10
    order by pct asc, total desc
  `);

  const byCompletionFormRes = await pool.query(`
    select
      coalesce(nullif(btrim(completion_form), ''), 'Не указана') as completion_form,
      count(*)::int as total,
      count(*) filter (where ${statusNormSql} = 'исполнено')::int as done,
      round(
        count(*) filter (where ${statusNormSql} = 'исполнено')::numeric * 100
        / nullif(count(*), 0)
      )::int as pct
    from registry_records
    where coalesce(btrim(completion_form), '') <> ''
    group by 1
    order by total desc
    limit 12
  `);

  return {
    totals: totalsRes.rows[0],
    byCycle: byCycleRes.rows,
    byCycleStatus: byCycleStatusRes.rows,
    byCycleTypeCompletion: byCycleTypeCompletionRes.rows,
    byOrgStatus: byOrgStatusRes.rows,
    byOverdueOrg: byOverdueOrgRes.rows,
    bySphereStatus: bySphereStatusRes.rows,
    byAttention: byAttentionRes.rows,
    byCompletionForm: byCompletionFormRes.rows,
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
    select distinct
      upper(left(btrim(lower(status_normalized)), 1))
      || lower(substring(btrim(status_normalized) from 2)) as status_normalized
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

  const execs = await pool.query(`
    select distinct btrim("responsible") as responsible_org
    from recommendations
    where coalesce(btrim("responsible"), '') <> '' and "responsible" not ilike '%object%'
    order by 1
  `);

  return {
    cycles: cycles.rows.map(r => r.cycle),
    statuses: statuses.rows.map(r => r.status_normalized),
    spheres: spheres.rows.map(r => r.sphere),
    types: types.rows.map(r => r.record_type),
    execs: execs.rows.map(r => r.responsible_org),
  };
}

export async function listRecommendations(params) {
  const q = params.search || params.q || '';
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
    values.push(status.trim().toLowerCase());
    where.push(`lower(btrim(coalesce(status_normalized,''))) = $${values.length}`);
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

function normalizeStatusValue(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

export async function updateRecommendationStatus(id, payload) {
  // Frontend sends `status`, backend field is status_normalized — accept both
  const rawStatus = payload.status ?? payload.status_normalized ?? null;
  const status_normalized = normalizeStatusValue(rawStatus);
  const due_raw = payload.deadline?.trim() || payload.due_raw?.trim() || null;
  const position_go_2026_03_27 = payload.position2026 ?? payload.position_go_2026_03_27 ?? null;
  const position_adgs = payload.adgsPosition ?? payload.position_adgs ?? null;
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
