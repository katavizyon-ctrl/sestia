import { NextResponse } from 'next/server';
import { getState } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId');
  if (!deviceId) {
    return NextResponse.json({ error: 'device_id_required' }, { status: 400 });
  }
  return NextResponse.json(getState(deviceId));
}
