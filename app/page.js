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

  // ---- oda taraması akışı ----
  const [roomPhotoUrl, setRoomPhotoUrl] = useState(null);
  const [roomAnalyzing, setRoomAnalyzing] = useState(false);
  const [roomError, setRoomError] = useState(null);
  const [roomItems, setRoomItems] = useState([]);
  const [roomConfirming, setRoomConfirming] = useState(false);

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
    if (name === 'scan') resetSingleScan();
    if (name === 'room-scan') resetRoomScan();
    setView(name);
  }

  // ---------------- tekli akış ----------------

  function resetSingleScan() {
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

    let compressed;
    try {
      compressed = await compressImage(file);
    } catch {
      compressed = file;
    }

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
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('analyze_failed');
      const result = await res.json();
      setAnalysis(result);
      setSelectedRec(result.recommendation);
    } catch {
      setAnalyzeError('Analiz sırasında bir sorun oluştu. Aşağıdan öneriyi elle seçip devam edebilirsin.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function confirmSingleDecision() {
    if (!selectedRec || confirming) return;
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
    setRoomPhotoUrl(null);
    setRoomAnalyzing(false);
    setRoomError(null);
    setRoomItems([]);
  }

  async function handleRoomFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;

    let compressed;
    try {
      compressed = await compressImage(file, 1600);
    } catch {
      compressed = file;
    }

    setRoomPhotoUrl(URL.createObjectURL(compressed));
    setRoomItems([]);
    setRoomError(null);
    setView('room-review');
    setRoomAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('image', compressed);
      formData.append('mode', 'oda');
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('analyze_failed');
      const data = await res.json();
      setRoomItems((data.items || []).map((item) => ({ ...item, excluded: false })));
    } catch {
      setRoomError('Analiz sırasında bir sorun oluştu. Farklı bir fotoğrafla tekrar dener misin?');
    } finally {
      setRoomAnalyzing(false);
    }
  }

  function toggleRoomExclude(index) {
    setRoomItems((items) => items.map((it, i) => (i === index ? { ...it, excluded: !it.excluded } : it)));
  }

  function setRoomItemRec(index, key) {
    setRoomItems((items) => items.map((it, i) => (i === index ? { ...it, recommendation: key } : it)));
  }

  async function confirmRoomDecisions() {
    const included = roomItems.filter((it) => !it.excluded);
    if (included.length === 0 || roomConfirming) return;
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
}) {
  const meta = selectedRec ? REC_META[selectedRec] : null;
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack}><BackIcon /></button>
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
                onClick={() => onSelectRec(key)}
              >
                <m.Icon style={{ width: 18, height: 18 }} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '14px 22px 28px' }}>
        <button className="btn-primary" disabled={!selectedRec || confirming} onClick={onConfirm}>
          {confirming ? 'Kaydediliyor...' : 'Onayla ve Devam Et'}
        </button>
      </div>
    </section>
  );
}

function RoomReviewView({ photoUrl, analyzing, error, items, onToggleExclude, onSetRec, onBack, onConfirm, confirming }) {
  const includedCount = items.filter((it) => !it.excluded).length;
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack}><BackIcon /></button>
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

        {!analyzing && items.length > 0 && (
          <div className="muted" style={{ fontSize: 12 }}>
            {items.length} eşya bulundu. İstemediğini kapatabilir, önerisini değiştirebilirsin.
          </div>
        )}

        {items.map((item, index) => (
          <div key={index} className={`roomcard${item.excluded ? ' excluded' : ''}`}>
            <div className="roomcard-head">
              <div>
                <div className="roomcard-title">{item.label}</div>
                <div className="muted">{item.category}</div>
              </div>
              <button className="iconbtn" style={{ width: 28, height: 28 }} onClick={() => onToggleExclude(index)}>
                <CloseIcon style={{ width: 14, height: 14 }} />
              </button>
            </div>
            {!item.excluded && (
              <>
                <div className="muted" style={{ fontSize: 12 }}>{item.reasoning}</div>
                <div className="roomcard-actions">
                  {ACTION_ORDER.map((key) => {
                    const m = REC_META[key];
                    return (
                      <button
                        key={key}
                        className={`roomcard-actionbtn${item.recommendation === key ? ' selected' : ''}`}
                        data-key={key}
                        onClick={() => onSetRec(index, key)}
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
        <div style={{ padding: '14px 22px 28px' }}>
          <button className="btn-primary" disabled={includedCount === 0 || confirming} onClick={onConfirm}>
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
