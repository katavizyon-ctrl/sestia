'use client';

import { useEffect, useRef, useState } from 'react';
import { compressImage, getLastRoom, setLastRoom, getUserName, setUserName } from '@/lib/client';
import { ROOM_OPTIONS, DEFAULT_ROOM, MAX_ROOM_PHOTOS, MAX_UPLOAD_BYTES, ASSISTANT_NAME } from '@/lib/constants';
import { logEvent } from '@/lib/telemetry';
import FeedbackButton from '@/components/FeedbackButton';
import {
  FlameIcon,
  CameraIcon,
  GalleryIcon,
  GridIcon,
  BackIcon,
  CheckIcon,
  StarIcon,
  CloseIcon,
  SendIcon,
  ChevronRightIcon,
  BoxIcon,
  REC_META,
  REC_DONE_LABEL,
  TIP_META,
} from '@/components/icons';

const ACTION_ORDER = ['tut', 'sat', 'bagisla', 'geri_donustur', 'at'];
const SCAN_PERSIST_ERROR = 'Analiz odaya kaydedilemedi — bu oturumda görebilirsin ama sayfa yenilenirse kaybolabilir.';

// SQLite datetime('now') UTC dondurur (Z eki olmadan) — JS Date'in bunu
// yerel saat sanmamasi icin once acikca UTC olarak isaretliyoruz.
function formatAnalysisDate(sqliteUtc) {
  try {
    const d = new Date(sqliteUtc.replace(' ', 'T') + 'Z');
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch {
    return sqliteUtc;
  }
}

export default function Page() {
  const [view, setView] = useState('home');

  const [homeState, setHomeState] = useState({ streak: 0, points: 0, totalDecisions: 0 });
  const [homeMessage, setHomeMessage] = useState(null);
  const [homeError, setHomeError] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentIdentityId, setCurrentIdentityId] = useState(null);
  const [identityType, setIdentityType] = useState(null);

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
  const [roomPhotos, setRoomPhotos] = useState([]); // [{id, file, url, photoId?}] - photoId, sunucuya kalici kaydedilince atanir
  const [roomAnalyzing, setRoomAnalyzing] = useState(false);
  const [roomCoverageChecking, setRoomCoverageChecking] = useState(false);
  const [roomCoverageResult, setRoomCoverageResult] = useState(null); // {sufficient, requestedAngle, reply} | null
  const [roomError, setRoomError] = useState(null);
  const [roomItems, setRoomItems] = useState([]);
  const [roomConfirming, setRoomConfirming] = useState(false);
  const [roomMessages, setRoomMessages] = useState([]);
  const [roomChatDraft, setRoomChatDraft] = useState('');
  const [roomChatBusy, setRoomChatBusy] = useState(false);
  const [roomChatError, setRoomChatError] = useState(null);
  // Tamamlanmis analiz kalici olarak (room_analyses) yazilana kadar false —
  // "Tümünü Onayla" bu true olmadan tiklanamaz, boylece kullanici hicbir
  // zaman kalici kaydi olmayan bir analizi onaylanmis sanamaz.
  const [roomScanSaved, setRoomScanSaved] = useState(false);
  const [roomScanSaving, setRoomScanSaving] = useState(false);
  const [historyAnalysis, setHistoryAnalysis] = useState(null);
  const roomFilesRef = useRef([]);
  const roomRequestRef = useRef(null);
  const roomSessionRef = useRef(0);
  // Ayni canli tarama oturumunun (ilk analiz + sonraki sohbet turleri) HEP
  // ayni kalici room_analyses satirini guncellemesini saglayan idempotency
  // anahtari — resetRoomScan'de tazelenir (bkz. lib/db.js saveRoomAnalysis).
  const roomAnalysisSessionKeyRef = useRef(null);

  const [celebration, setCelebration] = useState({ streak: 0, pointsGained: 0, summary: '' });
  const [userName, setUserNameState] = useState(null);

  // ---- haftalik ilham ----
  const [inspiration, setInspiration] = useState(null);
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const [inspirationError, setInspirationError] = useState(null);

  // ---- odalarim ----
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState(null);
  const [roomCreating, setRoomCreating] = useState(false);
  const [roomDetail, setRoomDetail] = useState(null);
  const [roomDetailLoading, setRoomDetailLoading] = useState(false);
  const [roomDetailError, setRoomDetailError] = useState(null);
  const [roomPhotoUploading, setRoomPhotoUploading] = useState(false);
  // Tek-esya akisi "bir odanin icinden" baslatildiysa, o kararin hangi
  // odaya baglanacagini tutar. Sadece goTo('home'/'rooms') ile temizlenir —
  // scan/decision/celebration arasinda gecerliligini korur.
  const activeRoomRef = useRef(null);

  useEffect(() => {
    logEvent('session_start');
    refreshHomeState(true);
    // Bir hesap oturumu varsa suresini yeniler (30 gunluk kayan pencere).
    // Auth.js'in JWT yenileme mantigi SADECE /api/auth/session'a gercek bir
    // istek gelince calisiyor (lib/auth.js'teki nota bkz.) — bu yuzden
    // uygulama her acildiginda burada ayrica cagriliyor. Misafirse ya da
    // hic oturum yoksa zararsiz bir no-op.
    fetch('/api/auth/session').catch(() => {});
  }, []);

  useEffect(() => {
    logEvent('screen_view', { screen: view });
  }, [view]);

  async function refreshHomeState(isInitial) {
    try {
      // /api/state artik kimligi sunucu tarafinda (cookie/oturum) cozuyor,
      // deviceId query param'ina bakmiyor — bkz. lib/identity.js.
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('state_failed');
      const data = await res.json();
      setHomeState(data);
      setHomeMessage(data.homeMessage || null);
      setHomeError(null);
      setCurrentIdentityId(data.identityId || null);
      setIdentityType(data.identityType || null);
      // Isim kaynagi kimlik turune gore degisir: hesaplida sunucudan
      // (homeState.name, auth_user'dan) gelir; misafirde SADECE su anki
      // misafir kimligiyle eslesen yerel isim guvenilir — farkli bir
      // (eski/yeni) misafir kimliginin ismini otomatik devralmaz (bkz.
      // lib/client.js getUserName).
      setUserNameState(data.identityType === 'guest' ? getUserName(data.identityId) : null);
      if (isInitial) {
        // Oturumu acik (hesapli) kullaniciya secim ekrani hic gosterilmez —
        // bu, Auth.js'in kriptografik olarak dogruladigi bir sunucu
        // kanitidir, localStorage'a ihtiyac yok.
        //
        // Misafir icin localStorage bayragi TEK BASINA yeterli degil: bayrak
        // tarayicida dururken sunucu tarafindaki misafir kimligi (guest_session)
        // silinmis/suresi gecmis/degismis olabilir — proxy.js boyle bir
        // durumda SESSIZCE yepyeni, bos bir misafir kimligi uretir. Bayrak
        // hala varsa kullanici eski odalarina erisecegini sanip aslinda
        // bomboş yeni bir kimlikle devam eder. Bunu onlemek icin bayragi,
        // secimi yaptigi ANDAKI misafir kimlik id'siyle birlikte saklıyoruz;
        // burada da SADECE o id hala GECERLI kimlikle eslesiyorsa atliyoruz.
        let confirmedGuestId = null;
        try {
          confirmedGuestId = localStorage.getItem('sestia_guest_id_confirmed');
        } catch {}
        const isKnownGuest = data.identityType === 'guest' && confirmedGuestId && confirmedGuestId === data.identityId;
        if (data.identityType !== 'account' && !isKnownGuest) setShowWelcome(true);
      }
    } catch {
      setHomeError('Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.');
    }
  }

  function goTo(name) {
    if ((view === 'room-scan' || view === 'room-review') && name !== view) resetRoomScan();
    if (name === 'scan') resetSingleScan();
    if (name === 'room-scan') resetRoomScan();
    if (name === 'home') {
      activeRoomRef.current = null;
      refreshHomeState();
    }
    if (name === 'inspiration') loadInspiration();
    if (name === 'rooms') { activeRoomRef.current = null; loadRooms(); }
    setView(name);
  }

  // ---------------- odalarim ----------------

  async function loadRooms() {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('rooms_failed');
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch {
      setRoomsError('Odalar yüklenemedi. Tekrar dener misin?');
    } finally {
      setRoomsLoading(false);
    }
  }

  async function createRoomAndOpen(name) {
    setRoomCreating(true);
    setRoomsError(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('create_room_failed');
      const room = await res.json();
      setRooms((cur) => [{ ...room, decisionCount: 0, coverPhotoId: null }, ...cur]);
      await openRoom(room.id);
    } catch {
      setRoomsError('Oda oluşturulamadı. Tekrar dener misin?');
    } finally {
      setRoomCreating(false);
    }
  }

  async function openRoom(id) {
    setRoomDetailLoading(true);
    setRoomDetailError(null);
    setView('room-detail');
    try {
      const res = await fetch(`/api/rooms/${id}`);
      if (!res.ok) throw new Error('room_failed');
      setRoomDetail(await res.json());
    } catch {
      setRoomDetailError('Oda yüklenemedi. Tekrar dener misin?');
    } finally {
      setRoomDetailLoading(false);
    }
  }

  async function handleRoomPhotoUpload(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !roomDetail) return;
    setRoomPhotoUploading(true);
    setRoomDetailError(null);
    try {
      let compressed;
      try {
        compressed = await compressImage(file);
      } catch {
        compressed = file;
      }
      const formData = new FormData();
      formData.append('photo', compressed, 'photo.jpg');
      const res = await fetch(`/api/rooms/${roomDetail.id}/photos`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('upload_failed');
      await openRoom(roomDetail.id);
    } catch {
      setRoomDetailError('Fotoğraf yüklenemedi. Tekrar dener misin?');
    } finally {
      setRoomPhotoUploading(false);
    }
  }

  function startScanInRoom() {
    if (!roomDetail) return;
    activeRoomRef.current = { id: roomDetail.id, name: roomDetail.name };
    goTo('scan');
  }

  function startRoomScanInRoom() {
    if (!roomDetail) return;
    activeRoomRef.current = { id: roomDetail.id, name: roomDetail.name };
    goTo('room-scan');
  }

  // Bir odanin icinden baslatilan taramalarda kullanilan fotograflari da
  // odanin kalici galerisine kaydeder — sessizce (en iyi caba), kullanici
  // akisini bloklamaz/bekletmez. (Tek-esya akisi icin: bu tek fotografin
  // kaderi zaten karar onayina bagli, ayrica erken kaydetme gerekmiyor.)
  function persistPhotosToActiveRoom(files) {
    const roomId = activeRoomRef.current?.id;
    if (!roomId) return;
    files.forEach((file) => {
      const fd = new FormData();
      fd.append('photo', file, 'photo.jpg');
      fetch(`/api/rooms/${roomId}/photos`, { method: 'POST', body: fd }).catch(() => {});
    });
  }

  // Oda taramasinda fotograflar EKLENIR EKLENMEZ (karar verilmesini
  // beklemeden) kalici galeriye yazilir — analiz/karar akisindan bagimsiz.
  // Basarisizlik sessizce yutulmuyor: kullaniciya acikca bildiriliyor.
  // Zaten eklenmis fotograflari TEKRAR yuklemez — sadece yeni girdiler
  // parametre olarak gelir (bkz. addRoomPhotos). Sunucunun atadigi kalici
  // photo id'sini ilgili roomPhotos girdisine geri yaziyoruz — bu id,
  // analizin HANGI fotograflara dayandigini kalici kayda baglamak icin
  // gerekiyor (bkz. persistRoomScanIfActive). Her fotograf BAGIMSIZ
  // yukleniyor — biri basarisiz olursa digerlerini engellemez, sadece o
  // girdi uploadFailed=true ile isaretlenir (bkz. retryFailedRoomPhotos,
  // startRoomAnalysis'teki "hepsi kaydedildi mi" kontrolu).
  async function persistNewRoomScanPhotos(entries) {
    const roomId = activeRoomRef.current?.id;
    if (!roomId || entries.length === 0) return;
    for (const entry of entries) {
      try {
        const fd = new FormData();
        fd.append('photo', entry.file, 'photo.jpg');
        const res = await fetch(`/api/rooms/${roomId}/photos`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('persist_failed');
        const saved = await res.json();
        setRoomPhotos((current) => current.map((p) => (p.id === entry.id ? { ...p, photoId: saved.id, uploadFailed: false } : p)));
      } catch {
        setRoomPhotos((current) => current.map((p) => (p.id === entry.id ? { ...p, uploadFailed: true } : p)));
        setRoomError('Bazı fotoğraflar odaya kaydedilemedi. Aşağıdan tekrar deneyebilirsin.');
      }
    }
  }

  // Sadece kaydedilemeyen fotograflari (uploadFailed) tekrar dener —
  // basariyla kaydedilmis olanlari yeniden yuklemez.
  function retryFailedRoomPhotos() {
    const failed = roomPhotos.filter((p) => p.uploadFailed);
    if (failed.length === 0) return;
    setRoomPhotos((current) => current.map((p) => (p.uploadFailed ? { ...p, uploadFailed: false } : p)));
    setRoomError(null);
    persistNewRoomScanPhotos(failed);
  }

  // Tamamlanan analizi (esya listesi + sohbet gecmisi + dayandigi
  // fotograflar) KALICI OLARAK (room_analyses) kaydeder — karar
  // verilmesini beklemeden. Ayni canli oturumun butun turleri
  // roomAnalysisSessionKeyRef ile AYNI kalici satiri gunceller; yeni bir
  // tarama resetRoomScan'de tazelenen yeni bir anahtarla baslar, bu
  // yuzden eskisinin uzerine asla yazmaz. Basarisiz olursa roomScanSaved
  // false kalir — "Tümünü Onayla" bunu kullanarak devre disi kalir,
  // kullanici kalici kaydi olmayan bir analizi onaylayamaz.
  async function persistRoomScanIfActive(items, messages) {
    const roomId = activeRoomRef.current?.id;
    if (!roomId) return;
    setRoomScanSaving(true);
    setRoomScanSaved(false);
    try {
      const photoIds = roomPhotos.map((p) => p.photoId).filter((id) => Number.isInteger(id));
      const res = await fetch(`/api/rooms/${roomId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, messages, photoIds, sessionKey: roomAnalysisSessionKeyRef.current }),
      });
      if (!res.ok) throw new Error('scan_persist_failed');
      setRoomScanSaved(true);
      setRoomError((current) => (current === SCAN_PERSIST_ERROR ? null : current));
    } catch {
      setRoomScanSaved(false);
      setRoomError(SCAN_PERSIST_ERROR);
    } finally {
      setRoomScanSaving(false);
    }
  }

  // Odaya daha once kaydedilmis (karar verilmemis) bir taramaya geri
  // doner — kullanici hic karar vermeden cikip donmus olabilir. Bu
  // noktada roomScanSaved=true: room_scans'in var olmasi, sunucu
  // tarafinda ayni istekte ONCE kalici room_analyses yazildigini
  // (bkz. app/api/rooms/[id]/scan POST) garanti eder.
  function resumeRoomScan() {
    if (!roomDetail?.scan) return;
    activeRoomRef.current = { id: roomDetail.id, name: roomDetail.name };
    roomSessionRef.current += 1;
    roomFilesRef.current = []; // fotograflar sadece odanin galerisinde; sohbete devam icin yeniden gonderilecek dosya yok
    setRoomPhotos((current) => {
      current.forEach((p) => URL.revokeObjectURL(p.url));
      return roomDetail.photos.map((p) => ({ id: p.id, url: `/api/rooms/${roomDetail.id}/photos/${p.id}` }));
    });
    setRoomItems(roomDetail.scan.items);
    setRoomMessages(roomDetail.scan.messages);
    setRoomAnalyzing(false);
    setRoomError(null);
    setRoomScanSaved(true);
    setRoomScanSaving(false);
    setView('room-review');
  }

  // Odanin daha once tamamlanmis (kalici) bir analizini salt-okunur
  // goruntuler — yeni karar olusturmaz, eski analizi guncellemez.
  function viewRoomAnalysis(analysis) {
    setHistoryAnalysis(analysis);
    setView('room-analysis');
  }

  // roomScanSaved false ise (kayit basarisiz oldu) ayni icerikle tekrar
  // dener — sessionKey ayni oldugu icin kopya satir olusturmaz, sadece
  // ayni kalici satiri gunceller.
  function retryRoomScanSave() {
    persistRoomScanIfActive(roomItems, roomMessages);
  }

  function finishCelebration() {
    if (activeRoomRef.current) {
      const roomId = activeRoomRef.current.id;
      activeRoomRef.current = null;
      openRoom(roomId);
    } else {
      goTo('home');
    }
  }

  async function loadInspiration() {
    setInspirationLoading(true);
    setInspirationError(null);
    try {
      const res = await fetch('/api/inspiration');
      if (res.status === 404) {
        setInspirationError('Henüz yeterli karar geçmişin yok. Birkaç eşyaya daha karar ver, sonra tekrar bak.');
        return;
      }
      if (!res.ok) throw new Error('inspiration_failed');
      setInspiration(await res.json());
    } catch {
      setInspirationError('İpuçları yüklenemedi. Tekrar dener misin?');
    } finally {
      setInspirationLoading(false);
    }
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

    if (file.size > MAX_UPLOAD_BYTES) {
      setPhotoUrl(URL.createObjectURL(file));
      setView('decision');
      setAnalyzeError('Bu fotoğraf çok büyük (20 MB üstü). Daha küçük bir fotoğraf seçip tekrar dener misin?');
      return;
    }

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
      logEvent('ai_suggestion_shown', { category: result.category, recommendation: result.recommendation });
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
      logEvent('ai_suggestion_shown', { category: result.category, recommendation: result.recommendation });
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
          items: [{ category, recommendation: selectedRec, reasoning, room, roomId: activeRoomRef.current?.id ?? null }],
          source: 'tekli',
        }),
      });
      if (!res.ok) throw new Error('decide_failed');
      const state = await res.json();
      setHomeState(state);
      logEvent('decision_confirmed', {
        category,
        recommendation: selectedRec,
        changedFromSuggestion: !!analysis && analysis.recommendation !== selectedRec,
        source: 'tekli',
      });
      if (singleFileRef.current) persistPhotosToActiveRoom([singleFileRef.current]);
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
    roomFilesRef.current = [];
    // Yeni bir tarama = yeni idempotency anahtari — bu sayede ilk analiz
    // kesinlikle YENI bir kalici room_analyses satiri acar, eski (terk
    // edilmis olsa bile) bir analizin uzerine asla yazmaz.
    roomAnalysisSessionKeyRef.current = crypto.randomUUID();
    setRoomMessages([]);
    setRoomChatDraft('');
    setRoomChatBusy(false);
    setRoomChatError(null);
    setRoomPhotos((current) => {
      current.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setRoomAnalyzing(false);
    setRoomCoverageChecking(false);
    setRoomCoverageResult(null);
    setRoomError(null);
    setRoomItems([]);
    setRoomScanSaved(false);
    setRoomScanSaving(false);
  }

  async function addRoomPhotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const withinSize = files.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    const oversizedCount = files.length - withinSize.length;

    const remaining = Math.max(0, MAX_ROOM_PHOTOS - roomPhotos.length);
    const accepted = withinSize.slice(0, remaining);
    const compressedFiles = await Promise.all(
      accepted.map((file) => compressImage(file, 1600).catch(() => file))
    );
    const newEntries = compressedFiles.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    const updated = [...roomPhotos, ...newEntries];
    setRoomPhotos(updated);
    setRoomError(
      oversizedCount > 0
        ? `${oversizedCount} fotoğraf çok büyük olduğu için eklenemedi (20 MB sınırı).`
        : null
    );
    if (newEntries.length > 0) {
      // Kapsam kontrolu ve kalici kayit birbirinden BAGIMSIZ — biri
      // basarisiz olsa da digerini engellemez, birbirini beklemez.
      checkRoomPhotoCoverage(updated);
      persistNewRoomScanPhotos(newEntries);
    }
  }

  function removeRoomPhoto(id) {
    setRoomPhotos((current) => {
      const target = current.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((p) => p.id !== id);
    });
    setRoomCoverageResult(null);
  }

  // Ucuz, ayri bir AI cagrisi — pahali tam oda analizini (esya listeleme)
  // her fotograf eklendiginde tekrar calistirmamak icin once bu kontrol
  // ediliyor. Yeterliyse otomatik olarak tam analize gecer; degilse
  // Sestia'nin istedigi aciyi gosterip kullaniciyi bekler (istedigi zaman
  // "Bu Fotograflarla Devam Et" ile atlayabilir).
  async function checkRoomPhotoCoverage(photos) {
    setRoomCoverageChecking(true);
    setRoomCoverageResult(null);
    setRoomError(null);
    try {
      const formData = new FormData();
      photos.forEach((p) => formData.append('image', p.file));
      formData.append('mode', 'oda-kapsam');
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('coverage_failed');
      const result = await res.json();
      if (result.sufficient) {
        startRoomAnalysis(photos);
      } else {
        setRoomCoverageResult(result);
      }
    } catch {
      setRoomError('Fotoğraf kontrolünde bir sorun oldu. Yine de bu fotoğraflarla devam edebilirsin.');
    } finally {
      setRoomCoverageChecking(false);
    }
  }

  async function startRoomAnalysis(photosOverride) {
    const photos = photosOverride || roomPhotos;
    if (photos.length === 0) return;
    // Butun fotograflar sunucuya kaydedilmeden analiz BASLAMAZ — aksi
    // halde kalici room_analyses.photo_ids_json eksik/yanlis fotograflarla
    // yazilabilir. CANLI roomPhotos durumuna bakiyoruz (photosOverride,
    // checkRoomPhotoCoverage'dan gelen anlik bir kopya oldugu icin yukleme
    // ilerlemesini yansitmaz).
    if (roomPhotos.some((p) => !p.photoId && !p.uploadFailed)) {
      setRoomError('Fotoğraflar hâlâ kaydediliyor, birazdan tekrar dener misin?');
      return;
    }
    if (roomPhotos.some((p) => p.uploadFailed)) {
      setRoomError('Bazı fotoğraflar kaydedilemedi. Aşağıdan tekrar deneyip devam edebilirsin.');
      return;
    }
    roomSessionRef.current += 1;
    const session = roomSessionRef.current;
    roomFilesRef.current = photos.map((p) => p.file);
    const controller = new AbortController();
    roomRequestRef.current = controller;
    setRoomItems([]);
    setRoomMessages([]);
    setRoomError(null);
    setView('room-review');
    setRoomAnalyzing(true);

    try {
      const formData = new FormData();
      roomFilesRef.current.forEach((file) => formData.append('image', file));
      formData.append('mode', 'oda');
      const res = await fetch('/api/analyze', { method: 'POST', body: formData, signal: controller.signal });
      if (!res.ok) throw new Error('analyze_failed');
      const data = await res.json();
      if (session !== roomSessionRef.current) return;
      const nextItems = data.items.map((item) => ({ ...item, excluded: false, manual: false }));
      setRoomItems(nextItems);
      setRoomMessages(data.messages);
      logEvent('ai_suggestion_shown', {
        items: data.items.map((item) => ({ category: item.category, recommendation: item.recommendation })),
      });
      // Analiz, karar verilmesini beklemeden odaya kaydedilir.
      persistRoomScanIfActive(nextItems, data.messages);
    } catch {
      if (session !== roomSessionRef.current || controller.signal.aborted) return;
      setRoomError('Analiz sırasında bir sorun oluştu. Farklı fotoğraflarla tekrar dener misin?');
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
      roomFilesRef.current.forEach((file) => formData.append('image', file));
      formData.append('mode', 'oda');
      formData.append('messages', JSON.stringify([...roomMessages, { role: 'user', content }]));
      formData.append('items', JSON.stringify(roomItems));
      const res = await fetch('/api/analyze', { method: 'POST', body: formData, signal: controller.signal });
      if (!res.ok) throw new Error('room_chat_failed');
      const result = await res.json();
      if (session !== roomSessionRef.current) return;
      const currentIds = new Set(roomItems.map(item => item.id));
      const merged = roomItems.map(item => {
        const updated = result.items.find(candidate => candidate.id === item.id);
        return item.manual || item.excluded || !updated ? item : { ...item, ...updated };
      });
      const added = result.items
        .filter(item => !currentIds.has(item.id))
        .map(item => ({ ...item, excluded: false, manual: false }));
      const finalItems = [...merged, ...added];
      setRoomItems(finalItems);
      setRoomMessages(result.messages);
      setRoomChatDraft('');
      // Analiz, karar verilmesini beklemeden odaya kaydedilir.
      persistRoomScanIfActive(finalItems, result.messages);
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
    // roomScanSaved=false demek, bu analizin kalici bir kaydi henuz yok
    // demektir (basarisiz oldu ya da hala kaydediliyor) — kullanici bunu
    // "tamamlanmis" sanarak onaylayamaz. Buton zaten devre disi birakilir,
    // bu sadece ek bir guvenlik.
    if (included.length === 0 || roomConfirming || roomRequestRef.current || !roomScanSaved) return;
    setRoomConfirming(true);
    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: included.map((it) => ({
            category: it.category,
            recommendation: it.recommendation,
            reasoning: it.reasoning,
            roomId: activeRoomRef.current?.id ?? null,
          })),
          source: 'oda',
        }),
      });
      if (!res.ok) throw new Error('decide_failed');
      const state = await res.json();
      setHomeState(state);
      included.forEach((it) => {
        logEvent('decision_confirmed', {
          category: it.category,
          recommendation: it.recommendation,
          changedFromSuggestion: !!it.manual,
          source: 'oda',
        });
      });
      // Fotograflar zaten eklendikce kaydedilmisti (bkz. persistNewRoomScanPhotos).
      // Karar verildigine gore bekleyen tarama artik gereksiz — temizle.
      // roomItems (hariç tutma/oneri degisiklikleri dahil NIHAI durum)
      // finalItems olarak gonderilir — sunucu bunu Sestia'nin orijinal
      // degerlendirmesinden AYRI olarak kalici analize yazar.
      if (activeRoomRef.current?.id) {
        fetch(`/api/rooms/${activeRoomRef.current.id}/scan`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ finalItems: roomItems }),
        }).catch(() => {});
      }
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

  function selectMode(mode) {
    logEvent('mode_selected', { mode });
    goTo(mode === 'tek_esya' ? 'scan' : 'room-scan');
  }

  return (
    <div className="app">
      {view === 'home' && (
        showWelcome ? (
          <WelcomeView
            onGuestStart={() => {
              setShowWelcome(false);
              // WelcomeView icinde kaydedilen isim, Page seviyesindeki
              // state'e burada aktariliyor — aksi halde ana ekran ilk
              // anda eski (bos) degeri gosterir (bkz. lib/client.js).
              setUserNameState(getUserName(currentIdentityId));
            }}
            currentIdentityId={currentIdentityId}
            emailReady={homeState.emailReady}
          />
        ) : (
          <HomeView
            homeState={homeState}
            homeMessage={homeMessage}
            homeError={homeError}
            identityType={identityType}
            userName={identityType === 'account' ? homeState.name : userName}
            onScanSingle={() => selectMode('tek_esya')}
            onScanRoom={() => selectMode('oda_tarama')}
            onOpenInspiration={() => goTo('inspiration')}
            onOpenRooms={() => goTo('rooms')}
            onOpenAccount={() => goTo('account')}
          />
        )
      )}

      {view === 'account' && (
        <WelcomeView
          onGuestStart={() => goTo('home')}
          currentIdentityId={currentIdentityId}
          emailReady={homeState.emailReady}
          alreadyGuest
          onBack={() => goTo('home')}
        />
      )}

      {view === 'rooms' && (
        <RoomsListView
          rooms={rooms}
          loading={roomsLoading}
          error={roomsError}
          creating={roomCreating}
          onBack={() => goTo('home')}
          onOpenRoom={openRoom}
          onCreateRoom={createRoomAndOpen}
        />
      )}

      {view === 'room-detail' && (
        <RoomDetailView
          room={roomDetail}
          loading={roomDetailLoading}
          error={roomDetailError}
          uploading={roomPhotoUploading}
          onBack={() => goTo('rooms')}
          onAddPhoto={handleRoomPhotoUpload}
          onScanHere={startScanInRoom}
          onRoomScanHere={startRoomScanInRoom}
          onResumeScan={resumeRoomScan}
          onViewAnalysis={viewRoomAnalysis}
        />
      )}

      {view === 'room-analysis' && historyAnalysis && (
        <RoomReviewView
          photos={historyAnalysis.photoIds.map((pid) => ({ id: pid, url: `/api/rooms/${roomDetail?.id}/photos/${pid}` }))}
          analyzing={false}
          error={null}
          items={historyAnalysis.items}
          messages={historyAnalysis.messages}
          finalItems={historyAnalysis.finalItems}
          onBack={() => { setHistoryAnalysis(null); setView('room-detail'); }}
          readOnly
        />
      )}

      {view === 'inspiration' && (
        <InspirationView
          data={inspiration}
          loading={inspirationLoading}
          error={inspirationError}
          onBack={() => goTo('home')}
          onRetry={loadInspiration}
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
        <RoomScanView
          onBack={() => goTo('home')}
          photos={roomPhotos}
          onAddFiles={addRoomPhotos}
          onRemovePhoto={removeRoomPhoto}
          error={roomError}
          coverageChecking={roomCoverageChecking}
          coverageResult={roomCoverageResult}
          onContinueAnyway={() => startRoomAnalysis()}
          photosUploading={roomPhotos.some((p) => !p.photoId && !p.uploadFailed)}
          photosUploadFailed={roomPhotos.some((p) => p.uploadFailed)}
          onRetryUploads={retryFailedRoomPhotos}
        />
      )}

      {view === 'room-review' && (
        <RoomReviewView
          photos={roomPhotos}
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
          chatDisabled={roomFilesRef.current.length === 0}
          scanSaved={roomScanSaved}
          scanSaving={roomScanSaving}
          onRetryScanSave={retryRoomScanSave}
        />
      )}

      {view === 'celebration' && (
        <CelebrationView
          celebration={celebration}
          userName={userName}
          onScanAgain={() => goTo('scan')}
          onHome={finishCelebration}
        />
      )}

      <FeedbackButton screen={view} />
    </div>
  );
}

const welcomeInputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '13px 15px', borderRadius: 12,
  border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 15,
};

function WelcomeView({ onGuestStart, currentIdentityId, emailReady, alreadyGuest, onBack }) {
  const initialName = getUserName(currentIdentityId) || '';
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // null | 'not_configured' | 'sent' | 'error'
  const [showEmailForm, setShowEmailForm] = useState(false);
  // Zaten misafirsek VE hitap tercihi zaten biliniyorsa dogrudan yontem
  // secim asamasindan basla — ayni tercihi tekrar sormuyoruz. Bilinmiyorsa
  // (ör. daha once misafir dogrudan "Misafir Olarak Dene" ile devam etmisse)
  // bir kez sorulur (bkz. AGENTS/urun karari 5).
  const [stage, setStage] = useState(alreadyGuest && initialName ? 'method' : 'intro');

  // Isim, e-posta/hesap akisindan BAGIMSIZ olarak, SU ANKI misafir
  // kimligine baglanarak yerel kaydedilir — Resend hazir olmasa bile
  // misafir kisisellestirmesi calissin, farkli bir misafir kimligi eski
  // ismi devralmasin diye (bkz. lib/client.js).
  function saveNameLocally() {
    const cleanName = name.trim();
    if (cleanName) setUserName(cleanName, currentIdentityId);
  }

  function continueFromIntro(e) {
    e.preventDefault();
    if (!name.trim()) return;
    saveNameLocally();
    setStage('method');
  }

  async function submitEmail(e) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || submitting) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const pre = await fetch('/api/account/precheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow: 'signup', name: name.trim(), email: cleanEmail }),
      });
      const preBody = await pre.json();
      if (!pre.ok) throw new Error('precheck_failed');
      if (!preBody.emailReady) {
        // Resend henuz baglanmadi — e-posta calisiyormus gibi davranmiyoruz.
        setStatus('not_configured');
        return;
      }
      const csrfRes = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfRes.json();
      const signinRes = await fetch('/api/auth/signin/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email: cleanEmail, csrfToken, callbackUrl: '/', json: 'true' }),
      });
      if (!signinRes.ok) throw new Error('signin_failed');
      // Burada "secildi" bayragi bilerek basmiyoruz: bu adimda kullanici
      // henuz dogrulanmadi, hala misafir. Dogrulama tamamlaninca gercek
      // hesap oturumu (identityType==='account') zaten sunucu tarafinda
      // kanitlanmis oluyor ve secim ekrani onun icin ayrica hic
      // gosterilmiyor (localStorage'a bagimli degil).
      setStatus('sent');
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  }

  function chooseGuest() {
    // Bayragi, TAM OLARAK su an gecerli olan misafir kimlik id'siyle
    // damgaliyoruz — ileride bu kimlik sessizce degisirse (silinme/sifirlanma)
    // bayrak artik eslesmeyecegi icin otomatik gecersiz sayilir.
    try {
      if (currentIdentityId) localStorage.setItem('sestia_guest_id_confirmed', currentIdentityId);
    } catch {}
    onGuestStart();
  }

  return (
    <section className="view">
      {onBack && (
        <div className="topbar">
          <button className="iconbtn" onClick={onBack} aria-label="Geri"><BackIcon /></button>
        </div>
      )}
      <div className="scroll center" style={{ paddingTop: onBack ? 8 : 40, gap: 22 }}>
        {stage === 'intro' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <img src="/icon.svg" alt="" width={64} height={64} style={{ borderRadius: 16 }} />
              <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }}>Merhaba, ben {ASSISTANT_NAME}!</h1>
              <div className="muted" style={{ fontSize: 14, marginTop: 6 }}>Sana nasıl hitap etmemi istersin?</div>
            </div>

            <form onSubmit={continueFromIntro} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveNameLocally}
                placeholder="Adın veya tercih ettiğin hitap şekli"
                maxLength={60}
                autoFocus
                style={welcomeInputStyle}
              />
              <button className="btn-primary" type="submit" disabled={!name.trim()}>Devam Et</button>
            </form>
          </>
        )}

        {stage === 'method' && (
          <>
            {name.trim() && (
              <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600 }}>Memnun oldum, {name.trim()}!</div>
            )}
            {status !== 'sent' && (
              <div className="muted" style={{ textAlign: 'center', fontSize: 14 }}>Nasıl devam etmek istersin?</div>
            )}

            {status === 'sent' ? (
              <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>E-posta yolda</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                  {email} adresine bir giriş bağlantısı gönderdik. Gelen kutunu kontrol et.
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {emailReady ? (
                  showEmailForm ? (
                    <form onSubmit={submitEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ornek@email.com"
                        disabled={submitting}
                        autoFocus
                        style={welcomeInputStyle}
                      />
                      {status === 'not_configured' && (
                        <div className="errbox">
                          E-posta ile giriş şimdilik hazır değil — misafir olarak devam edebilirsin.
                        </div>
                      )}
                      {status === 'error' && <div className="errbox">Bir sorun oldu, tekrar dener misin?</div>}
                      <button className="btn-primary" type="submit" disabled={!email.trim() || submitting}>
                        {submitting ? 'Gönderiliyor...' : 'Devam Et'}
                      </button>
                    </form>
                  ) : (
                    <div>
                      <button className="btn-primary" onClick={() => setShowEmailForm(true)} style={{ width: '100%' }}>
                        E-posta ile Devam Et
                      </button>
                      <div className="muted" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 6 }}>
                        İlerlemeni koru, farklı cihazlardan kaldığın yerden devam et.
                      </div>
                    </div>
                  )
                ) : (
                  <div className="muted" style={{ fontSize: 12.5, textAlign: 'center' }}>
                    E-posta ile giriş yakında burada olacak.
                  </div>
                )}

                {!alreadyGuest && (
                  <div>
                    <button className="btn-secondary" onClick={chooseGuest} style={{ width: '100%' }}>
                      Misafir Olarak Dene
                    </button>
                    <div className="muted" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 6 }}>
                      Önce biraz keşfetmek ister misin?
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function HomeView({ homeState, homeMessage, homeError, identityType, userName, onScanSingle, onScanRoom, onOpenInspiration, onOpenRooms, onOpenAccount }) {
  return (
    <section className="view">
      <div className="scroll">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600 }}>{userName ? `Merhaba, ${userName}.` : 'Merhaba.'}</h1>
        </div>

        <button
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%' }}
          onClick={onOpenRooms}
        >
          <div className="flamewrap-compact"><BoxIcon style={{ width: 18, height: 18 }} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600 }}>Odalarım</div>
            <div className="muted">Oluşturduğun odalara göz at</div>
          </div>
          <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
        </button>

        {homeState.totalDecisions >= 5 && (
          <button
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%' }}
            onClick={onOpenInspiration}
          >
            <div className="flamewrap-compact"><StarIcon style={{ width: 18, height: 18 }} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600 }}>Bu Hafta</div>
              <div className="muted">Kararlarına göre kişisel ipuçları</div>
            </div>
            <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
          </button>
        )}

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="flamewrap-compact"><FlameIcon style={{ width: 18, height: 18 }} /></div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700 }}>
              {homeState.totalDecisions === 0 ? '1. Gün' : `${homeState.streak} gün`}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600 }}>
              {homeMessage?.baslik || 'Nereden başlamak istersin?'}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              {homeMessage?.alt_baslik || 'Herhangi bir odadan bir eşya seç ve fotoğrafını çek · ~1 dakika'}
            </div>
          </div>
          {homeMessage?.soru?.metin && (
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{homeMessage.soru.metin}</div>
          )}
          <div className="modeoptions">
            <button className="modeoption" onClick={onScanSingle}>
              <div className="modeoption-iconwrap"><CameraIcon style={{ width: 16, height: 16 }} /></div>
              <div className="modeoption-title">Tek Eşya</div>
              <div className="modeoption-desc">Bir eşyayı birlikte değerlendirelim.</div>
            </button>
            <button className="modeoption" onClick={onScanRoom}>
              <div className="modeoption-iconwrap"><GridIcon style={{ width: 16, height: 16 }} /></div>
              <div className="modeoption-title">Oda Taraması</div>
              <div className="modeoption-desc">Yaşam alanına birlikte bakalım.</div>
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

        {identityType !== 'account' && (
          <button
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%' }}
            onClick={onOpenAccount}
          >
            <div className="flamewrap-compact"><CheckIcon style={{ width: 18, height: 18 }} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600 }}>İlerlemeni koru.</div>
              <div className="muted">Odalarına ve kararlarına diğer cihazlarından da eriş.</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4 }}>Hesap oluştur veya giriş yap</div>
            </div>
            <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
          </button>
        )}
      </div>
    </section>
  );
}

function InspirationView({ data, loading, error, onBack, onRetry }) {
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack} aria-label="Geri"><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Bu Hafta</h2>
        </div>

        {loading && (
          <div className="thinking">
            <div className="spinner" />
            <div>Kararlarına bakıp ipuçları hazırlıyoruz...</div>
          </div>
        )}

        {error && (
          <div className="errbox" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {error}
            <button className="btn-outline" onClick={onRetry}>Tekrar Dene</button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="rec-banner" style={{ background: 'var(--eucalyptus)', color: '#fff' }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600 }}>{data.headline}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>{data.subtext}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.tips.map((tip, i) => {
                const meta = TIP_META[tip.icon];
                return (
                  <div key={i} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: `var(--${meta.varName}-tint)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <meta.Icon style={{ width: 20, height: 20, color: `var(--${meta.varName})` }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{tip.title}</div>
                      <div className="muted">{tip.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function RoomsListView({ rooms, loading, error, creating, onBack, onOpenRoom, onCreateRoom }) {
  const [name, setName] = useState('');
  function submit(e) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean || creating) return;
    onCreateRoom(clean);
    setName('');
  }
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack}><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Odalarım</h2>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. Salon"
            maxLength={60}
            disabled={creating}
            style={{
              flex: 1, boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12,
              border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 15,
            }}
          />
          <button className="btn-primary" type="submit" disabled={!name.trim() || creating} style={{ width: 'auto', padding: '0 18px' }}>
            {creating ? '...' : 'Ekle'}
          </button>
        </form>

        {error && <div className="errbox">{error}</div>}
        {loading && (
          <div className="thinking">
            <div className="spinner" />
          </div>
        )}

        {!loading && rooms.length === 0 && (
          <div className="muted" style={{ textAlign: 'center', marginTop: 8 }}>
            Henüz bir oda oluşturmadın. Yukarıdan bir isim yazıp başlayabilirsin.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rooms.map((room) => (
            <button
              key={room.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%' }}
              onClick={() => onOpenRoom(room.id)}
            >
              {room.coverPhotoId ? (
                <img
                  src={`/api/rooms/${room.id}/photos/${room.coverPhotoId}`}
                  alt=""
                  style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div className="flamewrap-compact"><GridIcon style={{ width: 18, height: 18 }} /></div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600 }}>{room.name}</div>
                <div className="muted">{room.decisionCount} karar</div>
              </div>
              <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoomDetailView({ room, loading, error, uploading, onBack, onAddPhoto, onScanHere, onRoomScanHere, onResumeScan, onViewAnalysis }) {
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack}><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>{room?.name || 'Oda'}</h2>
        </div>

        {loading && (
          <div className="thinking">
            <div className="spinner" />
          </div>
        )}
        {error && <div className="errbox">{error}</div>}

        {room && !loading && (
          <>
            {room.photos.length > 0 && (
              <div className="photogrid">
                {room.photos.map((photo) => (
                  <div key={photo.id} className="photothumb">
                    <img src={`/api/rooms/${room.id}/photos/${photo.id}`} alt="" />
                  </div>
                ))}
              </div>
            )}

            {room.scan && (
              <div className="card" style={{ background: 'var(--eucalyptus-tint)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Yarım kalan bir tarama var</div>
                <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                  {room.scan.items.length} eşya için analiz tamamlandı ama henüz karar vermedin.
                </div>
                <button className="btn-primary" onClick={onResumeScan}>Taramaya Devam Et</button>
              </div>
            )}

            <CaptureButtons
              onFile={onAddPhoto}
              idPrefix="room-detail-photo"
              cameraLabel={uploading ? 'Yükleniyor...' : (room.photos.length ? 'Bir Fotoğraf Daha Ekle' : 'Fotoğraf Ekle')}
              galleryLabel="Galeriden Ekle"
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-outline" onClick={onScanHere} disabled={uploading}>
                <CameraIcon style={{ width: 18, height: 18 }} /> Bu Odada Eşya Tara
              </button>
              <button className="btn-outline" onClick={onRoomScanHere} disabled={uploading}>
                <GridIcon style={{ width: 18, height: 18 }} /> Oda Taraması Yap
              </button>
            </div>

            {room.analyses && room.analyses.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 10 }}>Geçmiş Analizler</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {room.analyses.map((a) => (
                    <button
                      key={a.id}
                      className="card"
                      style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', width: '100%', cursor: 'pointer' }}
                      onClick={() => onViewAnalysis(a)}
                    >
                      <div className="flamewrap-compact"><GridIcon style={{ width: 16, height: 16 }} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{formatAnalysisDate(a.createdAt)}</div>
                        <div className="muted">{a.items.length} eşya bulundu</div>
                      </div>
                      <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 10 }}>Bu Odadaki Kararlar</div>
              {room.decisions.length === 0 && <div className="muted">Henüz bu odada bir karar verilmedi.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {room.decisions.map((d) => {
                  const meta = REC_META[d.recommendation];
                  return (
                    <div key={d.id} className="card" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="flamewrap-compact" style={{ background: `var(--${meta.varName}-tint)` }}>
                        <meta.Icon style={{ width: 16, height: 16, color: `var(--${meta.varName})` }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.category}</div>
                        <div className="muted">{meta.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CaptureButtons({ onFile, idPrefix, multiple, cameraLabel = 'Fotoğraf Çek', galleryLabel = 'Galeriden Seç' }) {
  const cameraId = `${idPrefix}-camera`;
  const galleryId = `${idPrefix}-gallery`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <label className="btn-primary" htmlFor={cameraId} style={{ cursor: 'pointer' }}>
        <CameraIcon style={{ width: 18, height: 18 }} /> {cameraLabel}
      </label>
      <input type="file" id={cameraId} accept="image/*" capture="environment" onChange={onFile} />

      <label className="btn-outline" htmlFor={galleryId} style={{ cursor: 'pointer' }}>
        <GalleryIcon style={{ width: 18, height: 18 }} /> {galleryLabel}
      </label>
      <input type="file" id={galleryId} accept="image/*" multiple={multiple} onChange={onFile} />
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

function RoomScanView({ onBack, photos, onAddFiles, onRemovePhoto, error, coverageChecking, coverageResult, onContinueAnyway,
  photosUploading, photosUploadFailed, onRetryUploads }) {
  const canAddMore = photos.length < MAX_ROOM_PHOTOS;
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack}><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Oda Taraması</h2>
        </div>

        {error && (
          <div className="errbox" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {error}
            {photosUploadFailed && <button className="btn-outline" onClick={onRetryUploads}>Tekrar Dene</button>}
          </div>
        )}

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <GridIcon style={{ width: 36, height: 36, color: 'var(--text-muted)' }} strokeWidth="1.6" />
            <div className="muted" style={{ maxWidth: 280 }}>
              Odanın olabildiğince genelini gösteren bir fotoğrafla başla — {ASSISTANT_NAME} yeterli olup olmadığına
              bakıp gerekirse tek bir ek açı ister.
            </div>
          </div>

          {photos.length > 0 && (
            <div className="photogrid">
              {photos.map((photo) => (
                <div key={photo.id} className="photothumb">
                  <img src={photo.url} alt="" />
                  <button
                    className="photothumb-remove"
                    aria-label="Fotoğrafı kaldır"
                    onClick={() => onRemovePhoto(photo.id)}
                  >
                    <CloseIcon style={{ width: 12, height: 12 }} />
                  </button>
                  {photo.uploadFailed ? (
                    <div className="muted" style={{ fontSize: 11, color: 'var(--terracotta)', textAlign: 'center' }}>Kaydedilemedi</div>
                  ) : !photo.photoId ? (
                    <div className="muted" style={{ fontSize: 11, textAlign: 'center' }}>Kaydediliyor...</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {canAddMore ? (
            <CaptureButtons
              onFile={onAddFiles}
              idPrefix="photo-room"
              multiple
              cameraLabel={photos.length ? 'Bir Fotoğraf Daha Çek' : 'Fotoğraf Çek'}
              galleryLabel={photos.length ? 'Galeriden Daha Fazla Ekle' : 'Galeriden Seç'}
            />
          ) : (
            <div className="muted" style={{ textAlign: 'center' }}>En fazla {MAX_ROOM_PHOTOS} fotoğraf ekleyebilirsin.</div>
          )}
        </div>

        {coverageChecking && (
          <div className="thinking">
            <div className="spinner" />
            <div>{ASSISTANT_NAME} fotoğrafı kontrol ediyor...</div>
          </div>
        )}

        {coverageResult && !coverageResult.sufficient && (
          <div className="rec-banner" style={{ background: 'var(--terracotta-tint)' }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{coverageResult.reply}</div>
            {coverageResult.requestedAngle && (
              <div className="muted" style={{ fontSize: 12 }}>İstenen açı: {coverageResult.requestedAngle}</div>
            )}
          </div>
        )}

        <div className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
          Bu kesin bir ölçüm değil — {ASSISTANT_NAME} sadece fotoğraflarda gördüğü kadarıyla değerlendiriyor.
        </div>
      </div>

      {photos.length > 0 && (
        <div className="decision-footer">
          <button className="btn-primary" onClick={onContinueAnyway} disabled={coverageChecking || photosUploading || photosUploadFailed}>
            {photosUploading ? 'Fotoğraflar Kaydediliyor...' : 'Bu Fotoğraflarla Devam Et'}
          </button>
        </div>
      )}
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

        {analysis && (
          <form onSubmit={onSendChat} className="notefield">
            <input
              type="text"
              value={chatDraft}
              onChange={(e) => onChatDraft(e.target.value)}
              placeholder="Eklemek istediğin bir şey var mı? (opsiyonel)"
              maxLength={500}
              disabled={chatBusy || confirming || messages.length >= 42}
            />
            <button
              type="submit"
              className="notefield-submit"
              aria-label="Gönder"
              disabled={!chatDraft.trim() || chatBusy || confirming || messages.length >= 42}
            >
              <SendIcon style={{ width: 16, height: 16 }} />
            </button>
          </form>
        )}
        {chatBusy && <div role="status" className="muted" style={{ fontSize: 12 }}>Önerin güncelleniyor...</div>}
        {chatError && <div role="alert" className="errbox">{chatError}</div>}
        {messages.length >= 42 && <div className="muted" style={{ fontSize: 12 }}>Not ekleme sınırına ulaştın.</div>}

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

function RoomReviewView({ photos, analyzing, error, items, onToggleExclude, onSetRec, onBack, onConfirm, confirming,
  messages, chatDraft, onChatDraft, chatBusy, chatError, onSendChat, chatDisabled, scanSaved, scanSaving, onRetryScanSave, readOnly, finalItems }) {
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
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>{readOnly ? 'Geçmiş Analiz' : 'Oda Analizi'}</h2>
        </div>

        <div className="photostrip">
          {photos.map((photo) => (
            <div key={photo.id} className="photothumb photothumb-static">
              <img src={photo.url} alt="Taranan oda" />
            </div>
          ))}
        </div>

        {analyzing && (
          <div className="thinking">
            <div className="spinner" />
            <div>Yapay zeka {photos.length > 1 ? 'fotoğrafları' : 'odayı'} inceliyor...</div>
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
            {readOnly ? null : chatDisabled ? (
              <div className="muted" style={{ fontSize: 12.5 }}>
                Bu, daha önce kaydedilmiş bir tarama — sohbete devam etmek için fotoğraflar yeniden gerekiyor.
                İstersen mevcut önerilerle kararlarını verebilirsin.
              </div>
            ) : (
              <>
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
              </>
            )}
          </section>
        )}

        {!analyzing && items.length > 0 && (
          <div className="muted" style={{ fontSize: 12 }}>
            {readOnly ? `${items.length} eşya bulunmuştu.` : `${items.length} eşya bulundu. İstemediğini kapatabilir, önerisini değiştirebilirsin.`}
          </div>
        )}

        {items.map((item, index) => {
          // Sestia'nin orijinal degerlendirmesi (items) ile kullanicinin
          // sonradan verdigi NIHAI karar (finalItems) BILEREK ayri
          // tutuluyor — burada sadece goruntulerken yan yana gosteriliyor,
          // birbirinin yerine yazilmiyor.
          const finalMatch = readOnly && finalItems ? finalItems.find((f) => f.id === item.id) : null;
          return (
            <div key={item.id} className={`roomcard${item.excluded ? ' excluded' : ''}`}>
              <div className="roomcard-head">
                <div>
                  <div className="roomcard-title">{item.label}</div>
                  <div className="muted">{item.category}</div>
                </div>
                {!readOnly && (
                  <button className="iconbtn" disabled={chatBusy || confirming} aria-label={item.excluded ? `${item.label} dahil et` : `${item.label} hariç tut`} style={{ width: 28, height: 28 }} onClick={() => onToggleExclude(index)}>
                    <CloseIcon style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
              {!item.excluded && (
                <>
                  <div className="muted" style={{ fontSize: 12 }}>{item.reasoning}</div>
                  {readOnly ? (
                    <div className="muted">Sestia'nın önerisi: {REC_META[item.recommendation].label}</div>
                  ) : (
                    <>
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
                </>
              )}
              {readOnly && finalMatch && (
                <div className="muted" style={{ fontWeight: 600 }}>
                  {finalMatch.excluded ? 'Kararın: Hariç tutuldu' : `Kararın: ${REC_META[finalMatch.recommendation].label}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && !analyzing && items.length > 0 && (
        <div className="decision-footer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!scanSaved && (
            <div className="errbox" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>{scanSaving ? 'Analiz kaydediliyor...' : 'Analiz henüz kalıcı olarak kaydedilemedi — kararlarını onaylayamazsın.'}</span>
              {!scanSaving && <button type="button" className="btn-outline" onClick={onRetryScanSave}>Tekrar Dene</button>}
            </div>
          )}
          <button className="btn-primary" disabled={includedCount === 0 || confirming || chatBusy || !scanSaved} onClick={onConfirm}>
            {confirming ? 'Kaydediliyor...' : `Tümünü Onayla (${includedCount} eşya)`}
          </button>
        </div>
      )}
    </section>
  );
}

function CelebrationView({ celebration, userName, onScanAgain, onHome }) {
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
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 22 }}>Harika iş{userName ? `, ${userName}` : ''}!</h1>
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
