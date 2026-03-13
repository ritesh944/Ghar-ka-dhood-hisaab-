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
      id ${isProd ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${!isProd ? 'AUTOINCREMENT' : ''},
      date TEXT UNIQUE,
      quantity REAL,
      rate REAL
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      id ${isProd ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${!isProd ? 'AUTOINCREMENT' : ''},
      date TEXT,
      amount REAL
    );`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );`
  ];

  const seedQueries = [
    { key: 'default_rate', value: '60' },
    { key: 'theme', value: 'midnight' },
    { key: 'pin', value: '2580' }
  ];

  try {
    for (const q of queries) {
      if (isProd) {
        await sql.query(q);
      } else {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database('milk_tracker.db');
        db.exec(q);
      }
    }

    for (const seed of seedQueries) {
      if (isProd) {
        await sql.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [seed.key, seed.value]);
      } else {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database('milk_tracker.db');
        db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run(seed.key, seed.value);
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}
