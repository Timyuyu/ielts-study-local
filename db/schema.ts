import { text, sqliteTable } from "drizzle-orm/sqlite-core";

export const studySnapshots = sqliteTable("study_snapshots", {
  userEmail: text("user_email").primaryKey(),
  snapshot: text("snapshot").notNull(),
  updatedAt: text("updated_at").notNull(),
});
