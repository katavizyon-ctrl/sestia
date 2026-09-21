import { NextResponse } from 'next/server';
import { recordError } from '@/lib/db';
import { getIdentity } from '@/lib/identity';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    // Hata raporlama, kendisi de patlamis olabilecek bir uygulamadan geliyor
    // olabilir — kimlik cozumu basarisiz olsa bile hatayi kaydetmeye devam
    // et (device_id null olarak), ama client'in soyledigi bir kimlige guvenme.
    const identity = await getIdentity().catch(() => null);
    const body = await req.json();
    const { message, stack, screen } = body || {};
    const clean = (message || 'bilinmeyen hata').toString().slice(0, 2000);
    recordError(
      identity ? identity.id : null,
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
