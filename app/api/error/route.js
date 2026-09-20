import { NextResponse } from 'next/server';
import { recordError } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const { deviceId, message, stack, screen } = body || {};
    const clean = (message || 'bilinmeyen hata').toString().slice(0, 2000);
    recordError(
      (deviceId || '').toString().slice(0, 100) || null,
      clean,
      (stack || '').toString().slice(0, 4000),
      (screen || '').toString().slice(0, 60)
    );
    return NextResponse.json({ ok: true });
  } catch {
    // Hata raporlama endpoint'inin kendisi asla ek bir hata fırlatmamalı.
    return NextResponse.json({ ok: false });
  }
}
