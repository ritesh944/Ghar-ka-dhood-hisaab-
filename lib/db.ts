import { sql } from '@vercel/postgres';

const isProd = process.env.VERCEL === '1'; // Check if running on Vercel

export async function query(text: string, params: any[] = []) {
  if (isProd) {
    if (!process.env.POSTGRES_URL) {
      throw new Error('DATABASE_ERROR: POSTGRES_URL is missing. Please connect Vercel Postgres in the Storage tab.');
    }
    return sql.query(text, params);
  } else {
    const Database = (await import('better-sqlite3')).default;
    const db = new Database('milk_tracker.db');
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
      const Database = (await import('better-sqlite3')).default;
      const db = new Database('milk_tracker.db');
      db.exec(q.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT').replace('ON CONFLICT (key) DO NOTHING', 'OR IGNORE'));
    }
  }
}
