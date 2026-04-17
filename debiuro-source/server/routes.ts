import type { Express } from "express";
import { createServer } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage, splitExecs } from "./storage";
import { updateStatusSchema, type InsertRecommendation } from "../shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

// Normalize status values from raw Excel
function normalizeStatus(raw: string | null | undefined): string {
  if (!raw) return 'Не указано';
  const s = raw.toString().trim().toLowerCase();
  if (s.includes('исполнено')) return 'Исполнено';
  if (s.includes('в работе') || s.includes('в работу')) return 'В работе';
  if (s.includes('не поддерживается') || s.includes('не поддерж')) return 'Не поддерживается';
  if (s.includes('отсутствует')) return 'Отсутствует позиция';
  return raw.toString().trim() || 'Не указано';
}

function normalizeSphere(raw: string | null | undefined): string {
  if (!raw) return '';
  const map: Record<string, string> = {
    'госзакупки': 'Госзакупки', 'госуправление': 'Госуправление',
    'госуслуги': 'Госуслуги', 'цифровизация': 'Цифровизация',
    'цифровые развития': 'Цифровое развитие', 'цифровое развития': 'Цифровое развитие',
    'общая': 'Общая', 'недропользования': 'Недропользование',
    'промышленность и строительство ': 'Промышленность и строительство',
    'государственно-частное партнерство ': 'Государственно-частное партнерство',
    'функции ': 'Функции', 'отказы в реализации прав граждан ': 'Отказы в реализации прав граждан',
  };
  const key = raw.toString().trim().toLowerCase();
  return map[key] || raw.toString().trim();
}

export async function registerRoutes(httpServer: any, app: Express) {
  // ---- Seed DB from pre-baked JSON on first start ----
  const count = storage.countImported();
  if (count === 0) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const dataPath = path.join(process.cwd(), 'data.json');
      if (fs.existsSync(dataPath)) {
        const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        storage.upsertMany(raw);
        console.log(`Seeded ${raw.length} recommendations from data.json`);
      }
    } catch (e) {
      console.log('No data.json found, DB empty until import');
    }
  }

  // ---- GET /api/stats ----
  app.get('/api/stats', (_req, res) => {
    res.json(storage.getStats());
  });

  // ---- GET /api/recommendations ----
  app.get('/api/recommendations', (req, res) => {
    const { search, cycle, status, sphere, type, responsible, completionForm, page = '1', pageSize = '50' } = req.query as any;
    const all = storage.getAll({ search, cycle, status, sphere, type, responsible, completionForm });
    const total = all.length;
    const p = parseInt(page);
    const ps = parseInt(pageSize);
    const items = all.slice((p - 1) * ps, p * ps);
    res.json({ total, page: p, pageSize: ps, pages: Math.ceil(total / ps), items });
  });

  // ---- GET /api/recommendations/:id ----
  app.get('/api/recommendations/:id', (req, res) => {
    const rec = storage.getById(parseInt(req.params.id));
    if (!rec) return res.status(404).json({ error: 'Не найдено' });
    res.json(rec);
  });

  // ---- PATCH /api/recommendations/:id/status ----
  app.patch('/api/recommendations/:id/status', (req, res) => {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const updated = storage.updateStatus(parseInt(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ error: 'Не найдено' });
    res.json(updated);
  });

  // ---- GET /api/history ----
  app.get('/api/history', (req, res) => {
    const recId = req.query.recId ? parseInt(req.query.recId as string) : undefined;
    res.json(storage.getHistory(recId));
  });

  // ---- POST /api/import (Excel upload) ----
  app.post('/api/import', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    try {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets['перечень'] || wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][];

      const rows: InsertRecommendation[] = [];
      for (let i = 2; i < raw.length; i++) {
        const row = raw[i];
        if (!row[0] || isNaN(Number(row[0]))) continue;
        // Multi-exec: split on newline/comma, primary = first, all stored as JSON
        const rawExec = row[5]?.toString().trim() || null;
        const execList = rawExec ? splitExecs(rawExec) : [];
        const primaryExec = execList[0] || rawExec || null;
        const responsibleAll = execList.length > 1 ? JSON.stringify(execList) : null;

        rows.push({
          id: Number(row[0]),
          type: row[1]?.toString().trim() || null,
          cycle: row[2]?.toString().trim() || null,
          sphere: normalizeSphere(row[3]),
          proposal: row[4]?.toString().trim() || null,
          responsible: primaryExec,
          responsibleAll,
          stakeholders: row[6]?.toString().trim() || null,
          completionForm: row[7]?.toString().trim() || null,
          deadline: row[8]?.toString().replace(/\n/g,' ').trim() || null,
          status: normalizeStatus(row[9]),
          position2024: row[10]?.toString().trim() || null,
          position2026: row[11]?.toString().trim() || null,
          adgsPosition: row[12]?.toString().trim() || null,
          caseNote: row[13]?.toString().trim() || null,
        });
      }
      storage.upsertMany(rows);
      res.json({ imported: rows.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- GET /api/export ----
  app.get('/api/export', (req, res) => {
    const { cycle, status, sphere, type, responsible } = req.query as any;
    const data = storage.getAll({ cycle, status, sphere, type, responsible });

    const rows = data.map(r => {
      // Re-join multiple execs as comma-separated string for export
      let execDisplay = r.responsible || '';
      if (r.responsibleAll) {
        try {
          const arr = JSON.parse(r.responsibleAll) as string[];
          if (arr.length > 1) execDisplay = arr.join(', ');
        } catch (_) {}
      }
      return ({
      '№': r.id, 'Тип': r.type, 'Цикл': r.cycle, 'Сфера': r.sphere,
      'Предложение': r.proposal, 'Ответственный исполнитель': execDisplay,
      'Заинтересованные ГО': r.stakeholders, 'Форма завершения': r.completionForm,
      'Срок исполнения': r.deadline, 'Статус ГО': r.status,
      'Позиция ГО 2024-2025': r.position2024,
      'Позиция ГО на 27.03.2026': r.position2026,
      'Позиция АДГС': r.adgsPosition, 'Кейс': r.caseNote,
    })});

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      {wch:6},{wch:12},{wch:8},{wch:22},{wch:60},
      {wch:18},{wch:30},{wch:40},{wch:18},{wch:24},
      {wch:40},{wch:40},{wch:30},{wch:15}
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Постмониторинг');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const date = new Date().toISOString().slice(0,10);
    res.setHeader('Content-Disposition', `attachment; filename=postmonitoring-${date}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  });

  // ---- GET /api/meta (distinct values for filters) ----
  app.get('/api/meta', (_req, res) => {
    const all = storage.getAll();
    const spheres = [...new Set(all.map(r => r.sphere).filter(Boolean))].sort();
    const execs = [...new Set(all.map(r => r.responsible?.trim()).filter(Boolean))].sort();
    const cycles = ['I','II','III','IV','V','VI','VII'];
    const statuses = ['Исполнено','В работе','Не поддерживается','Отсутствует позиция','Не указано'];
    const types = [...new Set(all.map(r => r.type).filter(Boolean))].sort();
    res.json({ spheres, execs, cycles, statuses, types });
  });

  return createServer(app);
}
