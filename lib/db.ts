import { sql } from '@vercel/postgres';
import Database from 'better-sqlite3';

const isProd = process.env.NODE_ENV === 'production' && process.env.POSTGRES_URL;

export async function query(text: string, params: any[] = []) {
  if (isProd) {
    // For Vercel Postgres, we need to adapt the query slightly if using tagged templates
    // But for simplicity, we'll use the sql helper where possible.
    // This is a generic query wrapper.
    return sql.query(text, params);
  } else {
    const db = new Database('milk_tracker.db');
    // Convert Postgres $1, $2 to SQLite ?, ?
    const sqliteQuery = text.replace(/\$\d+/g, '?');
    const stmt = db.prepare(sqliteQuery);
    if (text.trim().toUpperCase().startsWith('SELECT')) {
      return { rows: stmt.all(...params) };
    } else {
      return { rows: [stmt.run(...params)] };
    }
  }
}

export async function initDb() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      date TEXT UNIQUE,
      quantity REAL,
      rate REAL
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      date TEXT,
      amount REAL
    );`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );`,
    `INSERT INTO settings (key, value) VALUES ('default_rate', '60') ON CONFLICT (key) DO NOTHING;`,
    `INSERT INTO settings (key, value) VALUES ('theme', 'midnight') ON CONFLICT (key) DO NOTHING;`,
    `INSERT INTO settings (key, value) VALUES ('pin', '2580') ON CONFLICT (key) DO NOTHING;`
  ];

  for (const q of queries) {
    if (isProd) {
      await sql.query(q);
    } else {
      const db = new Database('milk_tracker.db');
      db.exec(q.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('ON CONFLICT (key) DO NOTHING', 'OR IGNORE'));
    }
  }
}
