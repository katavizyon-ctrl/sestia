import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { chatFreely, validChatMessages } from '@/lib/anthropic';
import { getIdentity } from '@/lib/identity';
import { logEvent, ownsRoom, getRoomName, toparla, chatAttachments } from '@/lib/db';
import chatContext from '@/lib/chatContext.cjs';
import chatCapabilities from '@/lib/chatCapabilities.cjs';

export const runtime = 'nodejs';

const RESULTS_DIR = path.join(process.cwd(), 'data', 'toparla-results');
const ATTACHMENTS_DIR = path.join(process.cwd(), 'data', 'chat-attachments');

// Kesif ekranindaki (ve artik Toparla sonucu altindaki) serbest sohbet icin
// — /api/analyze'in aksine fotograf SART DEGIL. Ayni kimlik dogrulama deseni
// ve ayni lib/anthropic.js istemcisi/modeli kullanilir — ikinci, kopuk bir
// sohbet mimarisi degil. Bağlam (context) artık her turda gönderilir ve her
// seferinde yeniden doğrulanır — istemcinin ilk turda söylediği bir şeye
// güvenilmez (bkz. audit §H).
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

    const resolution = chatContext.resolveContext(body?.context ?? null, identity.id, { ownsRoom, getRoomName, getToparlaResult: toparla.getResult });
    if (!resolution.ok) {
      return NextResponse.json({ error: resolution.error }, { status: resolution.error === 'invalid_context' ? 400 : 404 });
    }
    const resolvedContext = resolution.resolved;

    // toparla_result: the actual generated image is the visual subject of
    // this conversation — resolved fresh from the existing private result
    // store every turn (never a second copy, never trusted from the client).
    if (resolvedContext.kind === 'toparla_result') {
      const file = toparla.getResultFile(resolvedContext.toparlaResultId, identity.id);
      if (!file) return NextResponse.json({ error: 'result_not_found' }, { status: 404 });
      const bytes = await fs.readFile(path.join(RESULTS_DIR, file.filename)).catch(() => null);
      if (!bytes) return NextResponse.json({ error: 'result_not_found' }, { status: 404 });
      resolvedContext.contextImage = { base64: bytes.toString('base64'), mediaType: file.mimeType };
    }

    // Resolve every user-attached image reference to bytes, ownership-checked
    // — a message can only ever reference an attachment this identity owns.
    const resolvedMessages = [];
    for (const message of messages) {
      if (message.role !== 'user' || !message.image) { resolvedMessages.push(message); continue; }
      const attachment = chatAttachments.getOwned(message.image.id, identity.id);
      if (!attachment) return NextResponse.json({ error: 'attachment_not_found' }, { status: 404 });
      const bytes = await fs.readFile(path.join(ATTACHMENTS_DIR, attachment.filename)).catch(() => null);
      if (!bytes) return NextResponse.json({ error: 'attachment_not_found' }, { status: 404 });
      resolvedMessages.push({ ...message, resolvedImage: { base64: bytes.toString('base64'), mediaType: attachment.mimeType } });
    }

    // Toparla's relevance signal: purely "does this conversation have an
    // owned image to work with" — independent of account status. A guest
    // may still be told this is relevant; only the generation endpoint
    // itself (app/api/chat/toparla) enforces the account requirement.
    const attachedIds = new Set(
      resolvedMessages.filter((m) => m.role === 'user' && m.image?.source === 'chat_attachment').map((m) => m.image.id)
    );
    const capabilities = chatCapabilities.getCapabilities({ hasAttachableImage: attachedIds.size > 0 });
    const result = await chatFreely(resolvedMessages, resolvedContext, capabilities);
    // The model is never the source of truth for what it may suggest. Two
    // independent checks, both required: (1) the action/shape is currently
    // relevant at all (chatCapabilities), and (2) for view_tidied_room
    // specifically, the exact attachment it names actually occurred in this
    // validated conversation and was successfully resolved (owned) above —
    // never substituted for "the latest image" or invented outright.
    let suggestedAction = null;
    if (result.suggestedAction && chatCapabilities.isSuggestedActionValid(result.suggestedAction, capabilities)) {
      if (result.suggestedAction === 'attach_photo') {
        suggestedAction = 'attach_photo';
      } else if (attachedIds.has(result.suggestedAction.attachmentId)) {
        suggestedAction = result.suggestedAction;
      }
      // else: names a real-shaped action but an attachment id that never
      // occurred in this conversation — stripped, never silently substituted.
    }

    // The client resends this array on the next turn: original messages
    // (with their reference-only image fields, never resolved bytes) plus
    // the new plain-text assistant reply — the JSON envelope never leaves
    // this function, and no image bytes are ever echoed back to the browser.
    const nextMessages = [...messages, { role: 'assistant', content: result.reply }];

    // Sahibi panelinde test kullanıcısının sohbeti ne kadar kullandığını göstermek için; mesaj içeriği yazılmaz.
    try { logEvent(identity.id, 'chat_message', { turn: messages.length }); } catch {}
    return NextResponse.json({ reply: result.reply, suggestedAction, messages: nextMessages });
  } catch (err) {
    console.error('sestia_chat_failed', err);
    return NextResponse.json({ error: 'chat_failed' }, { status: 500 });
  }
}
