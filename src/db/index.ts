import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

export function openDb(file: string): { db: Db; sqlite: Database.Database } {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { db, sqlite };
}

const holder = globalThis as unknown as { joblessDb?: { db: Db; sqlite: Database.Database } };

export function getConnection() {
  holder.joblessDb ??= openDb(process.env.JOBLESS_DB ?? path.join(process.cwd(), "data", "jobless.db"));
  return holder.joblessDb;
}

export function getDb(): Db {
  return getConnection().db;
}
