import { NextResponse } from 'next/server';
import { analyzeSingleItem, analyzeRoom } from '@/lib/anthropic';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('image');
    const mode = formData.get('mode') === 'oda' ? 'oda' : 'tekli';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'image_required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = file.type || 'image/jpeg';

    if (mode === 'oda') {
      const items = await analyzeRoom(base64, mediaType);
      return NextResponse.json({ items });
    }

    const result = await analyzeSingleItem(base64, mediaType);
    return NextResponse.json(result);
  } catch (err) {
    console.error('analyze_failed', err);
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 });
  }
}
