import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ---- Recommendations ----
export const recommendations = sqliteTable("recommendations", {
  id: integer("id").primaryKey(),           // original №
  type: text("type"),                        // Анализ / Мониторинг
  cycle: text("cycle"),                      // I–VII
  sphere: text("sphere"),
  proposal: text("proposal"),
  responsible: text("responsible"),
  responsibleAll: text("responsible_all"),  // JSON array of all execs (for multi-exec records)
  stakeholders: text("stakeholders"),
  completionForm: text("completion_form"),
  deadline: text("deadline"),
  status: text("status"),                    // normalized
  position2024: text("position_2024"),
  position2026: text("position_2026"),
  adgsPosition: text("adgs_position"),
  caseNote: text("case_note"),
});

export const insertRecommendationSchema = createInsertSchema(recommendations);
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

// ---- Status history ----
export const statusHistory = sqliteTable("status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recommendationId: integer("recommendation_id").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  oldDeadline: text("old_deadline"),
  newDeadline: text("new_deadline"),
  oldPosition2026: text("old_position_2026"),
  newPosition2026: text("new_position_2026"),
  changedBy: text("changed_by"),
  changedAt: text("changed_at").notNull(),
  comment: text("comment"),
});

export type StatusHistory = typeof statusHistory.$inferSelect;

// ---- Update payload ----
export const updateStatusSchema = z.object({
  status: z.string(),
  deadline: z.string().optional(),
  position2026: z.string().optional(),
  adgsPosition: z.string().optional(),
  changedBy: z.string().optional(),
  comment: z.string().optional(),
});
export type UpdateStatusPayload = z.infer<typeof updateStatusSchema>;
