import initSqlJs, { Database as SqlDatabase } from 'sql.js';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

let _db: SqlDatabase | null = null;
let _dbPath: string;

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      if (app.isPackaged) {
        return path.join(process.resourcesPath, file);
      }
      // dev: __dirname = .vite/build/, iki üst = proje kökü
      return path.join(__dirname, '../../node_modules/sql.js/dist', file);
    },
  });

  const userDataPath = app.getPath('userData');
  fs.mkdirSync(userDataPath, { recursive: true });
  _dbPath = path.join(userDataPath, 'data.db');

  if (fs.existsSync(_dbPath)) {
    const buf = fs.readFileSync(_dbPath);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  migrate(_db);
  persist();
}

function getDb(): SqlDatabase {
  if (!_db) throw new Error('Database not initialized. Call initDb() first.');
  return _db;
}

function persist(): void {
  if (!_db || !_dbPath) return;
  const data = _db.export();
  fs.writeFileSync(_dbPath, Buffer.from(data));
}

function migrate(db: SqlDatabase) {
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id           TEXT PRIMARY KEY,
      title        TEXT,
      started_at   INTEGER,
      ended_at     INTEGER,
      duration_sec INTEGER,
      transcript   TEXT,
      summary      TEXT,
      action_items TEXT,
      tags         TEXT,
      created_at   INTEGER
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
      title,
      transcript,
      summary,
      action_items,
      content='sessions',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS sessions_ai AFTER INSERT ON sessions BEGIN
      INSERT INTO sessions_fts(rowid, title, transcript, summary, action_items)
      VALUES (new.rowid, new.title, new.transcript, new.summary, new.action_items);
    END;

    CREATE TRIGGER IF NOT EXISTS sessions_ad AFTER DELETE ON sessions BEGIN
      INSERT INTO sessions_fts(sessions_fts, rowid, title, transcript, summary, action_items)
      VALUES ('delete', old.rowid, old.title, old.transcript, old.summary, old.action_items);
    END;

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function execSelect<T>(db: SqlDatabase, sql: string, params?: any[]): T[] {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export interface Session {
  id: string;
  title: string;
  started_at: number;
  ended_at: number;
  duration_sec: number;
  transcript: string;
  summary: string;
  action_items: string;
  tags: string;
  created_at: number;
}

export type NewSession = Omit<Session, 'id' | 'created_at'>;

export function insertSession(session: NewSession): Session {
  const db = getDb();
  const id = crypto.randomUUID();
  const created_at = Date.now();
  db.run(
    `INSERT INTO sessions (id, title, started_at, ended_at, duration_sec, transcript, summary, action_items, tags, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, session.title, session.started_at, session.ended_at,
     session.duration_sec, session.transcript, session.summary,
     session.action_items, session.tags, created_at],
  );
  persist();
  return { ...session, id, created_at };
}

export function getSessions(limit = 50, offset = 0): Session[] {
  return execSelect<Session>(
    getDb(),
    'SELECT * FROM sessions ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  );
}

export function getSession(id: string): Session | undefined {
  const rows = execSelect<Session>(getDb(), 'SELECT * FROM sessions WHERE id = ?', [id]);
  return rows[0];
}

export function searchSessions(query: string): Session[] {
  if (!query.trim()) return getSessions();
  const escaped = query.replace(/["*]/g, '');
  return execSelect<Session>(
    getDb(),
    `SELECT s.* FROM sessions s
     INNER JOIN sessions_fts f ON s.rowid = f.rowid
     WHERE sessions_fts MATCH ?
     ORDER BY s.created_at DESC`,
    [`"${escaped}"*`],
  );
}

export function deleteSession(id: string): void {
  getDb().run('DELETE FROM sessions WHERE id = ?', [id]);
  persist();
}
