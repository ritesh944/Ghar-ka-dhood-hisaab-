import { createPool } from '@vercel/postgres';

const isProd = process.env.VERCEL === '1';

// Create a pool instance for production
const pool = isProd ? createPool({
  connectionString: process.env.POSTGRES_URL
}) : null;

export async function query(text: string, params: any[] = []) {
  if (isProd) {
    if (!process.env.POSTGRES_URL) {
      throw new Error('DATABASE_ERROR: POSTGRES_URL is missing. Please connect Vercel Postgres in the Storage tab.');
    }
    try {
      return await pool!.query(text, params);
    } catch (error: any) {
      // If pooled connection fails, it might be a direct connection string
      console.error('Database query error:', error);
      throw error;
    }
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

let isInitialized = false;

export async function initDb() {
  if (isInitialized) return;
  
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
        await pool!.query(q);
      } else {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database('milk_tracker.db');
        db.exec(q);
      }
    }

    for (const seed of seedQueries) {
      if (isProd) {
        await pool!.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [seed.key, seed.value]);
      } else {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database('milk_tracker.db');
        db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run(seed.key, seed.value);
      }
    }
    isInitialized = true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}
