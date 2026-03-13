import { createPool, VercelPool } from '@vercel/postgres';

const isProd = process.env.VERCEL === '1';

let pool: VercelPool | null = null;

function getPool() {
  if (!isProd) return null;
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
    if (!connectionString) {
      throw new Error('DATABASE_ERROR: No connection string found. Please check Vercel Environment Variables.');
    }
    pool = createPool({ connectionString });
  }
  return pool;
}

export async function query(text: string, params: any[] = []) {
  if (isProd) {
    const p = getPool();
    try {
      return await p!.query(text, params);
    } catch (error: any) {
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
    if (isProd) {
      const p = getPool();
      for (const q of queries) {
        await p!.query(q);
      }
      for (const seed of seedQueries) {
        await p!.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [seed.key, seed.value]);
      }
    } else {
      const Database = (await import('better-sqlite3')).default;
      const db = new Database('milk_tracker.db');
      for (const q of queries) {
        db.exec(q);
      }
      for (const seed of seedQueries) {
        db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run(seed.key, seed.value);
      }
    }
    isInitialized = true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}
