'use client';

import { useEffect, useRef, useState } from 'react';
import { BackIcon, BoxIcon, CameraIcon, GridIcon, SendIcon, StarIcon, ChevronRightIcon } from './icons';

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

// Remains mounted across main navigation; no fictional replies or client-side API keys.
export function SestiaChat({ active, context, onBack }) {
  const [messages,setMessages]=useState([]), [draft,setDraft]=useState(''), [busy,setBusy]=useState(false), [error,setError]=useState(null);
  const request=useRef(null), log=useRef(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{if(active&&log.current)log.current.scrollTop=log.current.scrollHeight;},[active,messages]);
  async function send(event){
    event.preventDefault();const content=draft.trim();if(!content||busy||messages.length>=41)return;
    const controller=new AbortController();request.current=controller;const previous=messages;
    const next=[...messages,{role:'user',content}];setMessages(next);setDraft('');setBusy(true);setError(null);
    try{const response=await fetch('/api/sestia-chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({messages:next,sectionContext:messages.length===0?context:null})});if(!response.ok)throw new Error('chat_failed');const result=await response.json();if(!Array.isArray(result.messages))throw new Error('invalid_response');setMessages(result.messages);}
    catch(err){if(err.name!=='AbortError'){setMessages(previous);setDraft(content);setError('Yanıt alınamadı. Mesajın burada; tekrar gönderebilirsin.');}}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  return <section className="view sestia-chat-view" hidden={!active}><div className="scroll"><Header onBack={onBack}/><PageHeading title="Sestia">Birlikte bakalım.</PageHeading>
    {!messages.length&&<div className="card"><h2>Aklında ne var?</h2><p className="muted">{context==='kose'?'Bir köşeyi farklı kullanmak mı istiyorsun?':context==='oda'?'Yaşam alanında neleri değiştirmek istersin?':context==='esya'?'Üzerine konuşmak istediğin eşyayı anlatabilirsin.':'Bir soruyla, bir fikirle ya da merakla başlayabiliriz.'}</p></div>}
    <div ref={log} className="chat-history sestia-conversation" role="log" aria-live="polite" aria-relevant="additions">{messages.map((message,i)=><p key={i} className={`chat-message chat-${message.role}`}><span className="chat-speaker">{message.role==='assistant'?'Sestia':'Sen'}</span>{message.content}</p>)}</div>
    {busy&&<p role="status" className="muted">Sestia yanıtlıyor…</p>}{error&&<div role="alert" className="errbox">{error}</div>}
    {messages.length>=41&&<p className="muted">Bu sohbetin sınırına ulaştık. Yeni bir sohbet başlatabilirsin.</p>}
    <form className="chat-form sestia-composer" onSubmit={send}><label className="sr-only" htmlFor="sestia-message">Sestia’ya mesajın</label><textarea id="sestia-message" value={draft} onChange={e=>setDraft(e.target.value)} rows={2} maxLength={2000} placeholder="Aklındakini yaz…" disabled={busy||messages.length>=41}/><button className="btn-primary" disabled={busy||!draft.trim()||messages.length>=41}><SendIcon/> Gönder</button></form>
    {messages.length>0&&<button className="sestia-text-link" disabled={busy} onClick={()=>{if(window.confirm('Bu sohbeti kapatıp yenisini başlatmak ister misin?')){setMessages([]);setDraft('');setError(null);}}}>Yeni sohbet</button>}
  </div></section>;
}
