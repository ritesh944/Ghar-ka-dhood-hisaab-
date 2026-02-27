import { query, initDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await initDb();
    const { rows } = await query('SELECT * FROM settings');
    const settings = rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const settings = await request.json();
    for (const [key, value] of Object.entries(settings)) {
      await query('DELETE FROM settings WHERE key = $1', [key]);
      await query('INSERT INTO settings (key, value) VALUES ($1, $2)', [key, value?.toString()]);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
