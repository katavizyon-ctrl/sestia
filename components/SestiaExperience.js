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
  if (productContext?.kind === 'room') return 'Bu oda hakkında ne konuşmak istersin?';
  if (entryLabel === 'kose') return 'Bir köşeyi farklı kullanmak mı istiyorsun?';
  if (entryLabel === 'oda') return 'Yaşam alanında neleri değiştirmek istersin?';
  if (entryLabel === 'esya') return 'Üzerine konuşmak istediğin eşyayı anlatabilirsin.';
  return 'Bir soruyla, bir fikirle ya da merakla başlayabiliriz.';
}

// The reusable conversation core — no outer screen chrome, so it can be used
// both full-screen (SestiaChat, below) and embedded directly under a
// feature's own result UI (Toparla). Each mounted instance owns its own
// state; there is no shared/global conversation state to race across
// surfaces — a stale response from one instance structurally cannot land in
// another one's messages.
export function ConversationPanel({ productContext, entryLabel, active = true, emptyStateHeading = 'Aklında ne var?', emptyStateCopy, className = '' }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedPreviewUrl, setAttachedPreviewUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [suggestedAction, setSuggestedAction] = useState(null);
  const request = useRef(null);
  const log = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => () => {
    request.current?.abort();
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

  const canRenderSuggestedAction = chatComposerClient.isRenderableAction(suggestedAction);

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
    {canRenderSuggestedAction && (
      <button type="button" className="sestia-text-link" onClick={() => fileInputRef.current?.click()}>Fotoğraf ekle</button>
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
    {messages.length > 0 && <button className="sestia-text-link" disabled={busy} onClick={() => { if (window.confirm('Bu sohbeti kapatıp yenisini başlatmak ister misin?')) { setMessages([]); setDraft(''); setError(null); setSuggestedAction(null); removeAttachment(); } }}>Yeni sohbet</button>}
  </div>;
}

// Remains mounted across main navigation; no fictional replies or client-side API keys.
export function SestiaChat({ active, context, onBack }) {
  return <section className="view sestia-chat-view" hidden={!active}><div className="scroll"><Header onBack={onBack} /><PageHeading title="Sestia">Birlikte bakalım.</PageHeading>
    <ConversationPanel active={active} productContext={{ kind: 'general' }} entryLabel={context} />
  </div></section>;
}
