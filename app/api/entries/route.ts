import { query, initDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM
  
  try {
    await initDb();
    const { rows } = await query('SELECT * FROM entries WHERE date LIKE $1 ORDER BY date ASC', [month + '%']);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const { date, quantity, rate } = await request.json();
    // Use INSERT OR REPLACE logic for SQLite and ON CONFLICT for Postgres
    // For simplicity, we'll try to delete first then insert if it's not working with ON CONFLICT across both
    await query('DELETE FROM entries WHERE date = $1', [date]);
    await query('INSERT INTO entries (date, quantity, rate) VALUES ($1, $2, $3)', [date, quantity, rate]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  try {
    await initDb();
    await query('DELETE FROM entries WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
