import { NextResponse } from 'next/server';
import { analyzeSingleItem, analyzeRoom, validSingleMessages, validRoomItems } from '@/lib/anthropic';

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

    let messages = [];
    try {
      messages = JSON.parse(formData.get('messages') || '[]');
    } catch {
      return NextResponse.json({ error: 'invalid_messages' }, { status: 400 });
    }
    if (!validSingleMessages(messages, mode === 'oda' ? 12000 : 4000)) {
      return NextResponse.json({ error: 'invalid_messages' }, { status: 400 });
    }
    if (mode === 'oda') {
      let items = [];
      try {
        items = JSON.parse(formData.get('items') || '[]');
      } catch {
        return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
      }
      if (messages.length && !validRoomItems(items)) {
        return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
      }
      return NextResponse.json(await analyzeRoom(base64, mediaType, messages, items));
    }
    const result = await analyzeSingleItem(base64, mediaType, messages);
    return NextResponse.json(result);
  } catch (err) {
    console.error('analyze_failed', err);
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 });
  }
}
