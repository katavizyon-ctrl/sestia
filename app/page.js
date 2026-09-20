'use client';

import { useEffect, useRef, useState } from 'react';
import { getDeviceId, compressImage, getLastRoom, setLastRoom } from '@/lib/client';
import { ROOM_OPTIONS, DEFAULT_ROOM } from '@/lib/constants';
import {
  FlameIcon,
  CameraIcon,
  GalleryIcon,
  GridIcon,
  BackIcon,
  CheckIcon,
  StarIcon,
  CloseIcon,
  REC_META,
  REC_DONE_LABEL,
} from '@/components/icons';

const ACTION_ORDER = ['tut', 'sat', 'bagisla', 'geri_donustur', 'at'];

export default function Page() {
  const [view, setView] = useState('home');
  const deviceIdRef = useRef(null);

  const [homeState, setHomeState] = useState({ streak: 0, points: 0, totalDecisions: 0 });
  const [homeError, setHomeError] = useState(null);

  // ---- tekli akış ----
  const [photoUrl, setPhotoUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [selectedRec, setSelectedRec] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState(null);
  const singleFileRef = useRef(null);
  const singleRequestRef = useRef(null);
  const singleSessionRef = useRef(0);

  // ---- oda taraması akışı ----
  const [roomPhotoUrl, setRoomPhotoUrl] = useState(null);
  const [roomAnalyzing, setRoomAnalyzing] = useState(false);
  const [roomError, setRoomError] = useState(null);
  const [roomItems, setRoomItems] = useState([]);
  const [roomConfirming, setRoomConfirming] = useState(false);
  const [roomMessages, setRoomMessages] = useState([]);
  const [roomChatDraft, setRoomChatDraft] = useState('');
  const [roomChatBusy, setRoomChatBusy] = useState(false);
  const [roomChatError, setRoomChatError] = useState(null);
  const roomFileRef = useRef(null);
  const roomRequestRef = useRef(null);
  const roomSessionRef = useRef(0);

  const [celebration, setCelebration] = useState({ streak: 0, pointsGained: 0, summary: '' });

  useEffect(() => {
    const id = getDeviceId();
    deviceIdRef.current = id;
    refreshHomeState(id);
  }, []);

  async function refreshHomeState(deviceId) {
    try {
      const res = await fetch(`/api/state?deviceId=${encodeURIComponent(deviceId)}`);
      if (!res.ok) throw new Error('state_failed');
      const data = await res.json();
      setHomeState(data);
      setHomeError(null);
    } catch {
      setHomeError('Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.');
    }
  }

  function goTo(name) {
    if (view === 'room-review' && name !== 'room-review') resetRoomScan();
    if (name === 'scan') resetSingleScan();
    if (name === 'room-scan') resetRoomScan();
    setView(name);
  }

  // ---------------- tekli akış ----------------

  function resetSingleScan() {
    singleSessionRef.current += 1;
    singleRequestRef.current?.abort();
    singleRequestRef.current = null;
    singleFileRef.current = null;
    setMessages([]);
    setChatDraft('');
    setChatBusy(false);
    setChatError(null);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    setAnalyzing(false);
    setAnalysis(null);
    setAnalyzeError(null);
    setSelectedRec(null);
    setSelectedRoom(getLastRoom());
  }

  function chooseRoom(room) {
    const next = selectedRoom === room ? null : room;
    setSelectedRoom(next);
    setLastRoom(next);
  }

  async function handleSingleFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;

    resetSingleScan();
    const session = singleSessionRef.current;
    let compressed;
    try {
      compressed = await compressImage(file);
    } catch {
      compressed = file;
    }

    if (session !== singleSessionRef.current) return;
    singleFileRef.current = compressed;
    const controller = new AbortController();
    singleRequestRef.current = controller;
    setPhotoUrl(URL.createObjectURL(compressed));
    setAnalysis(null);
    setAnalyzeError(null);
    setSelectedRec(null);
    setView('decision');
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('image', compressed);
      formData.append('mode', 'tekli');
      const res = await fetch('/api/analyze', { method: 'POST', body: formData, signal: controller.signal });
      if (!res.ok) throw new Error('analyze_failed');
      const result = await res.json();
      if (session !== singleSessionRef.current) return;
      setAnalysis(result);
      setSelectedRec(result.recommendation);
      setMessages(result.messages);
    } catch {
      if (session !== singleSessionRef.current || controller.signal.aborted) return;
      setAnalyzeError('Analiz sırasında bir sorun oluştu. Aşağıdan öneriyi elle seçip devam edebilirsin.');
    } finally {
      if (session === singleSessionRef.current) {
        singleRequestRef.current = null;
        setAnalyzing(false);
      }
    }
  }

  async function sendChat(e) {
    e.preventDefault();
    const content = chatDraft.trim();
    if (!content || !analysis || confirming || singleRequestRef.current || messages.length >= 42) return;
    const session = singleSessionRef.current;
    const controller = new AbortController();
    singleRequestRef.current = controller;
    setChatBusy(true);
    setChatError(null);
    const nextMessages = [...messages, { role: 'user', content }];
    try {
      const formData = new FormData();
      formData.append('image', singleFileRef.current);
      formData.append('mode', 'tekli');
      formData.append('messages', JSON.stringify(nextMessages));
      const res = await fetch('/api/analyze', { method: 'POST', body: formData, signal: controller.signal });
      if (!res.ok) throw new Error('chat_failed');
      const result = await res.json();
      if (session !== singleSessionRef.current) return;
      setAnalysis(result);
      setSelectedRec(result.recommendation);
      setMessages(result.messages);
      setChatDraft('');
    } catch {
      if (session !== singleSessionRef.current || controller.signal.aborted) return;
      setChatError('Yanıt alınamadı. Mesajını tekrar gönderebilir veya mevcut kararınla devam edebilirsin.');
    } finally {
      if (session === singleSessionRef.current) {
        singleRequestRef.current = null;
        setChatBusy(false);
      }
    }
  }

  async function confirmSingleDecision() {
    if (!selectedRec || confirming || singleRequestRef.current) return;
    setConfirming(true);
    const category = analysis?.category || 'Genel Eşya';
    const reasoning = analysis?.reasoning || '';
    const room = selectedRoom || DEFAULT_ROOM;
    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceIdRef.current,
          items: [{ category, recommendation: selectedRec, reasoning, room }],
          source: 'tekli',
        }),
      });
      if (!res.ok) throw new Error('decide_failed');
      const state = await res.json();
      setHomeState(state);
      setCelebration({
        streak: state.streak,
        pointsGained: 5,
        summary: `${category} ${REC_DONE_LABEL[selectedRec] || ''}`,
      });
      setView('celebration');
    } catch {
      setAnalyzeError('Karar kaydedilemedi. Tekrar dener misin?');
    } finally {
      setConfirming(false);
    }
  }

  // ---------------- oda taraması akışı ----------------

  function resetRoomScan() {
    roomSessionRef.current += 1;
    roomRequestRef.current?.abort();
    roomRequestRef.current = null;
    roomFileRef.current = null;
    setRoomMessages([]);
    setRoomChatDraft('');
    setRoomChatBusy(false);
    setRoomChatError(null);
    if (roomPhotoUrl) URL.revokeObjectURL(roomPhotoUrl);
    setRoomPhotoUrl(null);
    setRoomAnalyzing(false);
    setRoomError(null);
    setRoomItems([]);
  }

  async function handleRoomFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;

    resetRoomScan();
    const session = roomSessionRef.current;
    let compressed;
    try {
      compressed = await compressImage(file, 1600);
    } catch {
      compressed = file;
    }

    if (session !== roomSessionRef.current) return;
    roomFileRef.current = compressed;
    const controller = new AbortController();
    roomRequestRef.current = controller;
    setRoomPhotoUrl(URL.createObjectURL(compressed));
    setRoomItems([]);
    setRoomError(null);
    setView('room-review');
    setRoomAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('image', compressed);
      formData.append('mode', 'oda');
      const res = await fetch('/api/analyze', { method: 'POST', body: formData, signal: controller.signal });
      if (!res.ok) throw new Error('analyze_failed');
      const data = await res.json();
      if (session !== roomSessionRef.current) return;
      setRoomItems(data.items.map((item) => ({ ...item, excluded: false, manual: false })));
      setRoomMessages(data.messages);
    } catch {
      if (session !== roomSessionRef.current || controller.signal.aborted) return;
      setRoomError('Analiz sırasında bir sorun oluştu. Farklı bir fotoğrafla tekrar dener misin?');
    } finally {
      if (session === roomSessionRef.current) {
        roomRequestRef.current = null;
        setRoomAnalyzing(false);
      }
    }
  }

  async function sendRoomChat(e) {
    e.preventDefault();
    const content = roomChatDraft.trim();
    if (!content || !roomMessages.length || roomConfirming || roomRequestRef.current || roomMessages.length >= 42) return;
    const session = roomSessionRef.current;
    const controller = new AbortController();
    roomRequestRef.current = controller;
    setRoomChatBusy(true);
    setRoomChatError(null);
    try {
      const formData = new FormData();
      formData.append('image', roomFileRef.current);
      formData.append('mode', 'oda');
      formData.append('messages', JSON.stringify([...roomMessages, { role: 'user', content }]));
      formData.append('items', JSON.stringify(roomItems));
      const res = await fetch('/api/analyze', { method: 'POST', body: formData, signal: controller.signal });
      if (!res.ok) throw new Error('room_chat_failed');
      const result = await res.json();
      if (session !== roomSessionRef.current) return;
      setRoomItems(current => {
        const currentIds = new Set(current.map(item => item.id));
        const merged = current.map(item => {
          const updated = result.items.find(candidate => candidate.id === item.id);
          return item.manual || item.excluded || !updated ? item : { ...item, ...updated };
        });
        const added = result.items
          .filter(item => !currentIds.has(item.id))
          .map(item => ({ ...item, excluded: false, manual: false }));
        return [...merged, ...added];
      });
      setRoomMessages(result.messages);
      setRoomChatDraft('');
    } catch {
      if (session !== roomSessionRef.current || controller.signal.aborted) return;
      setRoomChatError('Yanıt alınamadı. Mesajını tekrar gönderebilir veya mevcut kararlarınla devam edebilirsin.');
    } finally {
      if (session === roomSessionRef.current) {
        roomRequestRef.current = null;
        setRoomChatBusy(false);
      }
    }
  }

  function toggleRoomExclude(index) {
    setRoomItems((items) => items.map((it, i) => (i === index ? { ...it, excluded: !it.excluded } : it)));
  }

  function setRoomItemRec(index, key) {
    setRoomItems((items) => items.map((it, i) => (i === index ? { ...it, recommendation: key, manual: true } : it)));
  }

  async function confirmRoomDecisions() {
    const included = roomItems.filter((it) => !it.excluded);
    if (included.length === 0 || roomConfirming || roomRequestRef.current) return;
    setRoomConfirming(true);
    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceIdRef.current,
          items: included.map((it) => ({
            category: it.category,
            recommendation: it.recommendation,
            reasoning: it.reasoning,
          })),
          source: 'oda',
        }),
      });
      if (!res.ok) throw new Error('decide_failed');
      const state = await res.json();
      setHomeState(state);
      setCelebration({
        streak: state.streak,
        pointsGained: included.length * 5,
        summary: `${included.length} eşya karara bağlandı: ${included.map((it) => it.category).join(', ')}`,
      });
      setView('celebration');
    } catch {
      setRoomError('Kararlar kaydedilemedi. Tekrar dener misin?');
    } finally {
      setRoomConfirming(false);
    }
  }

  return (
    <div className="app">
      {view === 'home' && (
        <HomeView
          homeState={homeState}
          homeError={homeError}
          onScanSingle={() => goTo('scan')}
          onScanRoom={() => goTo('room-scan')}
        />
      )}

      {view === 'scan' && (
        <ScanView title="Eşya Tara" onBack={() => goTo('home')} onFile={handleSingleFile} />
      )}

      {view === 'decision' && (
        <DecisionView
          photoUrl={photoUrl}
          analyzing={analyzing}
          analysis={analysis}
          analyzeError={analyzeError}
          selectedRec={selectedRec}
          onSelectRec={setSelectedRec}
          selectedRoom={selectedRoom}
          onSelectRoom={chooseRoom}
          onBack={() => goTo('scan')}
          onConfirm={confirmSingleDecision}
          confirming={confirming}
          messages={messages}
          chatDraft={chatDraft}
          onChatDraft={setChatDraft}
          chatBusy={chatBusy}
          chatError={chatError}
          onSendChat={sendChat}
        />
      )}

      {view === 'room-scan' && (
        <RoomScanView onBack={() => goTo('home')} onFile={handleRoomFile} />
      )}

      {view === 'room-review' && (
        <RoomReviewView
          photoUrl={roomPhotoUrl}
          analyzing={roomAnalyzing}
          error={roomError}
          items={roomItems}
          onToggleExclude={toggleRoomExclude}
          onSetRec={setRoomItemRec}
          onBack={() => goTo('home')}
          onConfirm={confirmRoomDecisions}
          confirming={roomConfirming}
          messages={roomMessages}
          chatDraft={roomChatDraft}
          onChatDraft={setRoomChatDraft}
          chatBusy={roomChatBusy}
          chatError={roomChatError}
          onSendChat={sendRoomChat}
        />
      )}

      {view === 'celebration' && (
        <CelebrationView
          celebration={celebration}
          onScanAgain={() => goTo('scan')}
          onHome={() => goTo('home')}
        />
      )}
    </div>
  );
}

function HomeView({ homeState, homeError, onScanSingle, onScanRoom }) {
  return (
    <section className="view">
      <div className="scroll">
        <div>
          <div className="muted" style={{ fontWeight: 500 }}>Günaydın</div>
          <h1 style={{ fontSize: 28, fontWeight: 600 }}>Sen</h1>
        </div>

        <div className="streakcard">
          <div className="flamewrap"><FlameIcon style={{ width: 24, height: 24 }} /></div>
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
              {homeState.streak} gün
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.88 }}>Serini bozma, bugün de devam et</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="label">Bugünün Görevi</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600 }}>Bir eşyaya karar ver</div>
          </div>
          <div className="modeoptions">
            <button className="modeoption" onClick={onScanSingle}>
              <div className="modeoption-iconwrap"><CameraIcon style={{ width: 16, height: 16 }} /></div>
              <div className="modeoption-title">Tek Eşya</div>
              <div className="modeoption-desc">Bir eşyaya hızlıca karar ver</div>
            </button>
            <button className="modeoption" onClick={onScanRoom}>
              <div className="modeoption-iconwrap"><GridIcon style={{ width: 16, height: 16 }} /></div>
              <div className="modeoption-title">Oda Taraması</div>
              <div className="modeoption-desc">Bir alanı tara, birden fazla eşya bul</div>
            </button>
          </div>
        </div>

        <div className="statrow">
          <div className="statchip">
            <div className="statnum">{homeState.points}</div>
            <div className="statlabel">Puan</div>
          </div>
          <div className="statchip">
            <div className="statnum">{homeState.totalDecisions}</div>
            <div className="statlabel">Karar Verildi</div>
          </div>
        </div>

        {homeError && <div className="errbox">{homeError}</div>}
      </div>
    </section>
  );
}

function CaptureButtons({ onFile, idPrefix }) {
  const cameraId = `${idPrefix}-camera`;
  const galleryId = `${idPrefix}-gallery`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <label className="btn-primary" htmlFor={cameraId} style={{ cursor: 'pointer' }}>
        <CameraIcon style={{ width: 18, height: 18 }} /> Fotoğraf Çek
      </label>
      <input type="file" id={cameraId} accept="image/*" capture="environment" onChange={onFile} />

      <label className="btn-outline" htmlFor={galleryId} style={{ cursor: 'pointer' }}>
        <GalleryIcon style={{ width: 18, height: 18 }} /> Galeriden Seç
      </label>
      <input type="file" id={galleryId} accept="image/*" onChange={onFile} />
    </div>
  );
}

function ScanView({ title, onBack, onFile }) {
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack}><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>{title}</h2>
        </div>

        <div className="card center" style={{ flexGrow: 1, minHeight: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CameraIcon style={{ width: 40, height: 40, color: 'var(--text-muted)' }} strokeWidth="1.6" />
          <div className="muted" style={{ maxWidth: 220 }}>
            Bir eşyayı net bir açıdan fotoğrafla, yapay zeka senin için analiz etsin
          </div>
          <CaptureButtons onFile={onFile} idPrefix="photo-single" />
        </div>
      </div>
    </section>
  );
}

function RoomScanView({ onBack, onFile }) {
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack}><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Oda Taraması</h2>
        </div>

        <div className="card center" style={{ flexGrow: 1, minHeight: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <GridIcon style={{ width: 40, height: 40, color: 'var(--text-muted)' }} strokeWidth="1.6" />
          <div className="muted" style={{ maxWidth: 260 }}>
            Bütün bir odanın veya köşenin fotoğrafını çek, yapay zeka öne çıkan birden fazla eşyayı tek seferde
            değerlendirsin.
          </div>
          <CaptureButtons onFile={onFile} idPrefix="photo-room" />
        </div>

        <div className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
          AI'ın öne çıkan gördüğü eşyalar listelenir — sonra listeyi düzenleyebilirsin.
        </div>
      </div>
    </section>
  );
}

function DecisionView({
  photoUrl,
  analyzing,
  analysis,
  analyzeError,
  selectedRec,
  onSelectRec,
  selectedRoom,
  onSelectRoom,
  onBack,
  onConfirm,
  confirming,
  messages,
  chatDraft,
  onChatDraft,
  chatBusy,
  chatError,
  onSendChat,
}) {
  const meta = analysis ? REC_META[analysis.recommendation] : null;
  const chatHistoryRef = useRef(null);
  useEffect(() => {
    const history = chatHistoryRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [messages]);
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack} disabled={confirming} aria-label="Geri"><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Analiz Sonucu</h2>
        </div>

        <div className="photowrap">
          {photoUrl && <img src={photoUrl} alt="Taranan eşya" />}
          {analysis && <div className="catbadge">{analysis.category}</div>}
        </div>

        {analyzing && (
          <div className="thinking">
            <div className="spinner" />
            <div>Yapay zeka fotoğrafı inceliyor...</div>
          </div>
        )}

        {analyzeError && <div className="errbox">{analyzeError}</div>}

        {analysis && meta && (
          <div className="rec-banner" style={{ background: `var(--${meta.varName}-tint)` }}>
            <div className="rec-head">
              <div className="rec-iconwrap" style={{ background: `var(--${meta.varName})` }}>
                <meta.Icon style={{ width: 18, height: 18 }} />
              </div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600 }}>{meta.title}</div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{analysis.reasoning}</div>
          </div>
        )}

        {analysis && (
          <section className="decision-chat" aria-label="Eşya hakkında sohbet">
            <div ref={chatHistoryRef} className="chat-history" role="log" aria-live="polite" aria-relevant="additions">
              {messages.slice(1).map((message, index) => {
                const reply = message.role === 'assistant' ? JSON.parse(message.content) : null;
                const text = reply ? (index === 0 ? reply.question : [reply.reasoning, reply.question].filter(Boolean).join(' ')) : message.content;
                return text ? <p key={index} className={`chat-message chat-${message.role}`}><span className="chat-speaker">{reply ? 'Asistan' : 'Sen'}</span>{text}</p> : null;
              })}
            </div>
            <form onSubmit={onSendChat} className="chat-form">
              <label htmlFor="item-chat">Eklemek istediğin bir şey var mı?</label>
              <textarea id="item-chat" rows={2} maxLength={2000} value={chatDraft}
                onChange={(e) => onChatDraft(e.target.value)} placeholder="İstersen yaz..."
                disabled={chatBusy || confirming || messages.length >= 42} />
              <button className="btn-outline" type="submit" disabled={!chatDraft.trim() || chatBusy || confirming || messages.length >= 42}>
                {chatBusy ? 'Değerlendiriliyor...' : 'Gönder'}
              </button>
            </form>
            {chatBusy && <div role="status" className="muted">Önerin güncelleniyor...</div>}
            {chatError && <div role="alert" className="errbox">{chatError}</div>}
            {messages.length >= 42 && <div className="muted">Bu eşya için sohbet sınırına ulaştın. Kararını seçip devam edebilirsin.</div>}
          </section>
        )}

        {!analyzing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="label" style={{ color: 'var(--text-muted)' }}>Oda (opsiyonel)</div>
            <div className="roomchips">
              {ROOM_OPTIONS.map((room) => (
                <button
                  key={room}
                  className={`roomchip${selectedRoom === room ? ' selected' : ''}`}
                  onClick={() => onSelectRoom(room)}
                >
                  {room}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="actiongrid">
          {ACTION_ORDER.map((key) => {
            const m = REC_META[key];
            return (
              <button
                key={key}
                className={`actionbtn${selectedRec === key ? ' selected' : ''}`}
                data-key={key}
                disabled={analyzing || chatBusy || confirming}
                onClick={() => onSelectRec(key)}
              >
                <m.Icon style={{ width: 18, height: 18 }} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="decision-footer">
        <button className="btn-primary" disabled={!selectedRec || confirming || analyzing || chatBusy} onClick={onConfirm}>
          {confirming ? 'Kaydediliyor...' : 'Onayla ve Devam Et'}
        </button>
      </div>
    </section>
  );
}

function RoomReviewView({ photoUrl, analyzing, error, items, onToggleExclude, onSetRec, onBack, onConfirm, confirming,
  messages, chatDraft, onChatDraft, chatBusy, chatError, onSendChat }) {
  const includedCount = items.filter((it) => !it.excluded).length;
  const chatHistoryRef = useRef(null);
  useEffect(() => {
    const history = chatHistoryRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [messages]);
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack} disabled={confirming} aria-label="Geri"><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Oda Analizi</h2>
        </div>

        <div className="photowrap" style={{ height: 140 }}>
          {photoUrl && <img src={photoUrl} alt="Taranan oda" />}
        </div>

        {analyzing && (
          <div className="thinking">
            <div className="spinner" />
            <div>Yapay zeka odayı inceliyor...</div>
          </div>
        )}

        {error && <div className="errbox">{error}</div>}

        {!analyzing && messages.length > 0 && (
          <section className="decision-chat" aria-label="Oda hakkında sohbet">
            <h3 style={{ fontSize: 17 }}>Oda hakkında konuşalım</h3>
            <div ref={chatHistoryRef} className="chat-history" role="log" aria-live="polite" aria-relevant="additions">
              {messages.slice(1).map((message, index) => {
                const reply = message.role === 'assistant' ? JSON.parse(message.content) : null;
                const text = reply ? [reply.reply, reply.question].filter(Boolean).join(' ') : message.content;
                return text ? <p key={index} className={`chat-message chat-${message.role}`}><span className="chat-speaker">{reply ? 'Asistan' : 'Sen'}</span>{text}</p> : null;
              })}
            </div>
            <form onSubmit={onSendChat} className="chat-form">
              <label htmlFor="room-chat">Oda veya eşyalar hakkında eklemek istediğin bir şey var mı?</label>
              <textarea id="room-chat" rows={2} maxLength={2000} value={chatDraft}
                onChange={e => onChatDraft(e.target.value)} placeholder="İstersen yaz..."
                disabled={chatBusy || confirming || messages.length >= 42} />
              <button className="btn-outline" type="submit" disabled={!chatDraft.trim() || chatBusy || confirming || messages.length >= 42}>
                {chatBusy ? 'Değerlendiriliyor...' : 'Gönder'}
              </button>
            </form>
            {chatBusy && <div role="status" className="muted">Odadaki öneriler güncelleniyor...</div>}
            {chatError && <div role="alert" className="errbox">{chatError}</div>}
            {messages.length >= 42 && <div className="muted">Bu oda için sohbet sınırına ulaştın. Kararlarını seçip devam edebilirsin.</div>}
          </section>
        )}

        {!analyzing && items.length > 0 && (
          <div className="muted" style={{ fontSize: 12 }}>
            {items.length} eşya bulundu. İstemediğini kapatabilir, önerisini değiştirebilirsin.
          </div>
        )}

        {items.map((item, index) => (
          <div key={item.id} className={`roomcard${item.excluded ? ' excluded' : ''}`}>
            <div className="roomcard-head">
              <div>
                <div className="roomcard-title">{item.label}</div>
                <div className="muted">{item.category}</div>
              </div>
              <button className="iconbtn" disabled={chatBusy || confirming} aria-label={item.excluded ? `${item.label} dahil et` : `${item.label} hariç tut`} style={{ width: 28, height: 28 }} onClick={() => onToggleExclude(index)}>
                <CloseIcon style={{ width: 14, height: 14 }} />
              </button>
            </div>
            {!item.excluded && (
              <>
                <div className="muted" style={{ fontSize: 12 }}>{item.reasoning}</div>
                {item.manual && <div className="muted">Senin seçimin: {REC_META[item.recommendation].label}</div>}
                <div className="roomcard-actions">
                  {ACTION_ORDER.map((key) => {
                    const m = REC_META[key];
                    return (
                      <button
                        key={key}
                        className={`roomcard-actionbtn${item.recommendation === key ? ' selected' : ''}`}
                        data-key={key}
                        onClick={() => onSetRec(index, key)}
                        disabled={chatBusy || confirming}
                        title={m.label}
                      >
                        <m.Icon />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {!analyzing && items.length > 0 && (
        <div className="decision-footer">
          <button className="btn-primary" disabled={includedCount === 0 || confirming || chatBusy} onClick={onConfirm}>
            {confirming ? 'Kaydediliyor...' : `Tümünü Onayla (${includedCount} eşya)`}
          </button>
        </div>
      )}
    </section>
  );
}

function CelebrationView({ celebration, onScanAgain, onHome }) {
  return (
    <section className="view">
      <div className="scroll center" style={{ paddingTop: 60 }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            background: 'var(--eucalyptus)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckIcon style={{ width: 44, height: 44, color: '#fff' }} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 22 }}>Harika iş!</h1>
        <div className="muted" style={{ marginTop: 6 }}>Bugünün görevini tamamladın</div>

        <div className="statrow" style={{ marginTop: 22 }}>
          <div className="statchip">
            <FlameIcon style={{ width: 20, height: 20, color: 'var(--eucalyptus)' }} />
            <div className="statnum">{celebration.streak} gün</div>
            <div className="statlabel">Seri</div>
          </div>
          <div className="statchip">
            <StarIcon style={{ width: 20, height: 20, color: 'var(--terracotta)' }} />
            <div className="statnum">+{celebration.pointsGained}</div>
            <div className="statlabel">Puan</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 18, textAlign: 'left', width: '100%' }}>
          <div className="label" style={{ color: 'var(--text-muted)' }}>Bu Karar</div>
          <div style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>{celebration.summary}</div>
        </div>
      </div>

      <div style={{ padding: '14px 22px 30px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn-primary" onClick={onScanAgain}>Bir Eşya Daha Tara</button>
        <button className="btn-secondary" onClick={onHome}>Yarın Görüşürüz</button>
      </div>
    </section>
  );
}
