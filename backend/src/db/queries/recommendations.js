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

const statusNormSql = `btrim(lower(coalesce(status, '')))`;

export async function getDashboardSummary() {
  const activeSql   = `(status ilike 'в работе%' or status = 'Не поддерживается')`;
  const doneSql     = `status ilike 'исполнено%'`;
  const excludedSql = `status = 'Для снятия с контроля'`;

  const totalsRes = await pool.query(`
    select
      count(*)::int as all,
      count(*) filter (where ${activeSql})::int as active,
      count(*) filter (where ${doneSql})::int as done,
      count(*) filter (where ${excludedSql})::int as excluded,
      0::int as rejected,
      0::int as unknown,
      0::int as overdue
    from recommendations
  `);

  const byCycleRes = await pool.query(`
    select coalesce(nullif(btrim(cycle), ''), 'Без цикла') as cycle, count(*)::int as count
    from recommendations
    group by 1
    order by 1 asc
  `);

  const byCycleStatusRes = await pool.query(`
    select
      coalesce(nullif(btrim(cycle), ''), 'Без цикла') as cycle,
      count(*) filter (where ${doneSql})::int as done,
      count(*) filter (where ${activeSql})::int as active,
      count(*) filter (where ${excludedSql})::int as excluded,
      0::int as rejected,
      count(*)::int as total
    from recommendations
    group by 1
    order by 1 asc
  `);

  const byCycleTypeCompletionRes = await pool.query(`
    select
      coalesce(nullif(btrim(cycle), ''), 'Без цикла') as cycle,
      count(*) filter (where btrim(type) = 'Анализ')::int as analiz_total,
      count(*) filter (where btrim(type) = 'Анализ' and ${doneSql})::int as analiz_done,
      count(*) filter (where btrim(type) = 'Мониторинг')::int as monitoring_total,
      count(*) filter (where btrim(type) = 'Мониторинг' and ${doneSql})::int as monitoring_done
    from recommendations
    group by 1
    order by 1 asc
  `);

  const byOrgStatusRes = await pool.query(`
    select
      coalesce(nullif(btrim(responsible), ''), 'Не указан') as responsible_org,
      count(*) filter (where ${doneSql})::int as done,
      count(*)::int as total,
      round(
        count(*) filter (where ${doneSql})::numeric * 100
        / nullif(count(*), 0)
      )::int as pct
    from recommendations
    group by 1
    having count(*) >= 5
    order by pct desc, total desc
    limit 15
  `);

  const byOverdueOrgRes = await pool.query(`
    SELECT
      coalesce(nullif(btrim(responsible), ''), 'Не указан') AS responsible_org,
      count(*)::int AS overdue_count
    FROM recommendations
    WHERE (${activeSql})
      AND (deadline like '%2024%' OR deadline like '%2025%')
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 15
  `);

  const bySphereStatusRes = await pool.query(`
    select
      coalesce(nullif(btrim(sphere), ''), 'Без сферы') as sphere,
      count(*) filter (where ${doneSql})::int as done,
      count(*)::int as total,
      round(
        count(*) filter (where ${doneSql})::numeric * 100
        / nullif(count(*), 0)
      )::int as pct
    from recommendations
    group by 1
    having count(*) >= 3
    order by pct desc, total desc
    limit 15
  `);

  const byAttentionRes = await pool.query(`
    select responsible_org, total, done, pct
    from (
      select
        coalesce(nullif(btrim(responsible), ''), 'Не указан') as responsible_org,
        count(*)::int as total,
        count(*) filter (where ${doneSql})::int as done,
        round(
          count(*) filter (where ${doneSql})::numeric * 100
          / nullif(count(*), 0)
        )::int as pct
      from recommendations
      where btrim(cycle) = 'VII'
      group by 1
    ) t
    where total >= 10 and pct <= 10
    order by pct asc, total desc
  `);

  const byCompletionFormRes = await pool.query(`
    select
      coalesce(nullif(btrim("completionForm"), ''), 'Не указана') as completion_form,
      count(*)::int as total,
      count(*) filter (where ${doneSql})::int as done,
      round(
        count(*) filter (where ${doneSql})::numeric * 100
        / nullif(count(*), 0)
      )::int as pct
    from recommendations
    where coalesce(btrim("completionForm"), '') <> ''
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
    from recommendations
    where coalesce(btrim(cycle), '') <> ''
    order by 1
  `);

  const statuses = await pool.query(`
    select distinct
      upper(left(btrim(lower(status)), 1))
      || lower(substring(btrim(status) from 2)) as status_normalized
    from recommendations
    where coalesce(btrim(status), '') <> ''
    order by 1
  `);

  const spheres = await pool.query(`
    select distinct btrim(sphere) as sphere
    from recommendations
    where coalesce(btrim(sphere), '') <> ''
    order by 1
  `);

  const types = await pool.query(`
    select distinct btrim(type) as record_type
    from recommendations
    where coalesce(btrim(type), '') <> ''
    order by 1
  `);

  const execs = await pool.query(`
    select distinct btrim(responsible) as responsible_org
    from recommendations
    where coalesce(btrim(responsible), '') <> ''
    order by 1
    limit 200
  `);

  const overdueRes = await pool.query(`
    select count(*)::int as count
    from recommendations
    where ${statusNormSql} like 'в работе%'
      and deadline like '%2024%'
  `);

  return {
    cycles: cycles.rows.map(r => r.cycle),
    statuses: statuses.rows.map(r => r.status_normalized),
    spheres: spheres.rows.map(r => r.sphere),
    types: types.rows.map(r => r.record_type),
    execs: execs.rows.map(r => r.responsible_org),
    overdueCount: overdueRes.rows[0]?.count ?? 0,
  };
}

export async function listRecommendations(params) {
  const q = params.search || params.q || '';
  const cycle = params.cycle || '';
  const status = params.status || '';
  const sphere = params.sphere || '';
  const type = params.type || '';
  const overdue = params.overdue === '1';
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
        coalesce(proposal,'') ilike $${i}
        or coalesce(responsible,'') ilike $${i}
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
    where.push(`lower(btrim(coalesce(status,''))) = $${values.length}`);
  }

  if (sphere) {
    values.push(sphere.trim());
    where.push(`btrim(coalesce(sphere,'')) = $${values.length}`);
  }

  if (type) {
    values.push(type.trim());
    where.push(`btrim(coalesce(type,'')) = $${values.length}`);
  }

  if (overdue) {
    where.push(`${statusNormSql} like 'в работе%'`);
    where.push(`deadline like '%2024%'`);
  }

  const whereSql = where.length ? `where ${where.join(' and ')}` : '';

  const sql = `
    select
      id,
      id as seq_no,
      btrim(coalesce(type, '')) as record_type_normalized,
      btrim(coalesce(cycle, '')) as cycle,
      btrim(coalesce(sphere, '')) as sphere_normalized,
      coalesce(proposal, '') as proposal_text,
      btrim(coalesce(responsible, '')) as responsible_org,
      btrim(coalesce(deadline, '')) as due_raw,
      btrim(coalesce(status, '')) as status_normalized
    from recommendations
    ${whereSql}
    order by id asc
    limit $${values.length + 1}
    offset $${values.length + 2}
  `;

  const countSql = `
    select count(*)::int as total
    from recommendations
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
      id as seq_no,
      btrim(coalesce(type, '')) as record_type_raw,
      btrim(coalesce(type, '')) as record_type_normalized,
      btrim(coalesce(cycle, '')) as cycle,
      btrim(coalesce(sphere, '')) as sphere_raw,
      btrim(coalesce(sphere, '')) as sphere_normalized,
      coalesce(proposal, '') as proposal_text,
      btrim(coalesce(responsible, '')) as responsible_org,
      coalesce(stakeholders, '') as interested_orgs,
      coalesce("completionForm", '') as completion_form,
      btrim(coalesce(deadline, '')) as due_raw,
      ''::text as status_raw,
      btrim(coalesce(status, '')) as status_normalized,
      coalesce("position2024", '') as position_2024_2025,
      coalesce("position2026", '') as position_2026,
      coalesce("adgsPosition", '') as adgs_position,
      null::text as changed_by,
      coalesce("caseNote", '') as case_note,
      null::timestamptz as status_updated_at,
      null::int as source_row_no,
      null::text as source_file_name,
      null::text as source_sheet_name,
      null::timestamptz as created_at,
      null::timestamptz as updated_at
    from recommendations
    where id = $1
  `, [id]);

  const row = res.rows[0];
  if (!row) return null;

  row.status_group = normalizeStatusGroup(row.status_normalized);
  return row;
}

export async function getStatusHistory(id) {
  const res = await pool.query(`
    select id, old_status, new_status, comment, changed_at
    from status_history
    where record_id = $1
    order by changed_at desc
    limit 50
  `, [id]);
  return res.rows;
}

function normalizeStatusValue(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

export async function updateRecommendationStatus(id, payload) {
  const rawStatus = payload.status ?? payload.status_normalized ?? null;
  const status_normalized = normalizeStatusValue(rawStatus);
  const deadline = payload.deadline?.trim() || payload.due_raw?.trim() || null;
  const position2026 = payload.position2026 ?? payload.position_go_2026_03_27 ?? null;
  const adgsPosition = payload.adgsPosition ?? payload.position_adgs ?? null;
  const caseNote = payload.comment ?? null;

  const oldRes = await pool.query(
    'select status from recommendations where id = $1',
    [id]
  );
  if (!oldRes.rows[0]) return null;
  const old_status = oldRes.rows[0].status;

  const res = await pool.query(`
    update recommendations
    set
      status = coalesce($2, status),
      deadline = coalesce($3, deadline),
      "position2026" = coalesce($4, "position2026"),
      "adgsPosition" = coalesce($5, "adgsPosition"),
      "caseNote" = coalesce($6, "caseNote")
    where id = $1
    returning id
  `, [id, status_normalized, deadline, position2026, adgsPosition, caseNote]);

  if (!res.rows[0]) return null;

  try {
    await pool.query(
      'insert into status_history (record_id, old_status, new_status, comment) values ($1, $2, $3, $4)',
      [id, old_status, status_normalized, caseNote]
    );
  } catch (e) {
    console.error('[history] Failed to write status history:', e.message);
  }

  return res.rows[0];
}

export async function bulkUpdateStatus(ids, payload) {
  const results = [];
  for (const id of ids) {
    const r = await updateRecommendationStatus(id, payload);
    if (r) results.push(r);
  }
  return results;
}
