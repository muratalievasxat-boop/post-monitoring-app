import { Router } from 'express';
import { pool } from '../../db/queries/pool.js';

const router = Router();

router.get('/summary', async (_req, res) => {
  const totals = await pool.query(`
    select
      count(*)::int as all,
      count(*) filter (where status_normalized = 'В работе')::int as active,
      count(*) filter (where status_normalized = 'Исполнено')::int as done,
      count(*) filter (where status_normalized = 'Не поддерживается')::int as rejected,
      count(*) filter (where status_normalized = 'Исключить')::int as excluded,
      count(*) filter (
        where status_normalized is null
           or btrim(status_normalized) = ''
      )::int as unknown,
      0::int as overdue
    from registry_records
  `);

  const bySphere = await pool.query(`
    select coalesce(sphere, 'Без сферы') as sphere, count(*)::int as count
    from registry_records
    group by 1
    order by 2 desc, 1 asc
    limit 20
  `);

  const byResponsibleOrg = await pool.query(`
    select coalesce(responsible_org, 'Не указан') as responsible_org, count(*)::int as count
    from registry_records
    group by 1
    order by 2 desc, 1 asc
    limit 20
  `);

  const byCycle = await pool.query(`
    select coalesce(cycle, 'Без цикла') as cycle, count(*)::int as count
    from registry_records
    group by 1
    order by 1 asc
  `);

  res.json({
    totals: totals.rows[0],
    bySphere: bySphere.rows,
    byResponsibleOrg: byResponsibleOrg.rows,
    byCycle: byCycle.rows
  });
});

export default router;