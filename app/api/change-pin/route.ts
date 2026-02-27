import { query, initDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    await initDb();
    const { currentPin, newPin } = await request.json();
    const { rows } = await query('SELECT value FROM settings WHERE key = $1', ['pin']);
    const storedPin = rows[0]?.value;

    if (currentPin !== storedPin) {
      return NextResponse.json({ success: false, message: "Current PIN is incorrect" }, { status: 400 });
    }

    await query('UPDATE settings SET value = $1 WHERE key = $2', [newPin, 'pin']);
    return NextResponse.json({ success: true, message: "PIN updated successfully" });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
