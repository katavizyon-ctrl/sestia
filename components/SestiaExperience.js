'use client';

import { useEffect, useRef, useState } from 'react';
import { BackIcon, BoxIcon, CameraIcon, CloseIcon, GalleryIcon, GridIcon, SendIcon, StarIcon, ChevronRightIcon } from './icons';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';
import chatComposerClient from '@/lib/chatComposerClient.cjs';

export function Brand({ hero = false }) {
  return <img className={`sestia-brand${hero ? ' sestia-brand-hero' : ''}`} src="/sestia/logo.webp" alt="SESTIA — Yaşam alanında, hep yanında." width={hero ? 270 : 160} height={hero ? 270 : 160} />;
}

export function PageHeading({ title, children, center = false }) {
  return <div className={`sestia-heading${center ? ' centered' : ''}`}><h1>{title}</h1>{children && <p>{children}</p>}</div>;
}

export function Header({ onBack, onAccount }) {
  return <div className="sestia-header">{onBack ? <button className="iconbtn" aria-label="Geri" onClick={onBack}><BackIcon /></button> : <span className="sestia-wordmark">SESTIA</span>}{onAccount && <button className="iconbtn" aria-label="Hesabım" onClick={onAccount}><span aria-hidden="true">○</span></button>}</div>;
}

export function MainNavigation({ view, onNavigate }) {
  return <nav className="sestia-nav" aria-label="Ana gezinme">{[
    ['home', 'Ana sayfa', GridIcon], ['discover', 'Keşif', StarIcon], ['rooms', 'Odalarım', BoxIcon], ['chat', 'Sestia', SendIcon],
  ].map(([id, label, Icon]) => <button key={id} aria-current={view === id ? 'page' : undefined} onClick={() => onNavigate(id)}><Icon /><span>{label}</span></button>)}</nav>;
}

function EditorialPhoto() {
  return <div className="sestia-editorial-photo"><img src="/sestia/ilham.png" alt="Gün ışığı alan bir oturma köşesi; ilham görseli" /></div>;
}

export function RoomCover({ room }) {
  return room.coverPhotoId ? <img className="sestia-room-cover" src={`/api/rooms/${room.id}/photos/${room.coverPhotoId}`} alt={room.name} /> : <div className="sestia-room-placeholder"><GridIcon /><span>Fotoğraf ekleyerek başla</span></div>;
}

export function HomeDashboard({ userName, rooms, roomsLoading, roomsError, homeState, homeMessage, onOpenRoom, onNavigate, onChat, onAccount, error }) {
  return <section className="view"><div className="scroll sestia-home">
    <Header onAccount={onAccount} />
    <PageHeading title={userName ? `Merhaba, ${userName}.` : 'Merhaba.'}>Bugün yaşam alanında neye bakalım?</PageHeading>
    <button className="sestia-chat-entry" onClick={() => onChat(null)}><span>Aklındakini paylaş…</span><SendIcon /></button>
    {error && <div role="alert" className="errbox">{error}</div>}
    <section><div className="sestia-section-title"><h2>Odalarım</h2><button onClick={() => onNavigate('rooms')}>Tümünü gör →</button></div>
      {roomsLoading ? <p role="status" className="muted">Odaların yükleniyor…</p> : roomsError ? <div className="errbox">{roomsError}<button className="btn-outline" onClick={() => onNavigate('rooms')}>Tekrar dene</button></div> : rooms.length ? <div className="sestia-room-grid">{rooms.slice(0,2).map(room => <button key={room.id} className="sestia-photo-card" onClick={() => onOpenRoom(room.id)}><RoomCover room={room} /><div><h3>{room.name}</h3><p>{room.decisionCount} karar</p></div></button>)}</div> : <button className="sestia-empty" onClick={() => onNavigate('rooms')}><GridIcon /><h3>İlk odana yer aç.</h3><p>Fotoğraflarını ve birlikte baktıklarımızı bir araya getirelim.</p><span>Oda ekle →</span></button>}
    </section>
    <section><div className="sestia-section-title"><h2>Biraz ilham</h2><button onClick={() => onNavigate('discover')}>Keşfet →</button></div><button className="sestia-photo-card" onClick={() => onChat('kose')}><EditorialPhoto /><div><span className="sestia-eyebrow">Birlikte düşünelim</span><h3>Bir köşenin başka bir hayatı</h3><p>Işığa ve elindekilere yeniden bak.</p></div></button></section>
    <button className="btn-primary" onClick={() => onNavigate('choose')}><CameraIcon /> Fotoğrafla birlikte bakalım</button>
    {homeState.totalDecisions >= 5 && <button className="btn-outline" onClick={() => onNavigate('inspiration')}>Bu haftanın kişisel fikirleri <ChevronRightIcon /></button>}
    {homeMessage?.soru?.metin && <div className="sestia-quiet-note">{homeMessage.soru.metin}</div>}
    {homeState.totalDecisions > 0 && <p className="sestia-stats">{homeState.totalDecisions} karar · {homeState.points} puan · {homeState.streak} günlük seri</p>}
  </div></section>;
}

export function DiscoverView({ library, onChat, onNavigate, onAccount }) {
  return <section className="view"><div className="scroll"><Header onAccount={onAccount} /><span className="sestia-eyebrow">Bir oda. Bir eşya. Sonsuz fikir.</span><PageHeading title="Birlikte bakalım.">Bir fikirle, bir soruyla ya da sadece merakla başlayabiliriz.</PageHeading>
    <div className="card"><h2>Aklına takılan bir şey var mı?</h2><p className="muted">{library?.greeting?.metin || 'Bir soruyla, bir fikirle ya da yalnızca merakla başlayabilirsin.'}</p><button className="sestia-chat-entry" onClick={() => onChat(null)}><span>Sestia’ya yaz…</span><SendIcon /></button></div>
    <button className="sestia-photo-card" onClick={() => onChat('kose')}><EditorialPhoto /><div><h2>Bir köşenin başka bir hayatı</h2><p>Birlikte düşünelim →</p></div></button>
    <div className="sestia-possibilities">{[['oda','Bir odanın başka bir hayatı','Değişen ihtiyaçlarına elindekilerle yer aç.'],['esya','Elindekine yeniden bak','Bir eşyayı başka türlü kullanabilir miyiz?']].map(([context,title,copy])=><button className="card" key={context} onClick={()=>onChat(context)}><h3>{title}</h3><p className="muted">{copy}</p><span className="sestia-text-link">Birlikte konuşalım →</span></button>)}</div>
    {library?.spark?.metin && <div className="sestia-quiet-note">{library.spark.metin}</div>}
    <button className="btn-primary" onClick={() => onNavigate('choose')}><CameraIcon /> Bir fotoğrafla başlayalım</button>
  </div></section>;
}

export function ChooseView({ onBack, onSingle, onRoom }) {
  return <section className="view"><div className="scroll"><Header onBack={onBack}/><PageHeading title="Bir oda veya bir eşya seç.">Fotoğrafını çek ya da galerinden yükle. Neler yapabileceğimize birlikte bakalım.</PageHeading>{[[BoxIcon,'Tek eşya','Bir eşyayı birlikte değerlendirelim.',onSingle],[GridIcon,'Oda taraması','Odanın genel hâline birlikte bakalım.',onRoom]].map(([Icon,title,copy,onClick])=><button className="card sestia-mode-card" key={title} onClick={onClick}><Icon/><div><h2>{title}</h2><p className="muted">{copy}</p></div><ChevronRightIcon/></button>)}<p className="muted">Üzerine konuşmak istediğin yerden başla.</p></div></section>;
}

function defaultEmptyStateCopy(productContext, entryLabel) {
  if (productContext?.kind === 'toparla_result') return 'Ne düşünüyorsun?';
  if (productContext?.kind === 'room_suggestion') return 'Bu önerilerden hangisini konuşalım?';
  if (productContext?.kind === 'room') return 'Bu oda hakkında ne konuşmak istersin?';
  if (entryLabel === 'kose') return 'Bir köşeyi farklı kullanmak mı istiyorsun?';
  if (entryLabel === 'oda') return 'Yaşam alanında neleri değiştirmek istersin?';
  if (entryLabel === 'esya') return 'Üzerine konuşmak istediğin eşyayı anlatabilirsin.';
  return 'Bir soruyla, bir fikirle ya da merakla başlayabiliriz.';
}

// Bağımlılıksız, dokunmatik-uyumlu Önce/Sonra kıyaslaması: native bir range
// input tam kaplayan, görünmez bir sürükleme yüzeyi olarak kullanılır —
// klavye ve dokunma erişilebilirliği bedava gelir. Room Detail'in Toparla
// ekranı VE ConversationPanel'in gömülü Toparla akışı bunun AYNI kopyasını
// kullanır — ikinci bir slider icat edilmez.
export function BeforeAfterSlider({ beforeSrc, afterSrc, width, height }) {
  const [value, setValue] = useState(50);
  const ratio = width && height ? `${width} / ${height}` : '3 / 4';
  return (
    <div className="sestia-baf" style={{ aspectRatio: ratio }}>
      <img className="sestia-baf-img" src={beforeSrc} alt="Önce" />
      <div className="sestia-baf-after-wrap" style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}>
        <img className="sestia-baf-img" src={afterSrc} alt="Sonra" />
      </div>
      <div className="sestia-baf-line" style={{ left: `${value}%` }} aria-hidden="true" />
      <input
        type="range" min="0" max="100" value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="sestia-baf-range" aria-label="Önce ve sonra karşılaştırma kaydırıcısı"
      />
      <span className="sestia-baf-label sestia-baf-label-before" aria-hidden="true">Önce</span>
      <span className="sestia-baf-label sestia-baf-label-after" aria-hidden="true">Sonra</span>
    </div>
  );
}

// The reusable conversation core — no outer screen chrome, so it can be used
// both full-screen (SestiaChat, below) and embedded directly under a
// feature's own result UI (Toparla). Each mounted instance owns its own
// state; there is no shared/global conversation state to race across
// surfaces — a stale response from one instance structurally cannot land in
// another one's messages.
//
// identityType/onRequireAccount: only needed for the embedded
// view_tidied_room flow — an account can confirm and generate inline; a
// guest is shown the same account gate as Room Detail's Toparla, via the
// SAME onRequireAccount callback wired at Page level (no second login UI).
// initialMessages: a previously saved conversation to continue (read once on
// mount — callers pass a key so a different conversation remounts the panel).
export function ConversationPanel({ productContext, entryLabel, active = true, emptyStateHeading = 'Aklında ne var?', emptyStateCopy, className = '', identityType, onRequireAccount, initialMessages }) {
  const [messages, setMessages] = useState(() => (Array.isArray(initialMessages) ? initialMessages : []));
  const [draft, setDraft] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedPreviewUrl, setAttachedPreviewUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [suggestedAction, setSuggestedAction] = useState(null);
  // Inline "Toparlanmış halini gör" widget, entirely separate from the
  // message array sent to the server — it's a UI-side result, not something
  // fed back into the model's context (see audit §14). null | { status:
  // 'account-gate'|'confirm'|'generating'|'done'|'error', attachmentId,
  // result?, error? }. attachmentId is frozen the moment the widget opens —
  // attaching a NEW image afterward updates suggestedAction on the next
  // turn, but never mutates an already-open toparlaFlow's target.
  const [toparlaFlow, setToparlaFlow] = useState(null);
  const request = useRef(null);
  const log = useRef(null);
  const fileInputRef = useRef(null);
  // Request-ownership token for the inline Toparla generation call — reset
  // ("Yeni sohbet") or unmount invalidates it, so a late response can never
  // land in a conversation the user has already moved on from.
  const toparlaRequestRef = useRef(null);
  // Same operation-key-per-(attachment) discipline as the Room Detail flow
  // (app/page.js submitToparla) — a double tap while a request is already
  // pending is a no-op, not a second paid call.
  const toparlaOperationRef = useRef(null);

  useEffect(() => () => {
    request.current?.abort();
    toparlaRequestRef.current = null;
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (active && log.current) log.current.scrollTop = log.current.scrollHeight; }, [active, messages]);

  function onFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!chatComposerClient.isSupportedAttachment(file, MAX_UPLOAD_BYTES)) {
      setError(!chatComposerClient.SUPPORTED_ATTACHMENT_TYPES.includes(file.type)
        ? 'Desteklenmeyen dosya türü. JPEG, PNG ya da WebP seçebilirsin.'
        : 'Bu fotoğraf çok büyük.');
      return;
    }
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl);
    setAttachedFile(file);
    setAttachedPreviewUrl(URL.createObjectURL(file));
    setError(null);
  }
  function removeAttachment() {
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl);
    setAttachedFile(null);
    setAttachedPreviewUrl(null);
  }

  async function send(event) {
    event.preventDefault();
    const text = draft.trim();
    const file = attachedFile;
    const previewUrl = attachedPreviewUrl;
    // Görsel-sadece mesaj geçerlidir: metin şart değil, ikisinden biri yeter.
    if (!chatComposerClient.canSend({ text, file, busy, messageCount: messages.length })) return;
    const controller = new AbortController();
    request.current = controller;
    const previousMessages = messages;
    setDraft('');
    setAttachedFile(null);
    setAttachedPreviewUrl(null);
    setSuggestedAction(null);
    setBusy(true);
    setError(null);
    try {
      let imageRef;
      if (file) {
        const fd = new FormData();
        fd.append('photo', file);
        const uploadRes = await fetch('/api/chat/attachments', { method: 'POST', body: fd, signal: controller.signal });
        if (!uploadRes.ok) throw new Error('attachment_upload_failed');
        const uploaded = await uploadRes.json();
        imageRef = { source: 'chat_attachment', id: uploaded.id };
      }
      const userMessage = chatComposerClient.buildUserMessage(text, imageRef);
      const nextMessages = [...previousMessages, userMessage];
      setMessages(nextMessages);
      // Bağlam HER turda gönderilir ve sunucuda yeniden doğrulanır — istemcinin
      // ilk turda söylediği bir şeye asla güvenilmez (bkz. audit §H).
      const response = await fetch('/api/sestia-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ messages: nextMessages, context: productContext || null }),
      });
      if (!response.ok) throw new Error('chat_failed');
      const result = await response.json();
      if (!Array.isArray(result.messages)) throw new Error('invalid_response');
      setMessages(result.messages);
      setSuggestedAction(result.suggestedAction || null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(previousMessages);
        setDraft(text);
        setAttachedFile(file);
        setAttachedPreviewUrl(previewUrl);
        setError('Yanıt alınamadı. Mesajın burada; tekrar gönderebilirsin.');
      } else if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  // Tapping "Toparlanmış halini gör" itself never calls anything paid — it
  // only opens the confirm card (account) or the account gate (guest). The
  // target attachment is frozen here, in this exact call, from the
  // server-validated suggestedAction — never re-derived from "whatever the
  // latest image is" later.
  function openToparlaFlow(attachmentId) {
    toparlaOperationRef.current = null;
    const token = {};
    toparlaRequestRef.current = token;
    setToparlaFlow({ status: identityType === 'account' ? 'confirm' : 'account-gate', attachmentId });
  }
  function dismissToparlaFlow() {
    toparlaRequestRef.current = null;
    setToparlaFlow(null);
  }

  // The ONLY function in this component that can trigger the paid call —
  // fired exclusively by the explicit "Toparlanmış halini oluştur" tap.
  async function confirmToparlaFlow() {
    if (!toparlaFlow || toparlaFlow.status !== 'confirm') return;
    const token = toparlaRequestRef.current;
    const attachmentId = toparlaFlow.attachmentId;
    if (!toparlaOperationRef.current || toparlaOperationRef.current.attachmentId !== attachmentId) {
      toparlaOperationRef.current = { operationKey: crypto.randomUUID(), attachmentId };
    }
    const operation = toparlaOperationRef.current;
    if (operation.pending) return; // double-tap guard
    operation.pending = true;
    setToparlaFlow({ status: 'generating', attachmentId });
    try {
      const res = await fetch('/api/chat/toparla', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId, operationKey: operation.operationKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (toparlaRequestRef.current !== token) return; // reset/left mid-flight
      if (!res.ok) {
        // Definitive 4xx rejection: never resubmit this operationKey, a new
        // explicit retry mints a fresh one.
        if (res.status >= 400 && res.status < 500) toparlaOperationRef.current = null;
        throw new Error(body.error || 'toparla_failed');
      }
      if (body.status === 'failed') {
        toparlaOperationRef.current = null;
        setToparlaFlow({ status: 'error', attachmentId, error: 'Görsel oluşturulamadı. Tekrar dener misin?' });
        return;
      }
      setToparlaFlow({ status: 'done', attachmentId, result: body });
    } catch {
      if (toparlaRequestRef.current === token) {
        setToparlaFlow({ status: 'error', attachmentId, error: 'Görsel oluşturulamadı. Tekrar dener misin?' });
      }
    } finally {
      operation.pending = false;
    }
  }
  // Explicit user action only — never automatic. A fresh operationKey means
  // a genuinely new attempt, not a resend of the one that just failed.
  function retryToparlaFlow() {
    toparlaOperationRef.current = null;
    setToparlaFlow((prev) => (prev ? { status: 'confirm', attachmentId: prev.attachmentId } : null));
  }

  const canRenderSuggestedAction = chatComposerClient.isRenderableAction(suggestedAction);
  const isViewTidiedAction = suggestedAction && typeof suggestedAction === 'object' && suggestedAction.type === 'view_tidied_room';

  return <div className={`sestia-conversation-panel ${className}`}>
    {!messages.length && <div className="card"><h2>{emptyStateHeading}</h2><p className="muted">{emptyStateCopy || defaultEmptyStateCopy(productContext, entryLabel)}</p></div>}
    <div ref={log} className="chat-history sestia-conversation" role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((message, i) => (
        <div key={i} className={`chat-message chat-${message.role}`}>
          <span className="chat-speaker">{message.role === 'assistant' ? 'Sestia' : 'Sen'}</span>
          {message.image && <img className="chat-image-thumb" src={`/api/chat/attachments/${message.image.id}`} alt="" />}
          {message.content && <p>{message.content}</p>}
        </div>
      ))}
    </div>
    {canRenderSuggestedAction && !isViewTidiedAction && (
      <button type="button" className="sestia-text-link" onClick={() => fileInputRef.current?.click()}>Fotoğraf ekle</button>
    )}
    {canRenderSuggestedAction && isViewTidiedAction && !toparlaFlow && (
      <button type="button" className="sestia-text-link" onClick={() => openToparlaFlow(suggestedAction.attachmentId)}>Toparlanmış halini gör</button>
    )}
    {toparlaFlow?.status === 'account-gate' && (
      <div className="card">
        <h2>Bunu senin için oluşturabilmem için giriş yapman gerekiyor.</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" className="btn-primary" onClick={onRequireAccount}>E-posta ile devam et</button>
          <button type="button" className="btn-outline" onClick={dismissToparlaFlow}>Şimdilik değil</button>
        </div>
      </div>
    )}
    {toparlaFlow?.status === 'confirm' && (
      <div className="card">
        <img className="sestia-room-hero" src={`/api/chat/attachments/${toparlaFlow.attachmentId}`} alt="" />
        <p className="muted">Bu bir yeniden dekorasyon değil — mobilya, mimari ve kamera açısı aynı kalır; yalnızca eşyalar toparlanmış hâliyle görselleştirilir.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" className="btn-primary" onClick={confirmToparlaFlow}>Toparlanmış halini oluştur</button>
          <button type="button" className="sestia-text-link" onClick={dismissToparlaFlow}>Vazgeç</button>
        </div>
      </div>
    )}
    {toparlaFlow?.status === 'generating' && (
      <div className="thinking">
        <div className="spinner" />
        <p className="muted">Odanı toparlanmış haliyle görüyoruz…</p>
      </div>
    )}
    {toparlaFlow?.status === 'error' && (
      <div className="card">
        <div className="errbox">{toparlaFlow.error}</div>
        <button type="button" className="btn-primary" onClick={retryToparlaFlow}>Tekrar dene</button>
      </div>
    )}
    {toparlaFlow?.status === 'done' && (
      <BeforeAfterSlider
        beforeSrc={`/api/chat/attachments/${toparlaFlow.attachmentId}`}
        afterSrc={`/api/chat/toparla/${toparlaFlow.result.id}`}
        width={toparlaFlow.result.outputWidth}
        height={toparlaFlow.result.outputHeight}
      />
    )}
    {busy && <p role="status" className="muted">Sestia yanıtlıyor…</p>}
    {error && <div role="alert" className="errbox">{error}</div>}
    {messages.length >= chatComposerClient.MAX_MESSAGES && <p className="muted">Bu sohbetin sınırına ulaştık. Yeni bir sohbet başlatabilirsin.</p>}
    {attachedPreviewUrl && (
      <div className="sestia-attachment-preview">
        <img src={attachedPreviewUrl} alt="Eklenecek fotoğraf" />
        <button type="button" className="iconbtn" aria-label="Fotoğrafı kaldır" onClick={removeAttachment} disabled={busy}><CloseIcon /></button>
      </div>
    )}
    <form className="chat-form sestia-composer" onSubmit={send}>
      <input ref={fileInputRef} type="file" accept={chatComposerClient.SUPPORTED_ATTACHMENT_TYPES.join(',')} hidden onChange={onFileSelected} disabled={busy || messages.length >= chatComposerClient.MAX_MESSAGES} />
      <div className="sestia-composer-row">
        <button type="button" className="iconbtn sestia-composer-attach" aria-label="Fotoğraf ekle" onClick={() => fileInputRef.current?.click()} disabled={busy || messages.length >= chatComposerClient.MAX_MESSAGES}><GalleryIcon /></button>
        <label className="sr-only" htmlFor="sestia-message">Sestia’ya mesajın</label>
        <textarea id="sestia-message" value={draft} onChange={e => setDraft(e.target.value)} rows={2} maxLength={2000} placeholder="Aklındakini yaz…" disabled={busy || messages.length >= chatComposerClient.MAX_MESSAGES} />
      </div>
      <button className="btn-primary" disabled={!chatComposerClient.canSend({ text: draft, file: attachedFile, busy, messageCount: messages.length })}><SendIcon /> Gönder</button>
    </form>
    {messages.length > 0 && <button className="sestia-text-link" disabled={busy} onClick={() => { if (window.confirm('Bu sohbeti kapatıp yenisini başlatmak ister misin?')) { setMessages([]); setDraft(''); setError(null); setSuggestedAction(null); removeAttachment(); toparlaRequestRef.current = null; setToparlaFlow(null); } }}>Yeni sohbet</button>}
  </div>;
}

// Remains mounted across main navigation; no fictional replies or client-side API keys.
export function SestiaChat({ active, context, onBack, identityType, onRequireAccount }) {
  return <section className="view sestia-chat-view" hidden={!active}><div className="scroll"><Header onBack={onBack} /><PageHeading title="Sestia">Birlikte bakalım.</PageHeading>
    <ConversationPanel active={active} productContext={{ kind: 'general' }} entryLabel={context} identityType={identityType} onRequireAccount={onRequireAccount} />
  </div></section>;
}
