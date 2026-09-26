import { NextResponse } from 'next/server';
import { chatFreely, validChatMessages, SECTION_CONTEXT_LABELS } from '@/lib/anthropic';
import { getIdentity } from '@/lib/identity';
import { logEvent } from '@/lib/db';

export const runtime = 'nodejs';

// Kesif ekranindaki serbest sohbet icin — /api/analyze'in aksine fotograf
// SART DEGIL (mevcut analiz akislarinin ikisi de bir fotografi zorunlu
// kilan, sabit bir karar semasi dondugu icin genel soru sormaya uygun
// degil; bkz. gorev raporu). Ayni kimlik dogrulama deseni ve ayni
// lib/anthropic.js istemcisi/modeli kullanilir — ikinci, kopuk bir sohbet
// mimarisi degil.
export async function POST(req) {
  try {
    const identity = await getIdentity();
    if (!identity) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (!validChatMessages(messages)) {
      return NextResponse.json({ error: 'invalid_messages' }, { status: 400 });
    }
    // sectionContext istemciden serbest metin olarak degil, sabit bir
    // anahtar olarak gelir — sistem promptuna dogrudan enjekte edilmez.
    const sectionContext = Object.prototype.hasOwnProperty.call(SECTION_CONTEXT_LABELS, body?.sectionContext)
      ? body.sectionContext
      : null;

    const result = await chatFreely(messages, sectionContext);
    // Sahibi panelinde test kullanıcısının sohbeti ne kadar kullandığını göstermek için; mesaj içeriği yazılmaz.
    try { logEvent(identity.id, 'chat_message', { turn: messages.length }); } catch {}
    return NextResponse.json(result);
  } catch (err) {
    console.error('sestia_chat_failed', err);
    return NextResponse.json({ error: 'chat_failed' }, { status: 500 });
  }
}
