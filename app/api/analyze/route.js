import { NextResponse } from 'next/server';
import { analyzeSingleItem, analyzeRoom, checkRoomCoverage, validSingleMessages, validRoomItems } from '@/lib/anthropic';
import { MAX_ROOM_PHOTOS } from '@/lib/constants';
import { getIdentity } from '@/lib/identity';

export const runtime = 'nodejs';

async function toImagePayload(file) {
  const arrayBuffer = await file.arrayBuffer();
  return { base64: Buffer.from(arrayBuffer).toString('base64'), mediaType: file.type || 'image/jpeg' };
}

export async function POST(req) {
  try {
    // Bu rota deviceId hic kullanmiyordu (stateless, kullanici verisi
    // yazmiyor) ama kimliksiz herkesin pahali AI cagrisi yapabilmesi ayri
    // bir risk — burada da gecerli bir kimlik (misafir ya da hesap) sart.
    const identity = await getIdentity();
    if (!identity) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const modeRaw = formData.get('mode');
    const mode = modeRaw === 'oda' ? 'oda' : modeRaw === 'oda-kapsam' ? 'oda-kapsam' : 'tekli';

    // Kapsam kontrolu, tam oda analizinden BAGIMSIZ ve stateless (sohbet
    // gecmisi/esya listesi almiyor) — mesaj dogrulamasina hic girmeden
    // erkenden ayriliyor.
    if (mode === 'oda-kapsam') {
      const files = formData.getAll('image').filter((f) => f && typeof f !== 'string');
      if (files.length === 0 || files.length > MAX_ROOM_PHOTOS) {
        return NextResponse.json({ error: 'image_required' }, { status: 400 });
      }
      const images = await Promise.all(files.map(toImagePayload));
      return NextResponse.json(await checkRoomCoverage(images));
    }

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
      const files = formData.getAll('image').filter((f) => f && typeof f !== 'string');
      if (files.length === 0 || files.length > MAX_ROOM_PHOTOS) {
        return NextResponse.json({ error: 'image_required' }, { status: 400 });
      }
      let items = [];
      try {
        items = JSON.parse(formData.get('items') || '[]');
      } catch {
        return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
      }
      if (messages.length && !validRoomItems(items)) {
        return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
      }
      const images = await Promise.all(files.map(toImagePayload));
      return NextResponse.json(await analyzeRoom(images, messages, items));
    }

    const file = formData.get('image');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'image_required' }, { status: 400 });
    }
    const { base64, mediaType } = await toImagePayload(file);
    const result = await analyzeSingleItem(base64, mediaType, messages);
    return NextResponse.json(result);
  } catch (err) {
    console.error('analyze_failed', err);
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 });
  }
}
