import { pool } from '../pool.js';
import { parseResponsible } from '../../lib/parseResponsible.js';

function norm(v) {
  return String(v || '').trim().toLowerCase();
}

function normalizeStatusGroup(status) {
  const v = norm(status);
  if (!v) return 'unknown';
  if (v.startsWith('исполн')) return 'done';
  if (v.startsWith('в работе')) return 'active';
  if (v === 'не поддерживается') return 'active';
  if (v.includes('исключ') || v.includes('снятия с контроля')) return 'excluded';
  return 'unknown';
}

const statusNormSql = `btrim(lower(coalesce(status_normalized, '')))`;

export async function getDashboardSummary({ includeCo = false } = {}) {
  const activeSql   = `(status_normalized ilike 'в работе%' or status_normalized = 'Не поддерживается')`;
  const doneSql     = `status_normalized ilike 'исполнено%'`;
  const excludedSql = `status_normalized ilike 'для снятия с контроля%'`;

  const activeR   = `(r.status_normalized ilike 'в работе%' or r.status_normalized = 'Не поддерживается')`;
  const doneR     = `r.status_normalized ilike 'исполнено%'`;
  const roleWhere = includeCo ? `rr.role IN ('primary', 'co')` : `rr.role = 'primary'`;

  const totalsRes = await pool.query(`
    select
      count(*)::int as all,
      count(*) filter (where ${activeSql})::int as active,
      count(*) filter (where ${doneSql})::int as done,
      count(*) filter (where ${excludedSql})::int as excluded,
      0::int as rejected,
      0::int as unknown,
      0::int as overdue
    from public.recommendations
  `);

  const byCycleRes = await pool.query(`
    select coalesce(nullif(btrim(cycle), ''), 'Без цикла') as cycle, count(*)::int as count
    from public.recommendations
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
    from public.recommendations
    group by 1
    order by 1 asc
  `);

  const byCycleTypeCompletionRes = await pool.query(`
    select
      coalesce(nullif(btrim(cycle), ''), 'Без цикла') as cycle,
      count(*) filter (where btrim(record_type_normalized) = 'Анализ')::int as analiz_total,
      count(*) filter (where btrim(record_type_normalized) = 'Анализ' and ${doneSql})::int as analiz_done,
      count(*) filter (where btrim(record_type_normalized) = 'Мониторинг')::int as monitoring_total,
      count(*) filter (where btrim(record_type_normalized) = 'Мониторинг' and ${doneSql})::int as monitoring_done
    from public.recommendations
    group by 1
    order by 1 asc
  `);

  const byOrgStatusRes = await pool.query(`
    select
      coalesce(rr.org_name, 'Не указан') as responsible_org,
      count(*) filter (where ${doneR})::int as done,
      count(*)::int as total,
      round(
        count(*) filter (where ${doneR})::numeric * 100
        / nullif(count(*), 0)
      )::int as pct
    from public.recommendations r
    left join public.recommendation_responsible rr on rr.record_id = r.id and ${roleWhere}
    group by 1
    having count(*) >= 5
    order by pct desc, total desc
    limit 15
  `);

  const byOverdueOrgRes = await pool.query(`
    select
      coalesce(rr.org_name, 'Не указан') as responsible_org,
      count(*)::int as overdue_count
    from public.recommendations r
    left join public.recommendation_responsible rr on rr.record_id = r.id and ${roleWhere}
    where (${activeR})
      and (r.due_raw like '%2024%' or r.due_raw like '%2025%')
    group by 1
    order by 2 desc
    limit 15
  `);

  const bySphereStatusRes = await pool.query(`
    select
      coalesce(nullif(btrim(sphere_normalized), ''), 'Без сферы') as sphere,
      count(*) filter (where ${doneSql})::int as done,
      count(*)::int as total,
      round(
        count(*) filter (where ${doneSql})::numeric * 100
        / nullif(count(*), 0)
      )::int as pct
    from public.recommendations
    group by 1
    having count(*) >= 3
    order by pct desc, total desc
    limit 15
  `);

  const byAttentionRes = await pool.query(`
    select responsible_org, total, done, pct
    from (
      select
        coalesce(rr.org_name, 'Не указан') as responsible_org,
        count(*)::int as total,
        count(*) filter (where ${doneR})::int as done,
        round(
          count(*) filter (where ${doneR})::numeric * 100
          / nullif(count(*), 0)
        )::int as pct
      from public.recommendations r
      left join public.recommendation_responsible rr on rr.record_id = r.id and ${roleWhere}
      where btrim(r.cycle) = 'VII'
      group by 1
    ) t
    where total >= 10 and pct <= 10
    order by pct asc, total desc
  `);

  const byCompletionFormRes = await pool.query(`
    select
      coalesce(nullif(btrim(completion_form), ''), 'Не указана') as completion_form,
      count(*)::int as total,
      count(*) filter (where ${doneSql})::int as done,
      round(
        count(*) filter (where ${doneSql})::numeric * 100
        / nullif(count(*), 0)
      )::int as pct
    from public.recommendations
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
    from public.recommendations
    where coalesce(btrim(cycle), '') <> ''
    order by 1
  `);

  const statuses = await pool.query(`
    select distinct status_normalized
    from public.recommendations
    where coalesce(btrim(status_normalized), '') <> ''
    order by 1
  `);

  const spheres = await pool.query(`
    select distinct btrim(sphere_normalized) as sphere
    from public.recommendations
    where coalesce(btrim(sphere_normalized), '') <> ''
    order by 1
  `);

  const types = await pool.query(`
    select distinct btrim(record_type_normalized) as record_type
    from public.recommendations
    where coalesce(btrim(record_type_normalized), '') <> ''
    order by 1
  `);

  const execs = await pool.query(`
    select distinct org_name as responsible_org
    from public.recommendation_responsible
    where role = 'primary'
    order by 1
    limit 200
  `);

  const overdueRes = await pool.query(`
    select count(*)::int as count
    from public.recommendations
    where ${statusNormSql} like 'в работе%'
      and due_raw like '%2024%'
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
        coalesce(proposal_text,'') ilike $${i}
        or coalesce(responsible_org,'') ilike $${i}
        or coalesce(sphere_normalized,'') ilike $${i}
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
    where.push(`btrim(coalesce(sphere_normalized,'')) = $${values.length}`);
  }

  if (type) {
    values.push(type.trim());
    where.push(`btrim(coalesce(record_type_normalized,'')) = $${values.length}`);
  }

  if (overdue) {
    where.push(`${statusNormSql} like 'в работе%'`);
    where.push(`due_raw like '%2024%'`);
  }

  const whereSql = where.length ? `where ${where.join(' and ')}` : '';

  const sql = `
    select
      id,
      seq_no,
      btrim(coalesce(record_type_normalized, '')) as record_type_normalized,
      btrim(coalesce(cycle, '')) as cycle,
      btrim(coalesce(sphere_normalized, '')) as sphere_normalized,
      coalesce(proposal_text, '') as proposal_text,
      btrim(coalesce(responsible_org, '')) as responsible_org,
      btrim(coalesce(due_raw, '')) as due_raw,
      btrim(coalesce(status_normalized, '')) as status_normalized
    from public.recommendations
    ${whereSql}
    order by seq_no asc nulls last, id asc
    limit $${values.length + 1}
    offset $${values.length + 2}
  `;

  const countSql = `
    select count(*)::int as total
    from public.recommendations
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
      r.id,
      r.seq_no,
      btrim(coalesce(r.record_type_raw, r.record_type_normalized, '')) as record_type_raw,
      btrim(coalesce(r.record_type_normalized, '')) as record_type_normalized,
      btrim(coalesce(r.cycle, '')) as cycle,
      btrim(coalesce(r.sphere_raw, r.sphere_normalized, '')) as sphere_raw,
      btrim(coalesce(r.sphere_normalized, '')) as sphere_normalized,
      coalesce(r.proposal_text, '') as proposal_text,
      btrim(coalesce(r.responsible_org, '')) as responsible_raw,
      coalesce(r.interested_orgs, '') as interested_orgs,
      coalesce(r.completion_form, '') as completion_form,
      btrim(coalesce(r.due_raw, '')) as due_raw,
      btrim(coalesce(r.status_raw, r.status_normalized, '')) as status_raw,
      btrim(coalesce(r.status_normalized, '')) as status_normalized,
      coalesce(r.position_2024_2025, '') as position_2024_2025,
      coalesce(r.position_2026, '') as position_2026,
      coalesce(r.adgs_position, '') as adgs_position,
      null::text as changed_by,
      coalesce(r.case_note, '') as case_note,
      r.status_updated_at,
      r.source_row_no,
      r.source_file_name,
      r.source_sheet_name,
      r.created_at,
      r.updated_at,
      (
        select org_name
        from public.recommendation_responsible
        where record_id = r.id and role = 'primary'
        order by position, id
        limit 1
      ) as _responsible_primary,
      coalesce(
        (
          select array_agg(org_name order by position, id)
          from public.recommendation_responsible
          where record_id = r.id and role = 'co'
        ),
        '{}'::text[]
      ) as _responsible_co
    from public.recommendations r
    where r.id = $1
  `, [id]);

  const row = res.rows[0];
  if (!row) return null;

  row.status_group = normalizeStatusGroup(row.status_normalized);

  // Build structured responsible object; fall back to parseResponsible if link table is empty
  const primary = row._responsible_primary ?? null;
  const co = Array.isArray(row._responsible_co) ? row._responsible_co : [];
  const raw = row.responsible_raw ?? '';

  if (primary) {
    row.responsible = { primary, co, raw };
  } else {
    row.responsible = { ...parseResponsible(raw), raw };
  }
  // Keep legacy flat field for compatibility
  row.responsible_org = primary ?? raw;

  delete row._responsible_primary;
  delete row._responsible_co;
  delete row.responsible_raw;

  return row;
}

export async function getStatusHistory(id) {
  const res = await pool.query(`
    select id, old_status, new_status, comment, changed_at
    from public.status_history
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
  const statusNormalized = normalizeStatusValue(rawStatus);
  const dueRaw = payload.due_raw?.trim() || payload.deadline?.trim() || null;
  const position2026 = payload.position_2026 ?? payload.position2026 ?? null;
  const adgsPosition = payload.adgs_position ?? payload.adgsPosition ?? null;
  const caseNote = payload.comment ?? payload.case_note ?? null;

  const oldRes = await pool.query(
    'select status_normalized from public.recommendations where id = $1',
    [id]
  );
  if (!oldRes.rows[0]) return null;
  const oldStatus = oldRes.rows[0].status_normalized;

  const res = await pool.query(`
    update public.recommendations
    set
      status_normalized = coalesce($2, status_normalized),
      due_raw = coalesce($3, due_raw),
      position_2026 = coalesce($4, position_2026),
      adgs_position = coalesce($5, adgs_position),
      case_note = coalesce($6, case_note),
      status_updated_at = CASE WHEN $2::text IS NULL THEN status_updated_at ELSE now() END
    where id = $1
    returning id
  `, [id, statusNormalized, dueRaw, position2026, adgsPosition, caseNote]);

  if (!res.rows[0]) return null;

  try {
    await pool.query(
      `insert into public.status_history (record_id, old_status, new_status, comment)
       values ($1, $2, $3, $4)`,
      [id, oldStatus, statusNormalized, caseNote]
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
