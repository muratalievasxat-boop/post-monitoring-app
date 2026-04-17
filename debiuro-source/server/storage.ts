import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { eq, like, and, or } from "drizzle-orm";
import {
  recommendations, statusHistory,
  type Recommendation, type InsertRecommendation,
  type StatusHistory, type UpdateStatusPayload,
} from "../shared/schema";

// On Render: store DB on persistent disk at /app/data/debiuro.db
// Locally / Docker: store in current directory
const DATA_DIR = process.env.RENDER ? '/app/data' : process.cwd();
if (process.env.RENDER && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'debiuro.db');
const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite);

// Create tables (add responsibleAll column if not exists via migration)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY,
    type TEXT, cycle TEXT, sphere TEXT, proposal TEXT,
    responsible TEXT, responsible_all TEXT,
    stakeholders TEXT, completion_form TEXT,
    deadline TEXT, status TEXT, position_2024 TEXT,
    position_2026 TEXT, adgs_position TEXT, case_note TEXT
  );
  CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation_id INTEGER NOT NULL,
    old_status TEXT, new_status TEXT,
    old_deadline TEXT, new_deadline TEXT,
    old_position_2026 TEXT, new_position_2026 TEXT,
    changed_by TEXT, changed_at TEXT NOT NULL, comment TEXT
  );
`);

// Migration: add responsible_all column if it doesn't exist yet
try {
  sqlite.exec(`ALTER TABLE recommendations ADD COLUMN responsible_all TEXT`);
} catch (_) {
  // Column already exists — ignore
}

export interface IStorage {
  // Recommendations
  getAll(filters?: RecFilter): Recommendation[];
  getById(id: number): Recommendation | undefined;
  upsertMany(rows: InsertRecommendation[]): void;
  updateStatus(id: number, payload: UpdateStatusPayload): Recommendation | undefined;
  countImported(): number;

  // History
  getHistory(recId?: number): StatusHistory[];

  // Analytics
  getStats(): Stats;
}

export interface RecFilter {
  search?: string;
  cycle?: string;
  status?: string;
  sphere?: string;
  type?: string;
  responsible?: string;
  completionForm?: string; // normalized form name (e.g. "В АДГС")
}

export interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byCycle: {
    cycle: string; total: number; done: number; inWork: number; rejected: number; noStatus: number;
    doneAnalysis: number; doneMonitoring: number; totalAnalysis: number; totalMonitoring: number;
  }[];
  bySphere: { sphere: string; count: number; done: number; inWork: number; rejected: number }[];
  byExec: { responsible: string; count: number; done: number }[];
  byType: Record<string, number>;
  byForm: { form: string; total: number; done: number }[];
  overdue: number;
  overdueByExec: { responsible: string; count: number }[];
  // Execs with 0% done across completed (non-live) cycles only
  needsAttention: { responsible: string; count: number; done: number; cycles: string[] }[];
  // Execs with ≤10% done in live cycles (shown separately with warning)
  needsAttentionLive: { responsible: string; count: number; done: number; cycles: string[] }[];
  liveCycles: string[]; // cycles excluded from needsAttention
}

// Normalize completion form into categories
function normalizeForm(raw: string | null | undefined): string {
  if (!raw) return 'Прочее';
  const s = raw.trim();
  if (!s) return 'Прочее';
  if (s.includes('АДГС')) return 'В АДГС';
  if (s.includes('Аппарат') || s.includes('АПР')) return 'В Аппарат Правительства';
  if (/закон/i.test(s)) return 'Законодательный акт';
  if (/президент/i.test(s)) return 'В Администрацию Президента';
  if (/постановление/i.test(s)) return 'Постановление';
  if (/приказ/i.test(s)) return 'Приказ';
  return 'Прочее';
}

// Check if rec is overdue: deadline contains 2024 or 2025 AND status is "В работе"
function isOverdue(deadline: string | null | undefined, status: string | null | undefined): boolean {
  if (!deadline || !status) return false;
  if (status !== 'В работе') return false;
  return deadline.includes('2024') || deadline.includes('2025');
}

// Split multi-exec string → array of individual exec names
export function splitExecs(raw: string | null | undefined): string[] {
  if (!raw) return [];
  // Split on newline variants and commas; filter blanks
  return raw
    .replace(/_x000d_/g, '\n')
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export const storage: IStorage = {
  getAll(filters: RecFilter = {}): Recommendation[] {
    let q = db.select().from(recommendations);
    const conditions: any[] = [];

    if (filters.cycle) conditions.push(eq(recommendations.cycle, filters.cycle));
    if (filters.status) conditions.push(eq(recommendations.status, filters.status));
    if (filters.sphere) conditions.push(eq(recommendations.sphere, filters.sphere));
    if (filters.type) conditions.push(eq(recommendations.type, filters.type));
    if (filters.responsible) {
      // Search in responsible_all (JSON array) as well as responsible field
      const term = `%${filters.responsible}%`;
      conditions.push(
        or(
          like(recommendations.responsible, term),
          like(recommendations.responsibleAll, term)
        )
      );
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          like(recommendations.proposal, term),
          like(recommendations.responsible, term),
          like(recommendations.sphere, term),
          like(recommendations.stakeholders, term),
          like(recommendations.responsibleAll, term)
        )
      );
    }

    let results = conditions.length > 0 ? q.where(and(...conditions)).all() : q.all();

    // completionForm is a normalized JS value — filter post-SQL
    if (filters.completionForm) {
      const target = filters.completionForm;
      results = results.filter(r => normalizeForm(r.completionForm) === target);
    }

    return results;
  },

  getById(id: number): Recommendation | undefined {
    return db.select().from(recommendations).where(eq(recommendations.id, id)).get();
  },

  upsertMany(rows: InsertRecommendation[]): void {
    const insert = sqlite.prepare(`
      INSERT OR REPLACE INTO recommendations
        (id,type,cycle,sphere,proposal,responsible,responsible_all,stakeholders,completion_form,
         deadline,status,position_2024,position_2026,adgs_position,case_note)
      VALUES
        (@id,@type,@cycle,@sphere,@proposal,@responsible,@responsibleAll,@stakeholders,@completionForm,
         @deadline,@status,@position2024,@position2026,@adgsPosition,@caseNote)
    `);
    const insertMany = sqlite.transaction((rows: InsertRecommendation[]) => {
      for (const r of rows) insert.run(r);
    });
    insertMany(rows);
  },

  updateStatus(id: number, payload: UpdateStatusPayload): Recommendation | undefined {
    const old = this.getById(id);
    if (!old) return undefined;

    // Save history
    db.insert(statusHistory).values({
      recommendationId: id,
      oldStatus: old.status,
      newStatus: payload.status,
      oldDeadline: old.deadline,
      newDeadline: payload.deadline ?? old.deadline,
      oldPosition2026: old.position2026,
      newPosition2026: payload.position2026 ?? old.position2026,
      changedBy: payload.changedBy ?? 'Аноним',
      changedAt: new Date().toLocaleString('ru-RU'),
      comment: payload.comment,
    }).run();

    // Update rec
    sqlite.prepare(`
      UPDATE recommendations SET
        status = ?, deadline = ?, position_2026 = ?, adgs_position = ?
      WHERE id = ?
    `).run(
      payload.status,
      payload.deadline ?? old.deadline,
      payload.position2026 ?? old.position2026,
      payload.adgsPosition ?? old.adgsPosition,
      id
    );

    return this.getById(id);
  },

  countImported(): number {
    const row = sqlite.prepare("SELECT COUNT(*) as cnt FROM recommendations").get() as any;
    return row.cnt;
  },

  getHistory(recId?: number): StatusHistory[] {
    if (recId) {
      return db.select().from(statusHistory)
        .where(eq(statusHistory.recommendationId, recId))
        .all();
    }
    return db.select().from(statusHistory).all();
  },

  getStats(): Stats {
    const all = this.getAll();
    const total = all.length;

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const sphereMap: Record<string, { count: number; done: number; inWork: number; rejected: number }> = {};
    const execMap: Record<string, { count: number; done: number }> = {};
    const cycleMap: Record<string, {
      total: number; done: number; inWork: number; rejected: number; noStatus: number;
      doneAnalysis: number; doneMonitoring: number; totalAnalysis: number; totalMonitoring: number;
    }> = {};
    const formMap: Record<string, { total: number; done: number }> = {};
    let overdueCount = 0;
    const overdueExecMap: Record<string, number> = {};

    for (const r of all) {
      const s = r.status || 'Не указано';
      byStatus[s] = (byStatus[s] || 0) + 1;

      const t = r.type || 'Не указан';
      byType[t] = (byType[t] || 0) + 1;

      // Sphere stats
      if (r.sphere) {
        if (!sphereMap[r.sphere]) sphereMap[r.sphere] = { count: 0, done: 0, inWork: 0, rejected: 0 };
        sphereMap[r.sphere].count++;
        if (s === 'Исполнено') sphereMap[r.sphere].done++;
        else if (s === 'В работе') sphereMap[r.sphere].inWork++;
        else if (s === 'Не поддерживается') sphereMap[r.sphere].rejected++;
      }

      // Exec stats — parse responsibleAll JSON array if present, else use responsible
      let primaryExec: string;
      if (r.responsibleAll) {
        try {
          const arr = JSON.parse(r.responsibleAll) as string[];
          primaryExec = arr[0] || r.responsible?.trim() || '';
        } catch {
          primaryExec = r.responsible?.trim() || '';
        }
      } else {
        primaryExec = r.responsible?.trim() || '';
      }
      // For exec stats we use primary exec to avoid double counting
      if (primaryExec) {
        if (!execMap[primaryExec]) execMap[primaryExec] = { count: 0, done: 0 };
        execMap[primaryExec].count++;
        if (s === 'Исполнено') execMap[primaryExec].done++;
      }

      // Cycle stats
      const c = r.cycle || '?';
      if (!cycleMap[c]) cycleMap[c] = {
        total: 0, done: 0, inWork: 0, rejected: 0, noStatus: 0,
        doneAnalysis: 0, doneMonitoring: 0, totalAnalysis: 0, totalMonitoring: 0
      };
      cycleMap[c].total++;
      if (s === 'Исполнено') cycleMap[c].done++;
      else if (s === 'В работе') cycleMap[c].inWork++;
      else if (s === 'Не поддерживается') cycleMap[c].rejected++;
      else cycleMap[c].noStatus++;

      // Анализ vs Мониторинг split
      const typeNorm = (r.type || '').trim().toLowerCase();
      if (typeNorm === 'анализ') {
        cycleMap[c].totalAnalysis++;
        if (s === 'Исполнено') cycleMap[c].doneAnalysis++;
      } else if (typeNorm === 'мониторинг') {
        cycleMap[c].totalMonitoring++;
        if (s === 'Исполнено') cycleMap[c].doneMonitoring++;
      }

      // Form completion
      const form = normalizeForm(r.completionForm);
      if (!formMap[form]) formMap[form] = { total: 0, done: 0 };
      formMap[form].total++;
      if (s === 'Исполнено') formMap[form].done++;

      // Overdue
      if (isOverdue(r.deadline, r.status)) {
        overdueCount++;
        const exec = primaryExec || 'Не указан';
        overdueExecMap[exec] = (overdueExecMap[exec] || 0) + 1;
      }
    }

    const byCycle = ['I','II','III','IV','V','VI','VII'].map(c => ({
      cycle: c, ...(cycleMap[c] || {
        total: 0, done: 0, inWork: 0, rejected: 0, noStatus: 0,
        doneAnalysis: 0, doneMonitoring: 0, totalAnalysis: 0, totalMonitoring: 0
      })
    }));

    const bySphere = Object.entries(sphereMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15)
      .map(([sphere, v]) => ({ sphere, ...v }));

    // Return all execs (frontend slices top-10 for chart; uses full list for outsiders)
    const byExec = Object.entries(execMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([responsible, v]) => ({ responsible, ...v }));

    // Form — sort by total desc, exclude tiny "Прочее" at end
    const byForm = Object.entries(formMap)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([form, v]) => ({ form, ...v }));

    const overdueByExec = Object.entries(overdueExecMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([responsible, count]) => ({ responsible, count }));

    // --- "Требуют внимания" logic ---
    // A cycle is "live" if noStatus > 50% of its total (not yet settled)
    const liveCycles = new Set(
      Object.entries(cycleMap)
        .filter(([, v]) => v.total > 0 && v.noStatus / v.total > 0.5)
        .map(([c]) => c)
    );

    // For each exec: count recs & done only in completed (non-live) cycles
    const execCompletedMap: Record<string, { count: number; done: number; cycles: Set<string> }> = {};
    for (const r of all) {
      const c = r.cycle || '?';
      if (liveCycles.has(c)) continue; // skip live cycles
      const s = r.status || 'Не указано';
      let exec: string;
      if (r.responsibleAll) {
        try { exec = (JSON.parse(r.responsibleAll) as string[])[0] || r.responsible?.trim() || ''; }
        catch { exec = r.responsible?.trim() || ''; }
      } else {
        exec = r.responsible?.trim() || '';
      }
      if (!exec) continue;
      if (!execCompletedMap[exec]) execCompletedMap[exec] = { count: 0, done: 0, cycles: new Set() };
      execCompletedMap[exec].count++;
      execCompletedMap[exec].cycles.add(c);
      if (s === 'Исполнено') execCompletedMap[exec].done++;
    }

    const needsAttention = Object.entries(execCompletedMap)
      .filter(([, v]) => v.count >= 10 && v.done === 0)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([responsible, v]) => ({
        responsible,
        count: v.count,
        done: v.done,
        cycles: [...v.cycles].sort(),
      }));

    // Same but for live cycles only
    const execLiveMap: Record<string, { count: number; done: number; cycles: Set<string> }> = {};
    for (const r of all) {
      const c = r.cycle || '?';
      if (!liveCycles.has(c)) continue; // only live cycles
      const s = r.status || 'Не указано';
      let exec: string;
      if (r.responsibleAll) {
        try { exec = (JSON.parse(r.responsibleAll) as string[])[0] || r.responsible?.trim() || ''; }
        catch { exec = r.responsible?.trim() || ''; }
      } else {
        exec = r.responsible?.trim() || '';
      }
      if (!exec) continue;
      if (!execLiveMap[exec]) execLiveMap[exec] = { count: 0, done: 0, cycles: new Set() };
      execLiveMap[exec].count++;
      execLiveMap[exec].cycles.add(c);
      if (s === 'Исполнено') execLiveMap[exec].done++;
    }

    const needsAttentionLive = Object.entries(execLiveMap)
      .filter(([, v]) => v.count >= 10 && (v.done === 0 || v.done / v.count <= 0.10))
      .sort((a, b) => b[1].count - a[1].count)
      .map(([responsible, v]) => ({
        responsible,
        count: v.count,
        done: v.done,
        cycles: [...v.cycles].sort(),
      }));

    return { total, byStatus, byCycle, bySphere, byExec, byType, byForm, overdue: overdueCount, overdueByExec, needsAttention, needsAttentionLive, liveCycles: [...liveCycles] };
  },
};
