import { query, initDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM
  
  try {
    await initDb();
    const { rows } = await query('SELECT * FROM payments WHERE date LIKE $1 ORDER BY date ASC', [month + '%']);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const { id, date, amount } = await request.json();
    if (id) {
      await query('UPDATE payments SET date = $1, amount = $2 WHERE id = $3', [date, amount, id]);
    } else {
      await query('INSERT INTO payments (date, amount) VALUES ($1, $2)', [date, amount]);
    }
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
    await query('DELETE FROM payments WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
