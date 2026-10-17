'use client';

import { useEffect, useRef, useState } from 'react';
import { compressImage, getLastRoom, setLastRoom, getUserName, setUserName } from '@/lib/client';
import { SessionLifecycleProvider, useSessionLifecycle } from '@/components/SessionLifecycleProvider';
import { ROOM_OPTIONS, DEFAULT_ROOM, MAX_ROOM_PHOTOS, MAX_UPLOAD_BYTES, ASSISTANT_NAME } from '@/lib/constants';
import { logEvent } from '@/lib/telemetry';
import FeedbackButton from '@/components/FeedbackButton';
import { Brand, Header, PageHeading, MainNavigation, HomeDashboard, DiscoverView, ChooseView, SestiaChat, ConversationPanel, BeforeAfterSlider, RoomCover } from '@/components/SestiaExperience';
import roomItemSources from '@/lib/roomItemSources.cjs';
import roomScanClient from '@/lib/roomScanClient.cjs';
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
  LayersIcon,
  LightbulbIcon,
  REC_META,
  TIP_META,
} from '@/components/icons';

const ACTION_ORDER = ['tut', 'sat', 'bagisla', 'geri_donustur', 'at'];
const SUGGESTION_AREA_LABELS = { ayiklama: 'Ayıklama', yerlesim: 'Yerleşim', renk: 'Renk', isik: 'Işık', dekor: 'Dekor', depolama: 'Depolama', diy: 'Kendin yap' };
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

// Onaylı ürün kuralı (docs/SESTIA_PROJE_BRIEFING.md): gerçek çalışması
// olmayan kullanıcı Keşif'te, olan Ana Sayfa'da başlar; misafir ya da hesap
// olması fark etmez. "Gerçek çalışma" = en az bir karar veya bir oda
// (lib/db.js hasStartedRealWork). Yalnızca açılışta ve tanışma bitince
// uygulanır; sekmeler arasında geçişi hiçbir zaman yönlendirmez.
function landingView(state) {
  return state?.totalDecisions > 0 || state?.hasStartedWork ? 'home' : 'discover';
}

// Session lifecycle end (idle timeout, logout, or a rotated identity
// detected by SessionLifecycleProvider) unmounts and remounts the entire
// private subtree below by bumping `gen` — the same "reset by remount"
// pattern this file already used for SestiaChat's `key={currentIdentityId}`,
// just applied to the whole app instead of one component. This clears every
// piece of local React state (rooms, photos, analysis, chat, Toparla
// confirm/result UI, drafts) at once, rather than manually nulling out each
// of PageInner's several dozen useState calls one by one.
export default function Page() {
  const [gen, setGen] = useState(0);
  function handleLifecycleEnded() {
    // boba_last_room is a plain localStorage preference, not React state —
    // remounting PageInner does not clear it on its own, and it is not
    // guest-id-scoped the way getUserName/setUserName already are.
    setLastRoom(null);
    setGen((g) => g + 1);
  }
  return (
    <SessionLifecycleProvider onLifecycleEnded={handleLifecycleEnded}>
      <PageInner key={gen} />
    </SessionLifecycleProvider>
  );
}

function PageInner() {
  const [view, setView] = useState('home');
  const [chatContext, setChatContext] = useState(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);

  const [homeState, setHomeState] = useState({ streak: 0, points: 0, totalDecisions: 0 });
  const [homeMessage, setHomeMessage] = useState(null);
  const [sestiaLibrary, setSestiaLibrary] = useState(null);
  const [homeError, setHomeError] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [accountEmailFlow, setAccountEmailFlow] = useState(false);
  // Test grubu modu: misafir yok, e-postayla giriş şart ({ emailReady } | null).
  const [signInRequired, setSignInRequired] = useState(null);
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
  const singlePhotoOperationRef = useRef(null);

  // ---- oda taraması akışı ----
  const [roomPhotos, setRoomPhotos] = useState([]); // [{id, file, url, photoId?}] - photoId, sunucuya kalici kaydedilince atanir
  // roomPhotos'un her zaman en güncel hâli. Fotoğraf ekleme → kapsam kontrolü →
  // analiz → kayıt zinciri async olduğu için bu fonksiyonlar, fotoğraflar
  // eklenmeden önceki render'ın (boş) roomPhotos'unu görüyordu: "hepsi
  // kaydedildi mi" kontrolü atlanıyor ve analiz photo_ids_json = [] ile
  // kaydediliyordu (bkz. docs/SESTIA_ODA_TARAMASI_VE_KARAR_DURUMU_DENETIMI.md).
  const roomPhotosRef = useRef([]);
  // The ref is authoritative; every photo mutation publishes the same array.
  const roomPhotoVersionRef = useRef(0);
  const roomCoverageRequestRef = useRef(null);
  const roomUploadsRef = useRef(new Map());
  const roomAnalysisPhotosRef = useRef([]);
  const roomSaveFlowRef = useRef(null);
  const roomCreateOperationRef = useRef(null);
  const roomDetailRequestRef = useRef(null);
  const createRoomOperationRef = useRef(null);
  const galleryUploadRef = useRef(null);
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
  // Oda seçilmeden (Keşif/ana ekran) başlatılan tarama: fotoğraflar ve analiz
  // kullanıcı analizden sonra bir oda seçene/oluşturana kadar hiçbir yere
  // yazılmaz; kararlar ancak bu kayıt başarıyla bitince onaylanabilir.
  const [roomScanNeedsRoom, setRoomScanNeedsRoom] = useState(false);
  const [roomScanSaveError, setRoomScanSaveError] = useState(null);
  const [roomScanSavedRoomName, setRoomScanSavedRoomName] = useState(null);
  const [historyAnalysis, setHistoryAnalysis] = useState(null);
  const roomFilesRef = useRef([]);
  const roomRequestRef = useRef(null);
  const roomSessionRef = useRef(0);
  // Ayni canli tarama oturumunun (ilk analiz + sonraki sohbet turleri) HEP
  // ayni kalici room_analyses satirini guncellemesini saglayan idempotency
  // anahtari — resetRoomScan'de tazelenir (bkz. lib/db.js saveRoomAnalysis).
  const roomAnalysisSessionKeyRef = useRef(null);
  const roomReceiptRef = useRef(null);
  const roomConfirmationRef = useRef(null);
  const roomWriteRef = useRef(null);
  const roomLeaseRef = useRef(null);
  const [roomRecovery, setRoomRecovery] = useState(null);
  const [roomDraftDirty, setRoomDraftDirty] = useState(false);
  // Keep the original uncertain first POST separate from subsequent local choices.
  const roomInitialSnapshotRef = useRef(null);
  const [roomDraftError, setRoomDraftError] = useState(null);
  const [roomLegacyApprovalUnknown, setRoomLegacyApprovalUnknown] = useState(false);
  // Photos already in the room: more than MAX_ROOM_PHOTOS means the user picks
  // which ones this analysis uses ({ roomId, photos, selected: [photoId] }).
  const [roomExistingPick, setRoomExistingPick] = useState(null);
  const [roomExistingRetry, setRoomExistingRetry] = useState(null);
  const roomExistingLoadRef = useRef(null);
  useEffect(() => {
    if (!roomDraftDirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [roomDraftDirty]);

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

  // ---- toparlanmış halini gör ----
  // photos.length===0 icin ayri bir ekran yok: buton tiklaninca mevcut
  // yukleme aksiyonlarina isaret eden kisa bir not gosterilir (bkz.
  // RoomDetailView) — ikinci bir yukleme sistemi icat edilmiyor.
  const [toparlaNotice, setToparlaNotice] = useState(false);
  const [toparlaStatus, setToparlaStatus] = useState('select'); // select | confirm | generating | done | error
  const [toparlaPhotoId, setToparlaPhotoId] = useState(null);
  const [toparlaResult, setToparlaResult] = useState(null);
  const [toparlaError, setToparlaError] = useState(null);
  // Bu akistan cikildiginda (goTo ile herhangi bir yere) gecersiz kilinir —
  // geç kalan bir yanit artik gösterilmekte olmayan bir ekrani güncellemez.
  const toparlaRequestRef = useRef(null);
  // operationKey SADECE acik "Toparlanmış halini oluştur" tikinda uretilir;
  // ayni (oda,fotograf) icin tekrar tiklamalar (cift dokunma, bekleyen
  // istek) ayni anahtari kullanir — yeni bir ucretli cagri asla acmaz.
  const toparlaOperationRef = useRef(null);

  // ---- bana öneri ver ----
  // Fotoğraf yoksa Toparla ile aynı not (toparlaNotice) gösterilir.
  const [suggestionStatus, setSuggestionStatus] = useState('select'); // select | generating | loading | done | error
  const [suggestionPhotoId, setSuggestionPhotoId] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionError, setSuggestionError] = useState(null);
  // goTo bunu temizler: akıştan çıkıldıktan sonra gelen geç bir yanıt
  // artık gösterilmeyen bir ekranı güncellemez. pending, çift dokunmada
  // ikinci bir AI çağrısının başlamasını engeller.
  const suggestionRequestRef = useRef(null);
  // Hata ekranındaki "Tekrar dene" son denenen işlemi (yeni öneri ya da
  // kayıtlı öneriyi açma) tekrarlar.
  const suggestionRetryRef = useRef(null);

  // ---- bir öneriye dokununca: detay, plan, yapılacaklar, görsel ----
  // ideaState: { suggestionId, ideaIndex, status: loading|planning|ready|error, data, error }
  const [ideaState, setIdeaState] = useState(null);
  // Detaydan "Geri" nereye dönsün: öneri ekranından mı, odanın yapılacaklarından mı açıldı.
  const [ideaReturnView, setIdeaReturnView] = useState('room-suggestions');
  const [todoBusy, setTodoBusy] = useState(false);
  // ideaVisual: null | { status: account-gate|confirm|generating|done|error, result?, error? }
  const [ideaVisual, setIdeaVisual] = useState(null);
  // goTo temizler: detaydan çıkıldıktan sonra gelen yanıt ekrana yazılmaz.
  const ideaRequestRef = useRef(null);
  // Ücretli görsel çağrısı için operationKey; yalnızca "Görseli oluştur" ile
  // üretilir, çift dokunma ya da tekrar gönderim ikinci bir ücretli çağrı açmaz.
  const ideaVisualOperationRef = useRef(null);

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
      if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        if (body.error === 'sign_in_required') {
          setSignInRequired({ emailReady: Boolean(body.emailReady) });
          setHomeError(null);
          return;
        }
        // Session V2: no active guest/account session yet — this is the
        // normal state for a brand-new visitor (or right after a confirmed
        // timeout's remount), not a connectivity error. Show the existing
        // guest/account entry experience; no new screen.
        if (body.error === 'session_required') {
          setSignInRequired(null);
          setHomeError(null);
          setHomeState((prev) => ({ ...prev, emailReady: Boolean(body.emailReady) }));
          setShowWelcome(true);
          return;
        }
      }
      if (!res.ok) throw new Error('state_failed');
      const data = await res.json();
      setSignInRequired(null);
      setHomeState(data);
      setHomeMessage(data.homeMessage || null);
      setSestiaLibrary(data.sestiaLibrary || null);
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
        //
        // AYRICA: "onaylanmis misafir" tek basina "tanisma tamamlandi"
        // ANLAMINA GELMEZ. sestia_guest_id_confirmed, bu akista isim/hitap
        // sorusu eklenmeden ONCE de ayni sekilde damgalaniyordu — yani bu
        // bayrak eslesse bile, o kimlik icin hic isim kaydedilmemis olabilir
        // (ör. eski bir test oturumu, ya da isim farkli bir kimlige
        // damgalanmis). Boyle bir "yari tanismis" misafiri sessizce ana
        // ekrana gecirmek yerine — mevcut verisini (oda/karar) HIC
        // silmeden/sifirlamadan — tanisma akisini (sadece hitap sorusunu)
        // tekrar gosteriyoruz. bkz. lib/client.js getUserName.
        let confirmedGuestId = null;
        try {
          confirmedGuestId = localStorage.getItem('sestia_guest_id_confirmed');
        } catch {}
        let skippedName = false;
        try { skippedName = localStorage.getItem('sestia_intro_skipped') === data.identityId; } catch {}
        const hasName = data.identityType === 'guest' && (Boolean(getUserName(data.identityId)) || skippedName);
        const isKnownGuest = data.identityType === 'guest' && confirmedGuestId && confirmedGuestId === data.identityId && hasName;
        if (data.identityType !== 'account' && !isKnownGuest) setShowWelcome(true);
        else { setShowWelcome(false); setView(landingView(data)); }
      }
    } catch {
      setHomeError('Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.');
    } finally {
      setIdentityLoaded(true);
    }
  }

  useEffect(() => { if (currentIdentityId) loadRooms(); }, [currentIdentityId]);

  function openSestiaChat(context) {
    setChatContext(context);
    goTo('chat');
  }

  function goTo(name) {
    if (view === 'room-review' && name !== view && roomDraftDirty &&
        !window.confirm('Kaydedilmemiş taslak seçimlerin var. Kaydetmeden çıkılsın mı?')) return;
    roomDetailRequestRef.current = null;
    toparlaRequestRef.current = null;
    suggestionRequestRef.current = null;
    ideaRequestRef.current = null;
    setRoomCreating(false);
    if ((view === 'scan' || view === 'decision') && name !== view) resetSingleScan();
    // Also cancel a begin request started from room-detail before navigation.
    if (name !== view) resetRoomScan();
    if (name === 'scan') resetSingleScan();
    if (name === 'room-scan') resetRoomScan();
    if (name === 'home') {
      activeRoomRef.current = null;
      refreshHomeState();
      loadRooms();
    }
    if (name === 'inspiration') loadInspiration();
    if (name === 'account') setAccountEmailFlow(false);
    if (name === 'rooms') { activeRoomRef.current = null; loadRooms(); }
    setView(name);
  }

  // Tarayıcının ve telefonun "geri"si uygulamadan çıkmasın (QA-01). Ana ekran
  // dışındaki her ekranda tarih kaydında tek bir koruma kaydı tutulur; geri
  // basıldığında o ekranın kendi "Geri" butonu ne yapıyorsa o yapılır. Ana
  // ekranda (ve ilk karşılaşmada) koruma yoktur: geri, uygulamadan çıkar.
  function handleBrowserBack() {
    if (view === 'decision') return goTo('scan');
    if (view === 'room-detail') return goTo('rooms');
    if (view === 'toparla') return goTo('room-detail');
    if (view === 'room-suggestions') return goTo('room-detail');
    if (view === 'suggestion-idea') return leaveIdea();
    if (view === 'room-analysis') { setHistoryAnalysis(null); setView('room-detail'); return; }
    if (view === 'celebration') return finishCelebration();
    goTo('home');
  }
  const browserBackRef = useRef(null);
  browserBackRef.current = handleBrowserBack;
  const backGuardRef = useRef(false);
  const skipNextPopRef = useRef(false);
  const [backTick, setBackTick] = useState(0);
  useEffect(() => {
    const atRoot = view === 'home' || showWelcome;
    if (!atRoot && !backGuardRef.current) {
      window.history.pushState(null, '');
      backGuardRef.current = true;
    } else if (atRoot && backGuardRef.current) {
      // Uygulama içinden ana ekrana dönüldü: artık gereksiz koruma kaydını geri al.
      backGuardRef.current = false;
      skipNextPopRef.current = true;
      window.history.back();
    }
  }, [view, showWelcome, backTick]);
  useEffect(() => {
    function onPopState() {
      if (skipNextPopRef.current) { skipNextPopRef.current = false; return; }
      if (!backGuardRef.current) return;
      backGuardRef.current = false;
      browserBackRef.current?.();
      // Geri işlemi engellendiyse (ör. kaydedilmemiş taslak onayı) korumayı yeniden kur.
      setBackTick((tick) => tick + 1);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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
    if (createRoomOperationRef.current?.pending) return;
    if (!createRoomOperationRef.current) createRoomOperationRef.current = { operationKey: crypto.randomUUID(), name };
    const operation = createRoomOperationRef.current;
    if (operation.name !== name) { setRoomsError('Önceki isteğin sonucunu almak için aynı oda adıyla tekrar dene.'); return; }
    const request = {};
    roomDetailRequestRef.current = request;
    operation.pending = true;
    setRoomCreating(true); setRoomsError(null);
    try {
      const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationKey: operation.operationKey, name: operation.name }) });
      // 4xx is a definitive rejection before any write; a new name may use a new key.
      if (res.status >= 400 && res.status < 500 && createRoomOperationRef.current === operation) createRoomOperationRef.current = null;
      if (!res.ok) throw new Error('create_room_failed');
      const room = await res.json();
      // The outcome is known even if the user left this screen meanwhile.
      if (createRoomOperationRef.current === operation) createRoomOperationRef.current = null;
      setRooms(list => [room, ...list.filter(r => r.id !== room.id)]);
      if (roomDetailRequestRef.current !== request) return;
      setRoomCreating(false);
      await openRoom(room.id);
    } catch {
      if (roomDetailRequestRef.current === request) setRoomsError(createRoomOperationRef.current === operation
        ? 'Oda oluşturma sonucu alınamadı. Aynı adla tekrar deneyebilirsin.'
        : 'Oda oluşturulamadı. Tekrar dener misin?');
    } finally {
      operation.pending = false;
      if (roomDetailRequestRef.current === request) setRoomCreating(false);
    }
  }

  async function openRoom(id) {
    resetRoomScan();
    if (view === 'scan' || view === 'decision') resetSingleScan();
    const request = {};
    roomDetailRequestRef.current = request;
    setRoomDetail(null);
    setRoomDetailLoading(true); setRoomDetailError(null); setRoomPhotoUploading(false);
    setView('room-detail');
    try {
      const res = await fetch('/api/rooms/' + id);
      if (!res.ok) throw new Error('room_failed');
      const detail = await res.json();
      if (roomDetailRequestRef.current === request) setRoomDetail(detail);
    } catch {
      if (roomDetailRequestRef.current === request) setRoomDetailError('Oda yüklenemedi. Tekrar dener misin?');
    } finally {
      if (roomDetailRequestRef.current === request) setRoomDetailLoading(false);
    }
  }


  async function handleRoomPhotoUpload(e) {
    const file = e?.target?.files?.[0];
    if (e?.target) e.target.value = '';
    if (!roomDetail) return;
    if (galleryUploadRef.current?.pending) return;
    if (file) galleryUploadRef.current = { roomId: roomDetail.id, operationKey: crypto.randomUUID(), file };
    const operation = galleryUploadRef.current;
    if (!operation || operation.roomId !== roomDetail.id) return;
    const context = roomContext();
    const request = roomDetailRequestRef.current;
    operation.pending = true;
    setRoomPhotoUploading(true); setRoomDetailError(null);
    try {
      if (!operation.compressed) operation.compressed = await compressImage(operation.file).catch(() => operation.file);
      if (!isRoomContext(context) || roomDetailRequestRef.current !== request) return;
      const fd = new FormData();
      fd.append('photo', operation.compressed, 'photo.jpg'); fd.append('operationKey', operation.operationKey);
      const res = await fetch('/api/rooms/' + operation.roomId + '/photos', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('upload_failed');
      // Saved: never offer this operation as a retry, even after navigation.
      if (galleryUploadRef.current === operation) galleryUploadRef.current = null;
      if (!isRoomContext(context) || roomDetailRequestRef.current !== request) return;
      await openRoom(operation.roomId);
    } catch {
      if (isRoomContext(context) && roomDetailRequestRef.current === request) setRoomDetailError('Fotoğraf yüklenemedi. Aynı yüklemeyi tekrar deneyebilirsin.');
    } finally {
      operation.pending = false;
      if (isRoomContext(context) && roomDetailRequestRef.current === request) setRoomPhotoUploading(false);
    }
  }


  function startScanInRoom() {
    if (!roomDetail) return;
    activeRoomRef.current = { id: roomDetail.id, name: roomDetail.name };
    goTo('scan');
  }

  async function reserveRoomScan(roomId, sessionKey) {
    const context = roomContext();
    if (roomLeaseRef.current?.sessionKey === sessionKey && roomLeaseRef.current.roomId === roomId) return true;
    const current = await roomScanClient.read(fetch, roomId);
    if (!isRoomContext(context) || roomAnalysisSessionKeyRef.current !== sessionKey) return false;
    // No analysis yet: possibly another tab still adding photos, so ask, but
    // never point to a "Taramaya Devam Et" option that cannot exist here.
    const message = current.analysisId || current.orphanToken
      ? 'Bu odada açık bir çalışma var. Yeni tarama başlatırsan önceki çalışma kapatılır, analiz ve sohbet geçmişte korunur. Yeni tarama başlatılsın mı? Devam etmek için İptal’e basıp “Taramaya Devam Et” seçeneğini kullan.'
      : 'Bu odada henüz analizi olmayan bir tarama başlatılmış (başka bir sekmede açık olabilir). Yeni tarama başlatılsın mı? Kayıtlı analizlerin ve kararların etkilenmez.';
    if (current.active && current.sessionKey !== sessionKey && !window.confirm(message)) return false;
    const lease = await roomScanClient.write(fetch, roomId, 'POST', {
      action: 'begin', sessionKey, expectedGeneration: current.generation, replace: current.active,
    });
    if (!isRoomContext(context) || roomAnalysisSessionKeyRef.current !== sessionKey) {
      // The user left while begin was in flight; free the reservation it made.
      roomScanClient.write(fetch, roomId, 'DELETE', { action: 'release', sessionKey }).catch(() => {});
      return false;
    }
    roomLeaseRef.current = { ...lease, roomId };
    return true;
  }

  async function startRoomScanInRoom() {
    if (!roomDetail) return;
    const room = { id: roomDetail.id, name: roomDetail.name };
    const existing = roomDetail.photos || [];
    roomDetailRequestRef.current = null;
    resetRoomScan();
    const key = roomAnalysisSessionKeyRef.current;
    const context = roomContext();
    try {
      if (!(await reserveRoomScan(room.id, key))) return;
      activeRoomRef.current = room;
      setRoomScanNeedsRoom(false);
      setView('room-scan');
      // The room's photos are the scan input; only an empty room starts at
      // the picker. Above the limit the user chooses, nothing is guessed.
      if (existing.length > MAX_ROOM_PHOTOS) setRoomExistingPick({ roomId: room.id, photos: existing, selected: [] });
      else if (existing.length) loadExistingRoomPhotos(existing);
    } catch (error) { if (isRoomContext(context)) setRoomDetailError(roomScanClient.errorMessage(error)); }
  }

  // Existing room photos enter the same coverage → analysis pipeline as new
  // ones: bytes come from the ownership-checked photo route and the photoId is
  // kept, so nothing is uploaded again. All or nothing — a photo that cannot
  // be loaded never lets a smaller set be analyzed.
  async function loadExistingRoomPhotos(photos) {
    const context = roomContext();
    const version = roomPhotoVersionRef.current;
    if (!context.roomId || !photos.length || photos.length > MAX_ROOM_PHOTOS || roomExistingLoadRef.current ||
        roomRequestRef.current || roomPhotosRef.current.length) return;
    const controller = new AbortController();
    roomExistingLoadRef.current = controller;
    const current = () => isRoomContext(context) && version === roomPhotoVersionRef.current && roomExistingLoadRef.current === controller;
    setRoomExistingPick(null); setRoomExistingRetry(null); setRoomError(null);
    setRoomCoverageChecking(true);
    try {
      const entries = await Promise.all(photos.map(async photo => {
        const url = '/api/rooms/' + context.roomId + '/photos/' + photo.id;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error('existing_photo_failed');
        const blob = await res.blob();
        const type = blob.type || res.headers.get('Content-Type') || 'image/jpeg';
        return { id: 'room-photo-' + photo.id, photoId: photo.id, url, existing: true, file: new File([blob], 'photo.jpg', { type }) };
      }));
      if (!current()) return;
      updateRoomPhotos(() => entries);
      checkRoomPhotoCoverage(entries);
    } catch {
      if (!current()) return;
      setRoomCoverageChecking(false);
      setRoomExistingRetry(photos);
      setRoomError('Odadaki fotoğraflar açılamadı. Tekrar deneyebilir ya da yeni fotoğraf ekleyebilirsin.');
    } finally {
      if (roomExistingLoadRef.current === controller) roomExistingLoadRef.current = null;
    }
  }

  function toggleExistingRoomPhoto(photoId) {
    setRoomExistingPick(pick => {
      if (!pick) return pick;
      const selected = pick.selected.includes(photoId) ? pick.selected.filter(id => id !== photoId)
        : pick.selected.length < MAX_ROOM_PHOTOS ? [...pick.selected, photoId] : pick.selected;
      return { ...pick, selected };
    });
  }

  function analyzeSelectedExistingRoomPhotos() {
    const pick = roomExistingPick;
    if (!pick?.selected.length) return;
    // Room order, not tap order.
    loadExistingRoomPhotos(pick.photos.filter(p => pick.selected.includes(p.id)));
  }

  async function recoverRoomWrite(roomId, key, error, context = roomContext()) {
    if (!isRoomContext(context) || roomAnalysisSessionKeyRef.current !== key) return;
    setRoomError(roomScanClient.errorMessage(error));
    try {
      const snapshot = await roomScanClient.read(fetch, roomId, key);
      if (isRoomContext(context) && roomAnalysisSessionKeyRef.current === key) setRoomRecovery({ ...snapshot, roomId, requestedKey: key });
    } catch { /* The original error stays visible; retry still targets the same session. */ }
  }

  function loadRecoveredRoomScan() {
    const saved = roomRecovery?.analysis;
    if (!saved || saved.closed || roomRecovery.sessionKey !== saved.sessionKey) {
      if ((roomDraftDirty || (!roomScanSaved && roomItems.length > 0)) &&
          !window.confirm('Kaydedilmemiş taslak seçimlerin var. Kaydetmeden çıkılsın mı?')) return;
      openRoom(roomRecovery.roomId);
      return;
    }
    if (!window.confirm('Sunucuda kayıtlı sürüm açılsın mı? Bu ekrandaki kaydedilmemiş değişiklikler yerine kayıtlı seçimler ve sohbet gösterilecek.')) return;
    roomReceiptRef.current = { ...saved, roomId: roomRecovery.roomId };
    roomInitialSnapshotRef.current = null;
    const samePhotos = roomAnalysisPhotosRef.current.filter(p => saved.photoIds?.includes(p.photoId));
    const canKeepFiles = samePhotos.length === saved.photoIds?.length && samePhotos.every(p => p.file);
    roomAnalysisPhotosRef.current = canKeepFiles ? samePhotos : (saved.photoIds || []).map(id => ({ id, photoId: id, url: '/api/rooms/' + roomRecovery.roomId + '/photos/' + id }));
    roomFilesRef.current = canKeepFiles ? samePhotos.map(p => p.file) : [];
    updateRoomPhotos(() => roomAnalysisPhotosRef.current);
    setRoomItems(saved.items);
    setRoomMessages(saved.messages);
    setRoomDraftDirty(false);
    setRoomLegacyApprovalUnknown(saved.legacyApprovalUnknown);
    setRoomScanSaved(true);
    setRoomScanNeedsRoom(false);
    setRoomDraftError(null);
    setRoomError(null);
    setRoomRecovery(null);
  }

  async function closeRoomScan() {
    const context = roomContext();
    const roomId = activeRoomRef.current?.id;
    const key = roomAnalysisSessionKeyRef.current;
    if (!roomId || roomWriteRef.current || roomSaveFlowRef.current || roomRequestRef.current || roomConfirming || roomChatBusy) return;
    if (!window.confirm('Tarama karar oluşturmadan kapatılsın mı? Kayıtlı analiz ve sohbet geçmişte korunur; kaydedilmemiş seçimler saklanmaz.')) return;
    roomWriteRef.current = key || 'legacy-close';
    setRoomScanSaving(true);
    try {
      let target = roomReceiptRef.current;
      if (!target) {
        const current = await roomScanClient.read(fetch, roomId);
        // Only the orphan shown when this view opened may be closed.
        if (!isRoomContext(context) || !roomLeaseRef.current?.orphanToken || current.orphanToken !== roomLeaseRef.current.orphanToken) throw new Error('session_conflict');
        target = { orphanToken: current.orphanToken, expectedGeneration: current.generation };
      }
      await roomScanClient.write(fetch, roomId, 'DELETE', target);
      if (isRoomContext(context)) { resetRoomScan(); openRoom(roomId); }
    } catch (error) { await recoverRoomWrite(roomId, key, error, context); }
    finally { if (isRoomContext(context)) { roomWriteRef.current = null; setRoomScanSaving(false); } }
  }

  // Bir odanin icinden baslatilan taramalarda kullanilan fotograflari da
  // odanin kalici galerisine kaydeder — sessizce (en iyi caba), kullanici
  // akisini bloklamaz/bekletmez. (Tek-esya akisi icin: bu tek fotografin
  // kaderi zaten karar onayina bagli, ayrica erken kaydetme gerekmiyor.)
  function persistPhotosToActiveRoom(files, roomId, operationKey) {
    if (!roomId) return;
    files.forEach((file, index) => {
      const fd = new FormData();
      fd.append('photo', file, 'photo.jpg');
      fd.append('operationKey', operationKey + '-' + index);
      fetch('/api/rooms/' + roomId + '/photos', { method: 'POST', body: fd }).catch(() => {});
    });
  }


  function roomContext() {
    return { session: roomSessionRef.current, sessionKey: roomAnalysisSessionKeyRef.current, roomId: activeRoomRef.current?.id || null };
  }

  function isRoomContext(context) {
    return context.session === roomSessionRef.current && context.sessionKey === roomAnalysisSessionKeyRef.current;
  }

  function updateRoomPhotos(change) {
    const next = change(roomPhotosRef.current);
    roomPhotosRef.current = next;
    setRoomPhotos(next);
    return next;
  }

  function invalidateRoomCoverage() {
    roomPhotoVersionRef.current += 1;
    roomCoverageRequestRef.current?.abort();
    roomCoverageRequestRef.current = null;
    setRoomCoverageChecking(false);
    setRoomCoverageResult(null);
  }

  async function persistNewRoomScanPhotos(entries, context = roomContext()) {
    if (!context.roomId || !isRoomContext(context)) return { ok: false, photoIds: [] };
    const uploads = roomUploadsRef.current;
    const results = await Promise.all(entries.map(async entry => {
      if (!isRoomContext(context) || !roomPhotosRef.current.some(p => p.id === entry.id) || !entry.file) return null;
      const current = roomPhotosRef.current.find(p => p.id === entry.id);
      if (Number.isInteger(current.photoId)) return current.photoId;
      if (uploads.has(entry.id)) return uploads.get(entry.id);
      const pending = (async () => {
        updateRoomPhotos(list => list.map(p => p.id === entry.id ? { ...p, uploading: true, uploadFailed: false } : p));
        try {
          const fd = new FormData();
          fd.append('photo', entry.file, 'photo.jpg');
          fd.append('operationKey', entry.id);
          fd.append('sessionKey', context.sessionKey);
          const res = await fetch('/api/rooms/' + context.roomId + '/photos', { method: 'POST', body: fd });
          if (!res.ok) throw new Error('persist_failed');
          const saved = await res.json();
          if (!isRoomContext(context)) return null;
          updateRoomPhotos(list => list.map(p => p.id === entry.id ? { ...p, photoId: saved.id, uploading: false, uploadFailed: false } : p));
          return saved.id;
        } catch {
          if (isRoomContext(context)) {
            updateRoomPhotos(list => list.map(p => p.id === entry.id ? { ...p, uploading: false, uploadFailed: true } : p));
            if (roomPhotosRef.current.some(p => p.id === entry.id)) setRoomError('Bazı fotoğraflar odaya kaydedilemedi. Tekrar deneyebilirsin.');
          }
          return null;
        } finally { uploads.delete(entry.id); }
      })();
      uploads.set(entry.id, pending);
      return pending;
    }));
    return { ok: isRoomContext(context) && results.every(Number.isInteger), photoIds: results };
  }


  async function retryFailedRoomPhotos() {
    const context = roomContext();
    const version = roomPhotoVersionRef.current;
    const photos = roomPhotosRef.current;
    const result = await persistNewRoomScanPhotos(photos.filter(p => p.uploadFailed), context);
    if (result.ok && isRoomContext(context) && version === roomPhotoVersionRef.current) {
      setRoomError(null);
      checkRoomPhotoCoverage(roomPhotosRef.current);
    }
  }


  async function persistRoomScanIfActive(items, messages, photoIdsOverride, context = roomContext(), preserveDraft = false) {
    const roomId = context.roomId;
    if (!roomId || !isRoomContext(context)) return false;
    const sessionKey = context.sessionKey;
    if (roomWriteRef.current === sessionKey) return false;
    roomWriteRef.current = sessionKey;
    const revision = roomReceiptRef.current?.sessionKey === sessionKey ? roomReceiptRef.current.revision : 0;
    setRoomScanSaving(true);
    setRoomScanSaved(false);
    try {
      const photoIds = photoIdsOverride
        || roomAnalysisPhotosRef.current.map(p => p.photoId);
      if (!roomReceiptRef.current) roomInitialSnapshotRef.current = { items, messages, photoIds, context };
      const receipt = await roomScanClient.write(fetch, roomId, 'POST', { items, messages, photoIds, sessionKey, revision });
      if (!isRoomContext(context)) return false;
      roomReceiptRef.current = { ...receipt, roomId };
      roomInitialSnapshotRef.current = null;
      setRoomRecovery(null);
      setRoomDraftDirty(preserveDraft);
      setRoomDraftError(null);
      setRoomScanSaved(!preserveDraft);
      setRoomError(null);
      return true;
    } catch (error) {
      if (!isRoomContext(context)) return false;
      setRoomScanSaved(false);
      await recoverRoomWrite(roomId, sessionKey, error, context);
      return false;
    } finally {
      if (isRoomContext(context) && roomWriteRef.current === sessionKey) roomWriteRef.current = null;
      if (isRoomContext(context)) setRoomScanSaving(false);
    }
  }

  // Oda seçilmeden başlatılan taramayı, analizden sonra kullanıcının seçtiği
  // (roomId) ya da adını verdiği yeni (name) odaya kaydeder: oda → fotoğraflar
  // → analiz, bu sırayla. Adımlardan biri başarısız olursa kayıt tamamlanmış
  // sayılmaz ve onay açılmaz. Tekrar denemek güvenli: zaten kaydedilmiş
  // fotoğraflar yeniden yüklenmez, analiz aynı sessionKey ile aynı satırı günceller.
  async function saveRoomScanToRoom({ roomId, name }) {
    if (roomSaveFlowRef.current || roomWriteRef.current || roomRequestRef.current || roomConfirming) return;
    const context = roomContext();
    const token = {};
    roomSaveFlowRef.current = token;
    const photos = roomAnalysisPhotosRef.current.map(p => ({ ...p }));
    const items = roomItems, messages = roomMessages;
    setRoomScanSaving(true); setRoomScanSaveError(null);
    try {
      let room = activeRoomRef.current?.id ? { ...activeRoomRef.current } : roomId ? rooms.find(r => r.id === roomId) : null;
      if (!room) {
        if (!roomCreateOperationRef.current) roomCreateOperationRef.current = { operationKey: crypto.randomUUID(), name };
        const operation = roomCreateOperationRef.current;
        if (operation.name !== name) throw new Error('operation_content_conflict');
        const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operation) });
        if (res.status >= 400 && res.status < 500 && roomCreateOperationRef.current === operation) roomCreateOperationRef.current = null;
        if (!res.ok) throw new Error('create_room_failed');
        room = await res.json();
        if (!isRoomContext(context)) return;
        setRooms(list => [{ ...room, decisionCount: 0, coverPhotoId: null }, ...list.filter(r => r.id !== room.id)]);
      }
      if (!isRoomContext(context)) return;
      // From now on this operation always uses this captured room, never a future ref.
      const target = { ...context, roomId: room.id };
      if (!(await reserveRoomScan(room.id, context.sessionKey)) || !isRoomContext(context)) return;
      activeRoomRef.current = { id: room.id, name: room.name };
      const upload = await persistNewRoomScanPhotos(photos, target);
      if (!isRoomContext(context)) return;
      if (!upload.ok) throw new Error('photo_save_failed');
      roomAnalysisPhotosRef.current = photos.map((p, i) => ({ ...p, photoId: upload.photoIds[i] }));
      const saved = roomInitialSnapshotRef.current && !roomReceiptRef.current
        ? await persistRoomDraft()
        : await persistRoomScanIfActive(items, messages, upload.photoIds, target);
      if (!isRoomContext(context)) return;
      if (!saved) { setRoomScanSaveError('Analiz sonucu kesinleşmedi. Sunucudaki kaydı kontrol edebilir veya aynı işlemi tekrar deneyebilirsin.'); return; }
      setRoomScanSavedRoomName(room.name); setRoomScanNeedsRoom(false);
    } catch (error) {
      if (isRoomContext(context)) setRoomScanSaveError(error.message === 'operation_content_conflict'
        ? 'Önceki oda oluşturma sonucunu henüz bilmiyoruz. Aynı oda adıyla tekrar dene; ikinci oda oluşturulmayacak.'
        : 'Kaydetme tamamlanamadı. Tekrar Dene aynı oda ve fotoğraf işlemlerini kullanır.');
    } finally {
      if (isRoomContext(context) && roomSaveFlowRef.current === token) { roomSaveFlowRef.current = null; setRoomScanSaving(false); }
    }
  }


  function resumeRoomScan() {
    if (!roomDetail?.scan) return;
    resetRoomScan();
    activeRoomRef.current = { id: roomDetail.id, name: roomDetail.name };
    roomAnalysisSessionKeyRef.current = roomDetail.scan.sessionKey;
    roomLeaseRef.current = { ...roomDetail.scanStatus, roomId: roomDetail.id };
    setRoomRecovery(null);
    roomReceiptRef.current = roomDetail.scan.analysisId ? {
      analysisId: roomDetail.scan.analysisId, revision: roomDetail.scan.revision,
      sessionKey: roomDetail.scan.sessionKey, roomId: roomDetail.id,
    } : null;
    setRoomDraftDirty(false);
    setRoomLegacyApprovalUnknown(!!roomDetail.scan.legacyApprovalUnknown);
    setRoomDraftError(null);
    roomFilesRef.current = [];
    const linked = new Set(roomDetail.scan.photoIds || []);
    const photos = roomDetail.photos.filter(p => linked.has(p.id)).map(p => ({ id: p.id, photoId: p.id, url: '/api/rooms/' + roomDetail.id + '/photos/' + p.id }));
    updateRoomPhotos(() => photos);
    roomAnalysisPhotosRef.current = photos;
    setRoomItems(roomDetail.scan.items);
    setRoomMessages(roomDetail.scan.messages);
    setRoomAnalyzing(false);
    setRoomError(null);
    setRoomScanSaved(!!roomDetail.scan.analysisId);
    setRoomScanSaving(false);
    setRoomScanNeedsRoom(false);
    setRoomScanSaveError(null);
    setRoomScanSavedRoomName(null);
    setView('room-review');
  }

  // Paylaşılan account-gate çıkışı: hem Room Detail Toparla'nın hem
  // ConversationPanel'in "E-posta ile devam et" aksiyonu buraya çıkar.
  // Mevcut, tek email/hesap akışını (WelcomeView + accountEmailFlow) yeniden
  // kullanır — ikinci bir giriş/kayıt uygulaması icat edilmez. Kod
  // doğrulaması tamamlandığında zaten sert bir sayfa yenilemesiyle biter
  // (bkz. WelcomeView.submitCode) — bu yüzden burada Toparla akışının
  // durumunu "kurtarmaya" çalışmıyoruz; bu, kabul edilmiş bir V1 sınırı.
  function requireAccountFlow() {
    goTo('account');
    setAccountEmailFlow(true);
  }

  // "Odaya birlikte bakalım"dan ayrı, tamamen bağımsız bir akış: mevcut
  // fotoğraflardan biri, aynı oda toparlanmış haliyle görselleştirilir.
  // Fotoğraf yoksa yeni bir yükleme ekranı icat etmek yerine mevcut
  // yükleme aksiyonlarına işaret eden bir not gösterilir (RoomDetailView).
  function startToparlaInRoom() {
    if (!roomDetail) return;
    if (!roomDetail.photos.length) { setToparlaNotice(true); return; }
    setToparlaNotice(false);
    const request = {};
    toparlaRequestRef.current = request;
    toparlaOperationRef.current = null;
    setToparlaResult(null);
    setToparlaError(null);
    activeRoomRef.current = { id: roomDetail.id, name: roomDetail.name };
    // Toparla is account-only regardless of entry point (server-enforced in
    // both /api/rooms/[id]/toparla and /api/chat/toparla — this is UX only).
    // A guest still sees the real capability and reaches an account gate
    // instead of source selection; no photo is chosen, no operation key is
    // minted, nothing paid is even reachable from this state.
    if (identityType !== 'account') {
      setToparlaStatus('account-gate');
      setView('toparla');
      return;
    }
    const single = roomDetail.photos.length === 1;
    setToparlaPhotoId(single ? roomDetail.photos[0].id : null);
    setToparlaStatus(single ? 'confirm' : 'select');
    // setView directly, not goTo: goTo unconditionally clears
    // toparlaRequestRef (by design, so leaving the flow invalidates it) —
    // going through it here would erase the request we just armed above.
    setView('toparla');
  }

  // Kullanıcı birden fazla fotoğraf arasından TEK birini açıkça seçer —
  // hiçbir zaman sessizce/otomatik seçim yapılmaz.
  function selectToparlaPhoto(photoId) {
    if (toparlaRequestRef.current) setToparlaPhotoId(photoId);
    setToparlaStatus('confirm');
  }

  // Tek ücretli çağrı, SADECE "Toparlanmış halini oluştur" tıklamasından
  // gelir. Aynı (oda, fotoğraf) için bekleyen bir istek varsa (çift dokunma)
  // ikinci bir çağrı hiç başlamaz; operationKey ise sunucu tarafında da aynı
  // isteğin ikinci bir ücretli çağrı açmasını engeller (bkz. lib/toparlaStore.cjs).
  async function submitToparla() {
    if (!roomDetail || !toparlaPhotoId) return;
    const request = toparlaRequestRef.current;
    if (!request) return;
    if (toparlaOperationRef.current?.pending) return;
    if (!toparlaOperationRef.current || toparlaOperationRef.current.roomId !== roomDetail.id || toparlaOperationRef.current.photoId !== toparlaPhotoId) {
      toparlaOperationRef.current = { operationKey: crypto.randomUUID(), roomId: roomDetail.id, photoId: toparlaPhotoId };
    }
    const operation = toparlaOperationRef.current;
    operation.pending = true;
    setToparlaStatus('generating');
    setToparlaError(null);
    try {
      const res = await fetch(`/api/rooms/${roomDetail.id}/toparla`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: toparlaPhotoId, operationKey: operation.operationKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (toparlaRequestRef.current !== request) return; // bu akıştan ayrılındı
      if (!res.ok) {
        // Kesin bir 4xx reddi: bu operationKey'i bir daha sunma, yeni bir
        // deneme yeni bir anahtar üretsin.
        if (res.status >= 400 && res.status < 500) toparlaOperationRef.current = null;
        throw new Error(body.error || 'toparla_failed');
      }
      if (body.status === 'failed') {
        toparlaOperationRef.current = null;
        setToparlaError('Görsel oluşturulamadı. Tekrar dener misin?');
        setToparlaStatus('error');
        return;
      }
      setToparlaResult(body);
      setToparlaStatus('done');
    } catch {
      if (toparlaRequestRef.current === request) {
        setToparlaError('Görsel oluşturulamadı. Tekrar dener misin?');
        setToparlaStatus('error');
      }
    } finally {
      operation.pending = false;
    }
  }

  // Açık bir kullanıcı eylemiyle yeni bir deneme başlatır — otomatik tekrar
  // deneme yok, her zaman yeni bir operationKey (yeni bir ücretli çağrı hakkı).
  function retryToparla() {
    toparlaOperationRef.current = null;
    setToparlaError(null);
    setToparlaStatus('confirm');
  }

  // "Bana öneri ver": tek fotoğrafta doğrudan başlar; birden fazlaysa kullanıcı
  // birini açıkça seçer (sessiz/otomatik seçim yok). Fotoğraf yoksa
  // Toparla'daki aynı not gösterilir.
  function startSuggestionsInRoom() {
    if (!roomDetail) return;
    if (!roomDetail.photos.length) { setToparlaNotice(true); return; }
    setToparlaNotice(false);
    activeRoomRef.current = { id: roomDetail.id, name: roomDetail.name };
    setSuggestion(null);
    setSuggestionError(null);
    // setView, goTo değil: goTo suggestionRequestRef'i temizler.
    setView('room-suggestions');
    if (roomDetail.photos.length === 1) { submitSuggestion(roomDetail.photos[0].id); return; }
    suggestionRequestRef.current = null;
    setSuggestionPhotoId(null);
    setSuggestionStatus('select');
  }

  // Tek AI çağrısı, yalnızca açık bir dokunuştan. Başarılı sonuç odanın
  // "Geçmiş Öneriler" listesine de eklenir (oda yeniden yüklenmeden).
  async function submitSuggestion(photoId) {
    if (!roomDetail || suggestionRequestRef.current?.pending) return;
    const request = { pending: true };
    suggestionRequestRef.current = request;
    suggestionRetryRef.current = () => submitSuggestion(photoId);
    const roomId = roomDetail.id;
    setSuggestionPhotoId(photoId);
    setSuggestion(null);
    setSuggestionError(null);
    setSuggestionStatus('generating');
    try {
      const res = await fetch(`/api/rooms/${roomId}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      });
      const body = await res.json().catch(() => ({}));
      if (suggestionRequestRef.current !== request) return; // bu akıştan ayrılındı
      if (!res.ok) throw new Error(body.error || 'suggestion_failed');
      setSuggestion(body);
      setSuggestionStatus('done');
      const { messages: _messages, ...saved } = body;
      setRoomDetail((prev) => (prev && prev.id === roomId ? { ...prev, suggestions: [saved, ...(prev.suggestions || [])] } : prev));
    } catch (err) {
      if (suggestionRequestRef.current === request) {
        setSuggestionError(err.message === 'photo_too_large'
          ? 'Bu fotoğraf çok büyük. Daha küçük bir fotoğraf ekleyip tekrar dener misin?'
          : 'Öneriler hazırlanamadı. Tekrar dener misin?');
        setSuggestionStatus('error');
      }
    } finally {
      request.pending = false;
    }
  }

  // Kayıtlı bir öneriyi, sohbetiyle birlikte yeniden açar — yeni AI çağrısı yok.
  async function openSavedSuggestion(saved) {
    if (!roomDetail) return;
    const request = {};
    suggestionRequestRef.current = request;
    suggestionRetryRef.current = () => openSavedSuggestion(saved);
    const roomId = roomDetail.id;
    activeRoomRef.current = { id: roomDetail.id, name: roomDetail.name };
    setSuggestion(null);
    setSuggestionError(null);
    setSuggestionPhotoId(saved.sourcePhotoId);
    setSuggestionStatus('loading');
    setView('room-suggestions');
    try {
      const res = await fetch(`/api/rooms/${roomId}/suggestions/${saved.id}`);
      if (!res.ok) throw new Error('suggestion_load_failed');
      const body = await res.json();
      if (suggestionRequestRef.current !== request) return;
      setSuggestion(body);
      setSuggestionStatus('done');
    } catch {
      if (suggestionRequestRef.current === request) {
        setSuggestionError('Öneri açılamadı. Tekrar dener misin?');
        setSuggestionStatus('error');
      }
    }
  }

  // Bir öneriye dokunuldu: kayıtlı detay hemen açılır; plan yoksa bir kez
  // oluşturulur ve kaydedilir (sonraki açılışlarda AI çağrısı yok).
  async function openIdea(suggestionId, ideaIndex, returnView) {
    if (!roomDetail) return;
    const request = {};
    ideaRequestRef.current = request;
    ideaVisualOperationRef.current = null;
    const roomId = roomDetail.id;
    setIdeaReturnView(returnView);
    setIdeaVisual(null);
    setIdeaState({ suggestionId, ideaIndex, status: 'loading', data: null, error: null });
    setView('suggestion-idea');
    const base = `/api/rooms/${roomId}/suggestions/${suggestionId}/ideas/${ideaIndex}`;
    try {
      let res = await fetch(base);
      let body = await res.json().catch(() => ({}));
      if (ideaRequestRef.current !== request) return;
      if (!res.ok) throw new Error(body.error || 'idea_failed');
      if (!body.plan) {
        setIdeaState({ suggestionId, ideaIndex, status: 'planning', data: body, error: null });
        res = await fetch(base, { method: 'POST' });
        const planned = await res.json().catch(() => ({}));
        if (ideaRequestRef.current !== request) return;
        if (!res.ok) {
          setIdeaState({ suggestionId, ideaIndex, status: 'error', data: body,
            error: planned.error === 'photo_too_large' ? 'Bu fotoğraf çok büyük. Daha küçük bir fotoğrafla tekrar dener misin?' : 'Adımlar hazırlanamadı. Tekrar dener misin?' });
          return;
        }
        body = planned;
      }
      setIdeaState({ suggestionId, ideaIndex, status: 'ready', data: body, error: null });
    } catch {
      if (ideaRequestRef.current === request) {
        setIdeaState((prev) => ({ ...(prev || { suggestionId, ideaIndex }), status: 'error', error: 'Öneri açılamadı. Tekrar dener misin?' }));
      }
    }
  }

  function leaveIdea() {
    ideaRequestRef.current = null;
    // Öneri ekranı hâlâ aynı öneriyi tutuyorsa ona dön; yoksa odaya.
    if (ideaReturnView === 'room-suggestions' && suggestion && suggestion.id === ideaState?.suggestionId) setView('room-suggestions');
    else goTo('room-detail');
  }

  async function addIdeaTodo() {
    if (!roomDetail || !ideaState?.data || todoBusy) return;
    const { suggestionId, ideaIndex } = ideaState;
    const roomId = roomDetail.id;
    setTodoBusy(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/suggestions/${suggestionId}/ideas/${ideaIndex}/todo`, { method: 'POST' });
      if (!res.ok) throw new Error('todo_failed');
      const todo = await res.json();
      setIdeaState((prev) => (prev && prev.suggestionId === suggestionId && prev.ideaIndex === ideaIndex && prev.data
        ? { ...prev, data: { ...prev.data, todo } } : prev));
      setRoomDetail((prev) => (prev && prev.id === roomId
        ? { ...prev, todos: [...(prev.todos || []).filter((t) => t.id !== todo.id), todo] } : prev));
    } catch {
      setIdeaState((prev) => (prev ? { ...prev, todoError: 'Yapılacaklara eklenemedi. Tekrar dener misin?' } : prev));
    } finally {
      setTodoBusy(false);
    }
  }

  async function toggleTodo(todo) {
    if (!roomDetail) return;
    const roomId = roomDetail.id;
    const res = await fetch(`/api/rooms/${roomId}/todos/${todo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: !todo.done }),
    }).catch(() => null);
    if (!res?.ok) { setRoomDetailError('Yapılacak güncellenemedi. Tekrar dener misin?'); return; }
    const updated = await res.json();
    setRoomDetail((prev) => (prev && prev.id === roomId ? { ...prev, todos: (prev.todos || []).map((t) => (t.id === updated.id ? updated : t)) } : prev));
  }

  async function removeTodo(todo) {
    if (!roomDetail) return;
    const roomId = roomDetail.id;
    const res = await fetch(`/api/rooms/${roomId}/todos/${todo.id}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) { setRoomDetailError('Yapılacak kaldırılamadı. Tekrar dener misin?'); return; }
    setRoomDetail((prev) => (prev && prev.id === roomId ? { ...prev, todos: (prev.todos || []).filter((t) => t.id !== todo.id) } : prev));
  }

  // "Nasıl görünür?" tıklaması hiçbir ücretli çağrı yapmaz: misafire giriş
  // kapısını, hesaba onay kartını açar. Sunucu da hesabı ayrıca zorunlu tutar.
  function startIdeaVisual() {
    ideaVisualOperationRef.current = null;
    setIdeaVisual({ status: identityType === 'account' ? 'confirm' : 'account-gate' });
  }

  // Tek ücretli çağrı, yalnızca "Görseli oluştur" dokunuşundan.
  async function confirmIdeaVisual() {
    if (!roomDetail || !ideaState?.data) return;
    const { suggestionId, ideaIndex } = ideaState;
    const request = ideaRequestRef.current;
    if (!ideaVisualOperationRef.current || ideaVisualOperationRef.current.suggestionId !== suggestionId || ideaVisualOperationRef.current.ideaIndex !== ideaIndex) {
      ideaVisualOperationRef.current = { operationKey: crypto.randomUUID(), suggestionId, ideaIndex };
    }
    const operation = ideaVisualOperationRef.current;
    if (operation.pending) return;
    operation.pending = true;
    setIdeaVisual({ status: 'generating' });
    try {
      const res = await fetch(`/api/rooms/${roomDetail.id}/suggestions/${suggestionId}/ideas/${ideaIndex}/visual`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operationKey: operation.operationKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (ideaRequestRef.current !== request) return; // detaydan çıkıldı
      if (!res.ok || body.status === 'failed') {
        // Kesin bir ret: bu anahtar bir daha kullanılmaz, yeni deneme yeni anahtar alır.
        if (!res.ok && res.status >= 400 && res.status < 500 && body.error !== 'already_in_progress') ideaVisualOperationRef.current = null;
        if (body.status === 'failed') ideaVisualOperationRef.current = null;
        setIdeaVisual({ status: 'error', error: 'Görsel oluşturulamadı. Tekrar dener misin?' });
        return;
      }
      setIdeaVisual({ status: 'done', result: body });
      setIdeaState((prev) => (prev && prev.data ? { ...prev, data: { ...prev.data, visual: body } } : prev));
    } catch {
      if (ideaRequestRef.current === request) setIdeaVisual({ status: 'error', error: 'Görsel oluşturulamadı. Tekrar dener misin?' });
    } finally {
      operation.pending = false;
    }
  }

  // Odanin daha once tamamlanmis (kalici) bir analizini salt-okunur
  // goruntuler — yeni karar olusturmaz, eski analizi guncellemez.
  function viewRoomAnalysis(analysis) {
    resetRoomScan();
    roomDetailRequestRef.current = null;
    setHistoryAnalysis(analysis);
    setView('room-analysis');
  }

  // roomScanSaved false ise (kayit basarisiz oldu) ayni icerikle tekrar
  // dener — sessionKey ayni oldugu icin kopya satir olusturmaz, sadece
  // ayni kalici satiri gunceller.
  function retryRoomScanSave() {
    if (roomDraftDirty || (!roomReceiptRef.current && roomInitialSnapshotRef.current)) return persistRoomDraft();
    if (!roomFilesRef.current.length && !roomReceiptRef.current) {
      setRoomDraftError('Bu eski taramanın analiz bağlantısı yok. Kayıt korunuyor; onay için yeni bir tarama başlat.');
      return false;
    }
    return persistRoomScanIfActive(roomItems, roomMessages);
  }

  async function persistRoomDraft() {
    const context = roomContext();
    if (roomWriteRef.current) return false;
    let receipt = roomReceiptRef.current;
    if (!receipt) {
      const initial = roomInitialSnapshotRef.current;
      if (initial && isRoomContext(initial.context)) {
        // Replay the exact first snapshot. A lost response is idempotent; a
        // newer server revision stays a conflict, never an automatic overwrite.
        const saved = await persistRoomScanIfActive(initial.items, initial.messages, initial.photoIds, initial.context, roomDraftDirty);
        if (!saved || !isRoomContext(context)) return false;
        if (!roomDraftDirty) return true;
        receipt = roomReceiptRef.current;
      }
    }
    if (!receipt) {
      setRoomDraftError('Taslak henüz kaydedilemedi. Önce analizin kaydını tamamla.');
      return false;
    }
    roomWriteRef.current = receipt.sessionKey;
    setRoomScanSaving(true);
    setRoomDraftError(null);
    try {
      const saved = await roomScanClient.write(fetch, receipt.roomId, 'PATCH', {
        analysisId: receipt.analysisId, revision: receipt.revision,
        choices: roomItems.map(i => ({ id: i.id, recommendation: i.recommendation, excluded: i.excluded, manual: i.manual })),
      });
      if (roomReceiptRef.current !== receipt) return false;
      roomReceiptRef.current = { ...receipt, ...saved };
      setRoomRecovery(null);
      setRoomItems(saved.items);
      setRoomError(null);
      setRoomDraftDirty(false);
      setRoomScanSaved(true);
      return true;
    } catch (error) {
      if (roomReceiptRef.current === receipt) await recoverRoomWrite(receipt.roomId, receipt.sessionKey, error, context);
      return false;
    } finally {
      if (isRoomContext(context) && roomWriteRef.current === receipt.sessionKey) roomWriteRef.current = null;
      if (isRoomContext(context)) setRoomScanSaving(false);
    }
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
    singlePhotoOperationRef.current = crypto.randomUUID();
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
      setSelectedRec(null);
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
      setSelectedRec(null);
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
    const roomId = activeRoomRef.current?.id ?? null;
    const file = singleFileRef.current;
    const session = singleSessionRef.current;
    const photoOperation = singlePhotoOperationRef.current;
    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ category, recommendation: selectedRec, reasoning, room, roomId }],
          source: 'tekli',
        }),
      });
      if (!res.ok) throw new Error('decide_failed');
      const state = await res.json();
      if (singleSessionRef.current !== session) return;
      setHomeState(state);
      logEvent('decision_confirmed', {
        category,
        recommendation: selectedRec,
        changedFromSuggestion: !!analysis && analysis.recommendation !== selectedRec,
        source: 'tekli',
      });
      if (file) persistPhotosToActiveRoom([file], roomId, photoOperation);
      setCelebration({
        streak: state.streak,
        pointsGained: 5,
        // Kaydedilen şey bir karardır, gerçekleşmiş eylem değil: "bağışlandı"
        // değil "Kararın: Bağışla" (geçmiş analizlerdeki ifadeyle aynı).
        summary: `${category} — Kararın: ${REC_META[selectedRec]?.label || ''}`,
      });
      setView('celebration');
    } catch {
      if (singleSessionRef.current === session) setAnalyzeError('Karar kaydedilemedi. Tekrar dener misin?');
    } finally {
      if (singleSessionRef.current === session) setConfirming(false);
    }
  }

  // ---------------- oda taraması akışı ----------------

  // Leaving a reserved scan that has no photos, analysis or pending work frees
  // it, so the room does not report an open scan that cannot be resumed.
  // Photos that were already in the room are not work of this scan.
  function releaseEmptyRoomScan() {
    const lease = roomLeaseRef.current;
    if (!lease || lease.analysisId || lease.orphanToken || lease.sessionKey !== roomAnalysisSessionKeyRef.current ||
        roomReceiptRef.current || roomPhotosRef.current.some(p => !p.existing) || roomUploadsRef.current.size ||
        roomSaveFlowRef.current || roomWriteRef.current || roomRequestRef.current) return;
    roomScanClient.write(fetch, lease.roomId, 'DELETE', { action: 'release', sessionKey: lease.sessionKey }).catch(() => {});
  }

  function resetRoomScan() {
    releaseEmptyRoomScan();
    roomCoverageRequestRef.current?.abort();
    roomCoverageRequestRef.current = null;
    roomExistingLoadRef.current?.abort();
    roomExistingLoadRef.current = null;
    setRoomExistingPick(null);
    setRoomExistingRetry(null);
    roomPhotoVersionRef.current += 1;
    roomUploadsRef.current = new Map();
    roomAnalysisPhotosRef.current = [];
    roomSaveFlowRef.current = null;
    roomCreateOperationRef.current = null;
    roomLeaseRef.current = null;
    setRoomRecovery(null);
    setRoomLegacyApprovalUnknown(false);
    roomReceiptRef.current = null;
    roomInitialSnapshotRef.current = null;
    // Invalidate ownership before publishing idle state for the next scan.
    roomConfirmationRef.current = null;
    setRoomConfirming(false);
    roomWriteRef.current = null;
    setRoomDraftDirty(false);
    setRoomDraftError(null);
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
    roomPhotosRef.current.forEach(p => URL.revokeObjectURL(p.url));
    updateRoomPhotos(() => []);
    setRoomAnalyzing(false);
    setRoomCoverageChecking(false);
    setRoomCoverageResult(null);
    setRoomError(null);
    setRoomItems([]);
    setRoomScanSaved(false);
    setRoomScanSaving(false);
    // Odalarım'dan başlatılan taramada activeRoomRef zaten dolu; Keşif ve ana
    // ekrandan başlatılanda boş (goTo('home') sıfırlıyor).
    setRoomScanNeedsRoom(!activeRoomRef.current);
    setRoomScanSaveError(null);
    setRoomScanSavedRoomName(null);
  }

  async function addRoomPhotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || roomRequestRef.current || roomSaveFlowRef.current) return;
    const context = roomContext();
    const withinSize = files.filter(file => file.size <= MAX_UPLOAD_BYTES);
    const accepted = withinSize.slice(0, Math.max(0, MAX_ROOM_PHOTOS - roomPhotosRef.current.length));
    // Reserve capacity BEFORE compression; later picks see these slots immediately.
    const entries = accepted.map(file => ({ id: crypto.randomUUID(), file: null, original: file,
      url: URL.createObjectURL(file), compressing: true }));
    if (!entries.length) return;
    invalidateRoomCoverage();
    updateRoomPhotos(list => [...list, ...entries]);
    setRoomError(files.length > withinSize.length ? 'Bazı fotoğraflar 20 MB sınırını aştığı için eklenemedi.' : null);
    await Promise.all(entries.map(async entry => {
      const file = await compressImage(entry.original, 1600).catch(() => entry.original);
      if (!isRoomContext(context) || !roomPhotosRef.current.some(p => p.id === entry.id)) return;
      const ready = { ...entry, file, compressing: false };
      updateRoomPhotos(list => list.map(p => p.id === entry.id ? ready : p));
      if (context.roomId) persistNewRoomScanPhotos([ready], context);
    }));
    if (isRoomContext(context) && roomPhotosRef.current.length && !roomPhotosRef.current.some(p => p.compressing)) {
      checkRoomPhotoCoverage(roomPhotosRef.current);
    }
  }


  function removeRoomPhoto(id) {
    const target = roomPhotosRef.current.find(p => p.id === id);
    if (!target) return;
    URL.revokeObjectURL(target.url);
    invalidateRoomCoverage();
    updateRoomPhotos(list => list.filter(p => p.id !== id));
  }


  async function checkRoomPhotoCoverage(photos) {
    const context = roomContext();
    const version = roomPhotoVersionRef.current;
    if (!photos.length || photos.some(p => !p.file) || roomRequestRef.current ||
        photos.map(p => p.id).join() !== roomPhotosRef.current.map(p => p.id).join()) return;
    roomCoverageRequestRef.current?.abort();
    const controller = new AbortController();
    roomCoverageRequestRef.current = controller;
    const current = () => isRoomContext(context) && version === roomPhotoVersionRef.current && roomCoverageRequestRef.current === controller;
    setRoomCoverageChecking(true);
    setRoomCoverageResult(null);
    setRoomError(null);
    try {
      const formData = new FormData();
      photos.forEach(p => formData.append('image', p.file));
      formData.append('mode', 'oda-kapsam');
      const res = await fetch('/api/analyze', { method: 'POST', body: formData, signal: controller.signal });
      if (!res.ok) throw new Error('coverage_failed');
      const result = await res.json();
      if (!current()) return;
      if (result.sufficient) startRoomAnalysis(photos, { context, version });
      else setRoomCoverageResult(result);
    } catch {
      if (current() && !controller.signal.aborted) setRoomError('Fotoğraf kontrolünde bir sorun oldu. Yine de bu fotoğraflarla devam edebilirsin.');
    } finally {
      if (current()) { roomCoverageRequestRef.current = null; setRoomCoverageChecking(false); }
    }
  }


  async function startRoomAnalysis(photosOverride, expected) {
    const context = expected?.context || roomContext();
    const version = expected?.version ?? roomPhotoVersionRef.current;
    const photos = (photosOverride || roomPhotosRef.current).map(p => ({ ...p }));
    const current = () => isRoomContext(context) && version === roomPhotoVersionRef.current;
    if (!current() || roomRequestRef.current || roomSaveFlowRef.current || !photos.length || photos.some(p => !p.file) ||
        photos.map(p => p.id).join() !== roomPhotosRef.current.map(p => p.id).join()) return;
    const controller = new AbortController();
    roomRequestRef.current = controller; // Lock before awaiting uploads.
    setRoomAnalyzing(true);
    try {
      let photoIds = [];
      if (context.roomId) {
        const upload = await persistNewRoomScanPhotos(photos, context);
        if (!current()) return;
        if (!upload.ok) { setRoomError('Fotoğraflar kaydedilemedi. Tekrar deneyip devam edebilirsin.'); return; }
        photoIds = upload.photoIds;
      } else loadRooms();
      if (!current()) return;
      const snapshot = photos.map((p, i) => ({ ...p, photoId: photoIds[i] }));
      roomAnalysisPhotosRef.current = snapshot;
      roomFilesRef.current = snapshot.map(p => p.file);
      setRoomItems([]); setRoomMessages([]); setRoomError(null);
      setView('room-review');
      const formData = new FormData();
      snapshot.forEach(p => formData.append('image', p.file));
      formData.append('mode', 'oda');
      const res = await fetch('/api/analyze', { method: 'POST', body: formData, signal: controller.signal });
      if (!res.ok) throw new Error('analyze_failed');
      const data = await res.json();
      if (!current()) return;
      const nextItems = data.items.map(item => ({ ...item, excluded: false, manual: false }));
      setRoomItems(nextItems); setRoomMessages(data.messages);
      logEvent('ai_suggestion_shown', { items: data.items.map(item => ({ category: item.category, recommendation: item.recommendation })) });
      await persistRoomScanIfActive(nextItems, data.messages, photoIds, context);
    } catch {
      if (current() && !controller.signal.aborted) setRoomError('Analiz sırasında bir sorun oluştu. Tekrar dener misin?');
    } finally {
      if (isRoomContext(context) && roomRequestRef.current === controller) { roomRequestRef.current = null; setRoomAnalyzing(false); }
    }
  }


  async function sendRoomChat(e) {
    e.preventDefault();
    const content = roomChatDraft.trim();
    const context = roomContext();
    const version = roomPhotoVersionRef.current;
    if (!content || !roomMessages.length || roomConfirming || roomWriteRef.current || roomSaveFlowRef.current || roomRequestRef.current ||
        (context.roomId && !roomScanSaved && !roomDraftDirty) || roomMessages.length >= 42) return;
    const controller = new AbortController();
    roomRequestRef.current = controller;
    setRoomChatBusy(true); setRoomChatError(null);
    const items = roomItems;
    const messages = roomMessages;
    const photos = roomAnalysisPhotosRef.current;
    try {
      if (roomDraftDirty && (roomReceiptRef.current || context.roomId) && !(await persistRoomDraft())) return;
      if (!isRoomContext(context) || version !== roomPhotoVersionRef.current) return;
      const formData = new FormData();
      photos.forEach(p => formData.append('image', p.file));
      formData.append('mode', 'oda');
      formData.append('messages', JSON.stringify([...messages, { role: 'user', content }]));
      formData.append('items', JSON.stringify(items));
      const res = await fetch('/api/analyze', { method: 'POST', body: formData, signal: controller.signal });
      if (!res.ok) throw new Error('room_chat_failed');
      const result = await res.json();
      if (!isRoomContext(context)) return;
      const finalItems = roomItemSources.reconcileRoomItems(result.items, items, true);
      setRoomItems(finalItems); setRoomMessages(result.messages); setRoomChatDraft('');
      await persistRoomScanIfActive(finalItems, result.messages, photos.map(p => p.photoId), context);
    } catch {
      if (isRoomContext(context) && !controller.signal.aborted) setRoomChatError('Yanıt alınamadı. Tekrar deneyebilirsin.');
    } finally {
      if (isRoomContext(context) && roomRequestRef.current === controller) { roomRequestRef.current = null; setRoomChatBusy(false); }
    }
  }


  function toggleRoomExclude(index) {
    if (roomWriteRef.current || roomSaveFlowRef.current || roomRequestRef.current) return;
    setRoomDraftDirty(true);
    setRoomScanSaved(false);
    setRoomItems((items) => items.map((it, i) => (i === index ? { ...it, excluded: !it.excluded } : it)));
  }

  function setRoomItemRec(index, key) {
    if (roomWriteRef.current || roomSaveFlowRef.current || roomRequestRef.current) return;
    setRoomDraftDirty(true);
    setRoomScanSaved(false);
    setRoomItems((items) => items.map((it, i) => (i === index ? { ...it, recommendation: key, manual: true } : it)));
  }

  async function confirmRoomDecisions() {
    const receipt = roomReceiptRef.current;
    if (!receipt || roomLegacyApprovalUnknown || roomConfirming || roomConfirmationRef.current || roomRequestRef.current || roomWriteRef.current || roomDraftDirty || !roomScanSaved) return;
    const context = roomContext();
    const operation = {};
    roomConfirmationRef.current = operation; // Synchronous lock, before React rerenders.
    const ownsOperation = () => isRoomContext(context) && roomConfirmationRef.current === operation;
    setRoomConfirming(true);
    try {
      const result = await roomScanClient.write(fetch, receipt.roomId, 'PUT', { analysisId: receipt.analysisId, revision: receipt.revision });
      if (!ownsOperation() || roomReceiptRef.current !== receipt) return;
      setHomeState(result.state);
      if (!result.replayed) roomItems.filter(it => !it.excluded).forEach(it => logEvent('decision_confirmed', {
        category: it.category, recommendation: it.recommendation, changedFromSuggestion: !!it.manual, source: 'oda',
      }));
      setCelebration({ streak: result.state.streak, pointsGained: result.replayed ? 0 : result.count * 5,
        summary: `${result.count} eşya için kararların kaydedildi.` });
      setView('celebration');
    } catch (error) {
      if (ownsOperation() && roomReceiptRef.current === receipt) await recoverRoomWrite(receipt.roomId, receipt.sessionKey, error, context);
    } finally {
      // Receipt replacement can suppress a result, but only this operation may
      // clear its loading state. A late A cleanup must never unlock pending B.
      if (ownsOperation()) { roomConfirmationRef.current = null; setRoomConfirming(false); }
    }
  }
  function selectMode(mode) {
    logEvent('mode_selected', { mode });
    goTo(mode === 'tek_esya' ? 'scan' : 'room-scan');
  }

  const displayName = identityType === 'account' ? homeState.name : userName;
  const mainSurface = ['home', 'discover', 'rooms', 'chat'].includes(view);
  if (!identityLoaded) return <div className="app"><div className="scroll sestia-onboarding"><Brand/><p role="status" className="muted">Birlikte başlıyoruz…</p></div></div>;
  if (signInRequired) return <div className="app" data-screen="sign-in"><WelcomeView emailOnly emailReady={signInRequired.emailReady} currentIdentityId={null} onGuestStart={() => {}} /></div>;
  // Session V2: a brand-new visitor (or the remounted app right after a
  // confirmed timeout) genuinely has no identity yet — this is the normal
  // guest/account entry point, not a connectivity failure, so it must be
  // checked BEFORE the generic "no identity -> retry" error screen below.
  if (showWelcome && !currentIdentityId) return <div className="app" data-screen="welcome"><WelcomeView onGuestStart={() => refreshHomeState(true)} currentIdentityId={null} emailReady={homeState.emailReady} /></div>;
  if (!currentIdentityId) return <div className="app"><div className="scroll"><PageHeading title="Bağlantıyı yeniden deneyelim."/><p className="errbox">{homeError}</p><button className="btn-primary" onClick={()=>refreshHomeState(true)}>Tekrar dene</button></div></div>;
  return (
    <div className={`app${mainSurface && !showWelcome ? ' sestia-with-nav' : ''}`} data-screen={showWelcome ? 'welcome' : view}>
      {view === 'home' && (showWelcome ? (
        <WelcomeView onGuestStart={() => {setShowWelcome(false);setUserNameState(getUserName(currentIdentityId));goTo(landingView(homeState));}} currentIdentityId={currentIdentityId} emailReady={homeState.emailReady} />
      ) : <HomeDashboard userName={displayName} rooms={rooms} roomsLoading={roomsLoading} roomsError={roomsError} homeState={homeState} homeMessage={homeMessage} onOpenRoom={openRoom} onNavigate={goTo} onChat={openSestiaChat} onAccount={()=>goTo('account')} error={homeError}/>)}
      {view === 'discover' && <DiscoverView library={sestiaLibrary} onChat={openSestiaChat} onNavigate={goTo} onAccount={()=>goTo('account')}/>}
      {view === 'choose' && <ChooseView onBack={()=>goTo('home')} onSingle={()=>selectMode('tek_esya')} onRoom={()=>selectMode('oda_tarama')}/>}
      {!showWelcome && <SestiaChat key={currentIdentityId} active={view==='chat'} context={chatContext} onBack={()=>goTo('home')} identityType={identityType} onRequireAccount={requireAccountFlow}/>}
      {view === 'account' && (
        identityType === 'account' ? <section className="view"><div className="scroll"><Header onBack={()=>goTo('home')}/><PageHeading title="Hesabın">{displayName ? `Merhaba, ${displayName}.` : 'Hesabınla devam ediyorsun.'}</PageHeading><div className="card"><h2>Birlikte baktıklarımız burada.</h2><p className="muted">Odalarına, fotoğraflarına ve kararlarına hesabınla erişebilirsin.</p></div><button className="btn-primary" onClick={()=>goTo('rooms')}>Odalarıma dön</button></div></section> : accountEmailFlow ? <WelcomeView
          onGuestStart={() => {setUserNameState(getUserName(currentIdentityId));setAccountEmailFlow(false);}}
          currentIdentityId={currentIdentityId}
          emailReady={homeState.emailReady}
          alreadyGuest
          onBack={() => setAccountEmailFlow(false)}
        /> : <GuestAccountView
          currentIdentityId={currentIdentityId}
          emailReady={homeState.emailReady}
          onNameSaved={() => setUserNameState(getUserName(currentIdentityId))}
          onEmail={() => setAccountEmailFlow(true)}
          onRooms={() => goTo('rooms')}
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
          onRetryPhoto={galleryUploadRef.current?.roomId === roomDetail?.id ? () => handleRoomPhotoUpload() : null}
          onScanHere={startScanInRoom}
          onRoomScanHere={startRoomScanInRoom}
          onToparlaHere={startToparlaInRoom}
          onSuggestHere={startSuggestionsInRoom}
          onViewSuggestion={openSavedSuggestion}
          onToggleTodo={toggleTodo}
          onRemoveTodo={removeTodo}
          onOpenTodo={(todo) => openIdea(todo.suggestionId, todo.ideaIndex, 'room-detail')}
          toparlaNotice={toparlaNotice}
          onResumeScan={resumeRoomScan}
          onViewAnalysis={viewRoomAnalysis}
        />
      )}

      {view === 'toparla' && (
        <ToparlaView
          room={roomDetail}
          photoId={toparlaPhotoId}
          status={toparlaStatus}
          result={toparlaResult}
          error={toparlaError}
          onBack={() => goTo('room-detail')}
          onSelectPhoto={selectToparlaPhoto}
          onChangePhoto={() => setToparlaStatus('select')}
          onConfirm={submitToparla}
          onRetry={retryToparla}
          onRequireAccount={requireAccountFlow}
        />
      )}

      {view === 'room-suggestions' && (
        <SuggestionsView
          room={roomDetail}
          photoId={suggestionPhotoId}
          status={suggestionStatus}
          suggestion={suggestion}
          error={suggestionError}
          identityType={identityType}
          onBack={() => goTo('room-detail')}
          onSelectPhoto={submitSuggestion}
          onRetry={() => suggestionRetryRef.current?.()}
          onAgain={() => submitSuggestion(suggestionPhotoId)}
          onOpenIdea={(ideaIndex) => suggestion && openIdea(suggestion.id, ideaIndex, 'room-suggestions')}
          onRequireAccount={requireAccountFlow}
        />
      )}

      {view === 'suggestion-idea' && (
        <IdeaView
          room={roomDetail}
          state={ideaState}
          visual={ideaVisual}
          todoBusy={todoBusy}
          identityType={identityType}
          onBack={leaveIdea}
          onRetry={() => ideaState && openIdea(ideaState.suggestionId, ideaState.ideaIndex, ideaReturnView)}
          onAddTodo={addIdeaTodo}
          onStartVisual={startIdeaVisual}
          onConfirmVisual={confirmIdeaVisual}
          onCancelVisual={() => setIdeaVisual(null)}
          onRequireAccount={requireAccountFlow}
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
          draftItems={historyAnalysis.draftItems}
          closed={historyAnalysis.closed}
          closeReason={historyAnalysis.closeReason}
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
          photosSavedToRoom={!roomScanNeedsRoom}
          photosUploading={!roomScanNeedsRoom && roomPhotos.some((p) => !p.photoId && !p.uploadFailed)}
          photosUploadFailed={roomPhotos.some((p) => p.uploadFailed)}
          onRetryUploads={retryFailedRoomPhotos}
          existingPick={roomExistingPick}
          onToggleExisting={toggleExistingRoomPhoto}
          onAnalyzeExisting={analyzeSelectedExistingRoomPhotos}
          onRetryExisting={roomExistingRetry ? () => loadExistingRoomPhotos(roomExistingRetry) : null}
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
          needsRoom={roomScanNeedsRoom}
          rooms={rooms}
          pendingRoomName={roomScanNeedsRoom ? activeRoomRef.current?.name ?? null : null}
          onSaveToRoom={saveRoomScanToRoom}
          saveToRoomError={roomScanSaveError}
          savedRoomName={roomScanSavedRoomName}
          draftDirty={roomDraftDirty}
          draftError={roomDraftError}
          onSaveDraft={persistRoomDraft}
          legacyApprovalUnknown={roomLegacyApprovalUnknown}
          onCloseScan={activeRoomRef.current && (roomReceiptRef.current || roomLegacyApprovalUnknown) ? closeRoomScan : null}
          recovery={roomRecovery}
          onLoadRecovery={loadRecoveredRoomScan}
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

      {!showWelcome && mainSurface && <MainNavigation view={view} onNavigate={goTo}/>}
      {!showWelcome && <FeedbackButton screen={view} />}
    </div>
  );
}

const welcomeInputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '13px 15px', borderRadius: 12,
  border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 15,
};

// Auth.js'in signIn hata URL'sindeki "error" kodunu kisa, anlasilir bir
// Turkce ifadeye ceviriyoruz — eslesme yoksa ham kod aynen gosterilir
// (erken test asamasinda teshis icin faydali, tamamen anlamsiz degil).
const EMAIL_ERROR_LABELS = {
  Configuration: 'sunucu e-posta yapılandırmasında bir sorun var',
  AccessDenied: 'erişim reddedildi',
  Verification: 'doğrulama bağlantısı geçersiz veya süresi dolmuş',
};

// Misafirin hesap ekranı (QA-06): önceden ilk karşılaşma akışı yeniden
// açılıyordu. Hitap düzenlenebilir; misafir verisinin nerede durduğu dürüstçe
// söylenir; e-posta ile giriş yalnızca e-posta gönderimi hazırsa sunulur.
function GuestAccountView({ currentIdentityId, emailReady, onNameSaved, onEmail, onRooms, onBack }) {
  const savedName = getUserName(currentIdentityId) || '';
  const [name, setName] = useState(savedName);
  const [saved, setSaved] = useState(false);
  const changed = name.trim() !== savedName;

  function saveName(e) {
    e.preventDefault();
    if (!changed) return;
    setUserName(name.trim(), currentIdentityId);
    onNameSaved();
    setSaved(true);
  }

  return <section className="view"><div className="scroll">
    <Header onBack={onBack} />
    <PageHeading title="Hesabın">{savedName ? `Merhaba, ${savedName}.` : 'Misafir olarak devam ediyorsun.'}</PageHeading>
    <form className="sestia-form card" onSubmit={saveName}>
      <label htmlFor="account-name">Sana nasıl hitap edeyim?</label>
      <input id="account-name" autoComplete="given-name" value={name} maxLength={60}
        onChange={(e) => { setName(e.target.value); setSaved(false); }} placeholder="Adın ya da tercih ettiğin hitap" />
      {saved && <p role="status" className="muted">{name.trim() ? 'Kaydedildi.' : 'Hitabını kaldırdım.'}</p>}
      <button className="btn-outline" disabled={!changed}>Kaydet</button>
    </form>
    <div className="card">
      <h2>Misafir olarak devam ediyorsun.</h2>
      <p className="muted">Odaların, fotoğrafların ve kararların bu tarayıcıyla ilişkili. Tarayıcı verilerini silersen ya da başka bir cihazdan girersen onlara ulaşamayabilirsin.</p>
    </div>
    {emailReady && <div className="card">
      <h2>E-posta ile giriş</h2>
      <p className="muted">Hesapla farklı cihazlardan girebilirsin. Şimdilik misafir olarak kaydettiklerin hesaba taşınmıyor.</p>
      <button className="btn-outline" onClick={onEmail}>E-posta ile devam et</button>
    </div>}
    <button className="btn-primary" onClick={onRooms}>Odalarıma git</button>
  </div></section>;
}

function WelcomeView({ onGuestStart, currentIdentityId, emailReady, alreadyGuest, onBack, emailOnly = false }) {
  const initialName = getUserName(currentIdentityId) || '';
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // null | 'not_configured' | 'sent' | 'error'
  const [errorDetail, setErrorDetail] = useState(null); // Auth.js'in dondurdugu ham hata kodu (varsa)
  const [code, setCode] = useState('');
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  // Deferred: skipping the hitap question happens BEFORE a brand-new
  // guest identity exists (Session V2 never implicitly creates one), so the
  // flag can't yet be stamped against a real id — chooseGuest() below stamps
  // it against whichever id (existing active guest, or freshly established)
  // actually ends up owning this visit.
  const [nameSkipped, setNameSkipped] = useState(false);
  const sessionLifecycle = useSessionLifecycle();

  // E-postadaki 6 haneli kod: Auth.js'in doğrulama adresine AYNI tarayıcıda
  // gidilir; e-posta, Auth.js'in normalize ettiği biçimde gönderilmeli
  // (node_modules/@auth/core/lib/actions/signin/send-token.js defaultNormalizer).
  function submitCode(e) {
    e.preventDefault();
    if (code.length !== 6 || codeSubmitting) return;
    setCodeSubmitting(true);
    const [local = '', domain = ''] = email.normalize('NFKC').trim().toLowerCase().split('@');
    const params = new URLSearchParams({
      callbackUrl: `${window.location.origin}/`,
      token: code,
      email: `${local}@${domain.split(',')[0]}`,
    });
    window.location.assign(`/api/auth/callback/resend?${params}`);
  }

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
    setErrorDetail(null);
    try {
      // Binds this login attempt to the current browser's Session V2 family
      // BEFORE Auth.js's own signIn() call, so the verified callback later
      // knows this account session belongs to this exact browser (see
      // lib/auth.js's jwt() callback). Best-effort: if it fails, the
      // eventual login still completes as a normal Auth.js session, it just
      // won't gain Session V2 idle-timeout binding until a fresh attempt.
      await fetch('/api/session/login-intent', { method: 'POST' }).catch(() => {});
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
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // KRITIK: bu baslik olmadan Auth.js basari/hata FARK ETMEKSIZIN
          // gercek bir HTTP redirect donuyor, fetch() bunu sessizce takip
          // ediyor ve hedef sayfa (hata sayfasi dahil) 200 render ettigi
          // icin signinRes.ok HER ZAMAN true oluyordu — yani Resend
          // gonderimi gercekten BASARISIZ olsa bile kullaniciya "e-posta
          // yolda" denebiliyordu. next-auth/react'in kendi signIn()
          // istemcisi de ayni basligi kullaniyor (bkz. node_modules/
          // next-auth/src/react.tsx) — bu baslikla Auth.js HER ZAMAN
          // {url} icerikli bir JSON donuyor, biz de basari/hatayi o
          // URL'nin "error" query param'ina bakarak GUVENILIR sekilde
          // ayirt edebiliyoruz.
          'X-Auth-Return-Redirect': '1',
        },
        body: new URLSearchParams({ email: cleanEmail, csrfToken, callbackUrl: '/', json: 'true' }),
      });
      if (!signinRes.ok) throw new Error('signin_failed');
      const signinData = await signinRes.json().catch(() => null);
      const resultUrl = signinData?.url ? new URL(signinData.url) : null;
      const errorCode = resultUrl?.searchParams.get('error');
      if (errorCode) {
        setStatus('error');
        setErrorDetail(errorCode);
        return;
      }
      // Burada "secildi" bayragi bilerek basmiyoruz: bu adimda kullanici
      // henuz dogrulanmadi, hala misafir. Dogrulama tamamlaninca gercek
      // hesap oturumu (identityType==='account') zaten sunucu tarafinda
      // kanitlanmis oluyor ve secim ekrani onun icin ayrica hic
      // gosterilmiyor (localStorage'a bagimli degil).
      setStatus('sent');
    } catch {
      setStatus('error');
      setErrorDetail(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function chooseGuest() {
    if (guestSubmitting) return;
    setGuestSubmitting(true);
    // Session V2 never implicitly creates a guest: if one isn't already
    // active for this browser (alreadyGuest/currentIdentityId case), this is
    // the ONE explicit action that establishes it.
    let ownerId = sessionLifecycle?.status?.state === 'active' ? sessionLifecycle.status.ownerId : (currentIdentityId || null);
    if (sessionLifecycle?.status?.state !== 'active') {
      try {
        const established = await sessionLifecycle?.establishGuest?.();
        ownerId = established?.ownerId || null;
      } catch {
        // Establishment failed (e.g. a stale revision from a concurrent
        // tab) — proceed anyway; onGuestStart's own refresh will surface
        // session_required again and the user can retry.
      }
    }
    const cleanName = name.trim();
    if (ownerId && cleanName) setUserName(cleanName, ownerId);
    try {
      if (ownerId) {
        localStorage.setItem('sestia_guest_id_confirmed', ownerId);
        if (nameSkipped) localStorage.setItem('sestia_intro_skipped', ownerId);
      }
    } catch {}
    setGuestSubmitting(false);
    onGuestStart();
  }

  // Hitap ekranı tek kaynak: isimsiz geçen biri, yarım yazdığı bir ismi ne
  // misafir olarak ne de hesaba taşır. The actual localStorage stamp is
  // deferred to chooseGuest() above, once a real identity is known.
  function skipName() {
    setNameSkipped(true);
    setName('');
    setStage('method');
  }
  function back() {
    if(stage==='method'){setStage('intro');setStatus(null);} else if(onBack) onBack(); else window.location.href='/hosgeldin';
  }
  return <section className="view sestia-onboarding">
    <div className="scroll"><Header onBack={emailOnly && stage==='intro' ? undefined : back}/><Brand/>
    {stage==='intro' ? <>
      <PageHeading title="Sana nasıl hitap etmemi istersin?" center>Böylece konuşmalarımız daha sana özel olabilir.</PageHeading>
      <form className="sestia-form" onSubmit={continueFromIntro}>
        <label htmlFor="preferred-name">Sana nasıl hitap edelim?</label><input id="preferred-name" autoComplete="given-name" value={name} onChange={e=>setName(e.target.value)} maxLength={60} placeholder="Adın ya da tercih ettiğin hitap"/>
        <button className="btn-primary" disabled={!name.trim()}>Devam Et <ChevronRightIcon/></button>
      </form>
      {!emailOnly && <button className="sestia-text-link" onClick={skipName}>Şimdilik isimsiz devam et →</button>}
    </> : <>
      <PageHeading title={status==='sent'?'E-posta yolda.':emailOnly?'E-postanla giriş yap.':'Nasıl devam etmek istersin?'} center>{status==='sent'?'Giriş kodun için gelen kutuna bak.':emailOnly?`Memnun oldum, ${name.trim()}. Sestia’yı denemek için e-posta adresine bir giriş kodu göndereceğim.`:name.trim()?`Memnun oldum, ${name.trim()}.`:'İstersen hesabınla ilerleyebilir, istersen misafir olarak devam edebilirsin.'}</PageHeading>
      {status==='sent' ? <form className="card sestia-form sestia-email-sent" onSubmit={submitCode}><h2>{email}</h2><p className="muted">Bu adrese 6 haneli bir giriş kodu gönderdik. Gelen kutunu ve gereksiz klasörünü kontrol edebilirsin.</p>
        <label htmlFor="signin-code">Giriş kodu</label><input id="signin-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="123456" autoFocus/>
        <button className="btn-primary" disabled={code.length!==6||codeSubmitting}>{codeSubmitting?'Giriş yapılıyor…':'Giriş yap'}<ChevronRightIcon/></button>
        <button type="button" className="btn-outline" onClick={()=>{setStatus(null);setCode('');}}>E-posta adresini değiştir</button></form> : emailReady ? <form className="card sestia-form" onSubmit={submitEmail}>
        <h2>E-posta ile devam et</h2><p className="muted">İlerlemeni hesabınla koru.</p>
        <label htmlFor="signup-email">E-posta adresin</label><input id="signup-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@email.com" disabled={submitting}/>
        {status==='not_configured' && <p role="alert" className="errbox">{emailOnly?'E-posta ile giriş şu anda hazır değil. Biraz sonra yeniden dener misin?':'E-posta ile giriş şu anda hazır değil. Misafir olarak devam edebilirsin.'}</p>}
        {status==='error' && <p role="alert" className="errbox">E-posta gönderilemedi{errorDetail?` (${EMAIL_ERROR_LABELS[errorDetail]||'Bağlantı sorunu'})`:''}. Tekrar dener misin?</p>}
        <button className="btn-primary" disabled={submitting||!email.trim()}>{submitting?'Gönderiliyor…':'Giriş kodu gönder'}<ChevronRightIcon/></button>
      </form> : emailOnly ? <div className="card"><h2>Giriş şu anda hazır değil.</h2><p className="muted">E-posta gönderimi henüz açılmadı. Biraz sonra yeniden dener misin?</p></div> : <div className="card"><h2>Misafir olarak keşfet.</h2><p className="muted">E-posta ile giriş şu anda hazır değil. Sestia ile konuşabilir, fotoğraflarına birlikte bakabilirsin.</p></div>}
      {!emailOnly && <>{emailReady && <div className="sestia-divider">veya</div>}<button className={emailReady?'btn-outline':'btn-primary'} disabled={submitting||guestSubmitting} onClick={chooseGuest}>Misafir olarak devam et <ChevronRightIcon/></button></>}
    </>}
    </div>
  </section>;
}
function InspirationView({ data, loading, error, onBack, onRetry }) {
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack} aria-label="Geri"><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Bu haftanın fikirleri</h2>
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
  const [name,setName]=useState('');
  function submit(e){e.preventDefault();if(name.trim()&&!creating)onCreateRoom(name.trim());}
  return <section className="view"><div className="scroll"><Header onBack={onBack}/><PageHeading title="Odalarım">Birlikte baktığımız alanlar.</PageHeading>
    {error&&<div role="alert" className="errbox">{error}</div>}{loading&&<p role="status" className="muted">Odaların yükleniyor…</p>}
    {!loading&&!error&&!rooms.length&&<div className="sestia-empty"><GridIcon/><h3>İlk odana yer aç.</h3><p>Bir ad ver; fotoğraflarını ve birlikte baktıklarımızı burada bir araya getirelim.</p></div>}
    <div className="sestia-room-list">{rooms.map(room=><button key={room.id} className="sestia-photo-card" onClick={()=>onOpenRoom(room.id)}><RoomCover room={room}/><div><h2>{room.name}</h2><p>{room.decisionCount} karar · Görüntüle →</p></div></button>)}</div>
    <form className="sestia-room-create" onSubmit={submit}><label htmlFor="new-room">Yeni oda adı</label><input id="new-room" maxLength={60} value={name} onChange={e=>setName(e.target.value)} disabled={creating} placeholder="Örneğin: Salon"/><button className="btn-primary" disabled={creating||!name.trim()}>{creating?'Odan oluşturuluyor…':'Oda ekle'}<ChevronRightIcon/></button></form>
  </div></section>;
}
function RoomDetailView({ room, loading, error, uploading, onBack, onAddPhoto, onRetryPhoto, onScanHere, onRoomScanHere, onToparlaHere, onSuggestHere, toparlaNotice, onResumeScan, onViewAnalysis, onViewSuggestion, onToggleTodo, onRemoveTodo, onOpenTodo }) {
  return (
    <section className="view">
      <div className="scroll sestia-room-detail">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack} aria-label="Geri"><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>{room?.name || 'Oda'}</h2>
        </div>

        {loading && (
          <div className="thinking">
            <div className="spinner" />
          </div>
        )}
        {error && <div className="errbox">{error}{onRetryPhoto && <button className="btn-outline" disabled={uploading} onClick={onRetryPhoto}>Fotoğraf Yüklemesini Tekrar Dene</button>}</div>}

        {room && !loading && (
          <>
            <p className="muted">Bu odada görmek, anlamak, değiştirmek istediğin her şeye birlikte bakalım.</p>
            {room.photos[0] && <img className="sestia-room-hero" src={`/api/rooms/${room.id}/photos/${room.photos[0].id}`} alt={room.name} />}
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
              disabled={uploading}
              cameraLabel={uploading ? 'Yükleniyor...' : (room.photos.length ? 'Bir Fotoğraf Daha Ekle' : 'Fotoğraf Ekle')}
              galleryLabel="Galeriden Ekle"
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-outline" onClick={onScanHere} disabled={uploading}>
                <CameraIcon style={{ width: 18, height: 18 }} /> Bir eşyaya bakalım
              </button>
              <button className="btn-outline" onClick={onRoomScanHere} disabled={uploading}>
                <GridIcon style={{ width: 18, height: 18 }} /> Odaya birlikte bakalım
              </button>
              <button className="btn-outline" onClick={onToparlaHere} disabled={uploading}>
                <LayersIcon style={{ width: 18, height: 18 }} /> Toparlanmış halini gör
              </button>
              <button className="btn-outline" onClick={onSuggestHere} disabled={uploading}>
                <LightbulbIcon style={{ width: 18, height: 18 }} /> Bana öneri ver
              </button>
              {toparlaNotice && (
                <p className="muted" role="status">Önce bir fotoğraf ekle — yukarıdaki “Fotoğraf Ekle” ile başlayabilirsin.</p>
              )}
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
                        {a.closed && !a.finalItems && <div className="muted">{a.closeReason === 'legacy_unknown' ? 'Eski tarama kapatıldı — onay durumu bilinmiyor' : 'Onaylanmadan kapatıldı.'}</div>}
                      </div>
                      <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {room.todos && room.todos.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 10 }}>Yapılacaklar</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {room.todos.map((todo) => (
                    <div key={todo.id} className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px' }}>
                      <button
                        type="button"
                        className="iconbtn"
                        onClick={() => onToggleTodo(todo)}
                        aria-pressed={todo.done}
                        aria-label={todo.done ? 'Yapılmadı olarak işaretle' : 'Yapıldı olarak işaretle'}
                        style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 8, border: '1.5px solid var(--border)', background: todo.done ? 'var(--eucalyptus-tint)' : 'transparent' }}
                      >
                        {todo.done && <CheckIcon style={{ width: 16, height: 16, color: 'var(--eucalyptus)' }} />}
                      </button>
                      <button type="button" onClick={() => onOpenTodo(todo)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'inherit' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, textDecoration: todo.done ? 'line-through' : 'none', opacity: todo.done ? 0.6 : 1 }}>{todo.title}</div>
                        <div className="muted">{SUGGESTION_AREA_LABELS[todo.area] || todo.area}</div>
                      </button>
                      <button type="button" className="iconbtn" onClick={() => onRemoveTodo(todo)} aria-label="Yapılacaklardan kaldır" style={{ width: 28, height: 28, flexShrink: 0 }}>
                        <CloseIcon style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {room.suggestions && room.suggestions.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 10 }}>Geçmiş Öneriler</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {room.suggestions.map((s) => (
                    <button
                      key={s.id}
                      className="card"
                      style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', width: '100%', cursor: 'pointer' }}
                      onClick={() => onViewSuggestion(s)}
                    >
                      <div className="flamewrap-compact"><LightbulbIcon style={{ width: 16, height: 16 }} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{formatAnalysisDate(s.createdAt)}</div>
                        <div className="muted">{s.ideas.length ? s.ideas.map((idea) => idea.title).slice(0, 2).join(' · ') : 'Öneri çıkmadı'}</div>
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

// "Toparlanmış halini gör" — Odaya birlikte bakalım'dan tamamen ayrı, kendi
// içinde kapalı bir akış: fotoğraf seçimi (birden fazlaysa) → onay →
// üretim → Önce/Sonra. Tek fotoğrafta seçim ekranı hiç gösterilmez.
function ToparlaView({ room, photoId, status, result, error, onBack, onSelectPhoto, onChangePhoto, onConfirm, onRetry, onRequireAccount }) {
  if (!room) return <section className="view"><div className="scroll"><Header onBack={onBack} /><div className="thinking"><div className="spinner" /></div></div></section>;

  const photoUrl = (id) => `/api/rooms/${room.id}/photos/${id}`;
  const selected = room.photos.find((p) => p.id === photoId) || null;

  return (
    <section className="view">
      <div className="scroll sestia-room-detail">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack} aria-label="Geri"><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Toparlanmış halini gör</h2>
        </div>

        {status === 'account-gate' && (
          <>
            <PageHeading title="Bunu senin için oluşturabilmem için giriş yapman gerekiyor." center />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-primary" onClick={onRequireAccount}>E-posta ile devam et <ChevronRightIcon /></button>
              <button className="btn-outline" onClick={onBack}>Şimdilik değil</button>
            </div>
          </>
        )}

        {status === 'select' && (
          <>
            <PageHeading title="Hangi açıyla başlayalım?" center>Toparlanmış halini görmek istediğin fotoğrafı seç.</PageHeading>
            <div className="photogrid">
              {room.photos.map((photo) => (
                <button key={photo.id} type="button" className={`photothumb sestia-photo-pick${photo.id === photoId ? ' selected' : ''}`}
                  onClick={() => onSelectPhoto(photo.id)} aria-pressed={photo.id === photoId}>
                  <img src={photoUrl(photo.id)} alt="" />
                </button>
              ))}
            </div>
          </>
        )}

        {status === 'confirm' && selected && (
          <>
            <PageHeading title="Bu fotoğrafla devam edelim mi?" center>Sestia, odayı olduğu gibi bırakır; yalnızca dağınıklığı toplar.</PageHeading>
            <img className="sestia-room-hero" src={photoUrl(selected.id)} alt={room.name} />
            <p className="muted">Bu bir yeniden dekorasyon değil — mobilya, mimari ve kamera açısı aynı kalır; yalnızca eşyalar toparlanmış hâliyle görselleştirilir.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-primary" onClick={onConfirm}>Toparlanmış halini oluştur <ChevronRightIcon /></button>
              {room.photos.length > 1 && <button className="btn-outline" onClick={onChangePhoto}>Başka fotoğraf seç</button>}
            </div>
          </>
        )}

        {status === 'generating' && (
          <div className="thinking">
            <div className="spinner" />
            <p className="muted">Odanı toparlanmış haliyle görüyoruz…</p>
          </div>
        )}

        {status === 'error' && (
          <>
            <div className="errbox">{error || 'Görsel oluşturulamadı. Tekrar dener misin?'}</div>
            <button className="btn-primary" onClick={onRetry}>Tekrar dene</button>
          </>
        )}

        {status === 'done' && result && selected && (
          <>
            <PageHeading title="Böyle görünse nasıl olur?" center>Sestia'nın bu odayı toparlanmış hâliyle görselleştirmesi — eşyaların gerçekte nereye taşındığının kaydı değil.</PageHeading>
            <BeforeAfterSlider
              beforeSrc={photoUrl(selected.id)}
              afterSrc={`/api/rooms/${room.id}/toparla/${result.id}`}
              width={result.outputWidth}
              height={result.outputHeight}
            />
            {/* Odaya birlikte bakalım'dan bağımsız, ayrı bir sohbet yüzeyi —
                aynı yeniden kullanılabilir ConversationPanel, sadece bu
                sonucun context'iyle. key={result.id}: farklı bir sonuca
                geçilirse (yeni üretim), önceki konuşma değil, tertemiz bir
                tane başlar. */}
            <ConversationPanel
              key={result.id}
              productContext={{ kind: 'toparla_result', toparlaResultId: result.id }}
              emptyStateHeading="Ne düşünüyorsun?"
              emptyStateCopy="Masadaki kutular, köşedeki sandalye, ışık — aklına ne geliyorsa yazabilirsin."
              className="sestia-embedded-chat"
              identityType="account"
              onRequireAccount={onRequireAccount}
            />
          </>
        )}
      </div>
    </section>
  );
}

// "Bana öneri ver" — odayı iyileştirmeye dönük fikirler (yerleşim, renk, ışık,
// dekor, depolama, kendin yap) ve onlar hakkında kaydedilen bir sohbet.
// Ayıklama kararı yok; o "Odaya birlikte bakalım"ın işi.
function SuggestionsView({ room, photoId, status, suggestion, error, identityType, onBack, onSelectPhoto, onRetry, onAgain, onOpenIdea, onRequireAccount }) {
  if (!room) return <section className="view"><div className="scroll"><Header onBack={onBack} /><div className="thinking"><div className="spinner" /></div></div></section>;

  const photoUrl = (id) => `/api/rooms/${room.id}/photos/${id}`;

  return (
    <section className="view">
      <div className="scroll sestia-room-detail">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack} aria-label="Geri"><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Bana öneri ver</h2>
        </div>

        {status === 'select' && (
          <>
            <PageHeading title="Hangi fotoğrafa bakalım?" center>Fikir vermemi istediğin açıyı seç.</PageHeading>
            <div className="photogrid">
              {room.photos.map((photo) => (
                <button key={photo.id} type="button" className="photothumb sestia-photo-pick" onClick={() => onSelectPhoto(photo.id)}>
                  <img src={photoUrl(photo.id)} alt="" />
                </button>
              ))}
            </div>
          </>
        )}

        {(status === 'generating' || status === 'loading') && (
          <div className="thinking">
            <div className="spinner" />
            <p className="muted">{status === 'generating' ? 'Odana bakıyorum, fikirler hazırlanıyor…' : 'Öneri açılıyor…'}</p>
          </div>
        )}

        {status === 'error' && (
          <>
            <div className="errbox">{error || 'Öneriler hazırlanamadı. Tekrar dener misin?'}</div>
            <button className="btn-primary" onClick={onRetry}>Tekrar dene</button>
          </>
        )}

        {status === 'done' && suggestion && (
          <>
            <img className="sestia-room-hero" src={photoUrl(suggestion.sourcePhotoId)} alt={room.name} />
            {suggestion.seen?.length > 0 && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="label" style={{ color: 'var(--text-muted)' }}>Gördüklerim</div>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {suggestion.seen.map((item, i) => <li key={i} className="muted" style={{ fontSize: 13.5 }}>{item}</li>)}
                </ul>
                <div className="muted" style={{ fontSize: 12.5 }}>Yanlış gördüğüm bir şey varsa aşağıda söyle, önerimi ona göre düzeltirim.</div>
              </div>
            )}
            <PageHeading title={suggestion.ideas.length ? 'Bu oda için fikirlerim' : 'Bu fotoğrafla fikir veremedim'}>{suggestion.summary}</PageHeading>
            {suggestion.ideas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {suggestion.ideas.map((idea, i) => (
                  <button
                    key={i}
                    type="button"
                    className="card"
                    onClick={() => onOpenIdea(i)}
                    style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', width: '100%', cursor: 'pointer', color: 'inherit' }}
                  >
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="label">{SUGGESTION_AREA_LABELS[idea.area] || idea.area}</div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{idea.title}</div>
                      <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.45 }}>{idea.detail}</div>
                    </div>
                    <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
            <button className="btn-outline" onClick={onAgain} disabled={!photoId}>
              <LightbulbIcon style={{ width: 18, height: 18 }} /> Başka fikirler iste
            </button>
            {/* key: farklı bir öneriye geçilince o önerinin kendi kayıtlı
                sohbeti açılır, öncekinin mesajları taşınmaz. */}
            <ConversationPanel
              key={suggestion.id}
              productContext={{ kind: 'room_suggestion', roomSuggestionId: suggestion.id }}
              initialMessages={suggestion.messages}
              emptyStateHeading="Hangisini konuşalım?"
              emptyStateCopy="Bir fikri biraz daha açmamı ya da başka bir yönde düşünmemi isteyebilirsin."
              className="sestia-embedded-chat"
              identityType={identityType}
              onRequireAccount={onRequireAccount}
            />
          </>
        )}
      </div>
    </section>
  );
}

const DIFFICULTY_LABELS = { kolay: 'Kolay', orta: 'Orta', zor: 'Zor' };

// Bir öneriye dokununca açılan detay: plan (adımlar, gerekenler, zorluk,
// süre, bütçe), yapılacaklara ekleme, "Nasıl görünür?" görseli ve yalnızca
// bu öneri üzerine kaydedilen sohbet.
function IdeaView({ room, state, visual, todoBusy, identityType, onBack, onRetry, onAddTodo, onStartVisual, onConfirmVisual, onCancelVisual, onRequireAccount }) {
  const data = state?.data;
  const idea = data?.idea;
  const photoUrl = (id) => `/api/rooms/${room?.id}/photos/${id}`;
  const visualResult = visual?.status === 'done' ? visual.result : (!visual ? data?.visual : null);
  const chatRef = useRef(null);

  return (
    <section className="view">
      <div className="scroll sestia-room-detail">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack} aria-label="Geri"><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>{idea ? (SUGGESTION_AREA_LABELS[idea.area] || idea.area) : 'Öneri'}</h2>
        </div>

        {(!state || state.status === 'loading') && <div className="thinking"><div className="spinner" /></div>}

        {idea && (
          <>
            <PageHeading title={idea.title}>{idea.detail}</PageHeading>

            {state.status === 'planning' && (
              <div className="thinking">
                <div className="spinner" />
                <p className="muted">Adımları hazırlıyorum…</p>
              </div>
            )}

            {state.status === 'error' && (
              <>
                <div className="errbox">{state.error}</div>
                <button className="btn-primary" onClick={onRetry}>Tekrar dene</button>
              </>
            )}

            {data.plan && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[['Zorluk', DIFFICULTY_LABELS[data.plan.difficulty] || data.plan.difficulty], ['Süre', data.plan.time], ['Bütçe', data.plan.budget]].map(([label, value]) => (
                    <div key={label} style={{ background: 'var(--eucalyptus-tint)', borderRadius: 12, padding: '6px 10px', fontSize: 12.5 }}>
                      <span style={{ fontWeight: 600 }}>{label}:</span> {value}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Adımlar</div>
                  <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, lineHeight: 1.45 }}>
                    {data.plan.steps.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                </div>
                {data.plan.needs.length > 0 && (
                  <div>
                    <div className="label" style={{ marginBottom: 6 }}>Gerekenler</div>
                    <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                      {data.plan.needs.map((need, i) => <li key={i}>{need}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {state.status !== 'loading' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn-outline" onClick={() => chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  <SendIcon style={{ width: 18, height: 18 }} /> Bunu konuşalım
                </button>
                <button className="btn-outline" onClick={onAddTodo} disabled={todoBusy || !!data.todo}>
                  <CheckIcon style={{ width: 18, height: 18 }} /> {data.todo ? 'Yapılacaklarda' : (todoBusy ? 'Ekleniyor…' : 'Yapılacaklara ekle')}
                </button>
                {state.todoError && <p className="muted" role="status">{state.todoError}</p>}
                {!visualResult && (!visual || visual.status === 'error') && (
                  <button className="btn-outline" onClick={onStartVisual}>
                    <LayersIcon style={{ width: 18, height: 18 }} /> Nasıl görünür?
                  </button>
                )}
              </div>
            )}

            {visual?.status === 'account-gate' && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 600 }}>Bunu senin için oluşturabilmem için giriş yapman gerekiyor.</div>
                <button className="btn-primary" onClick={onRequireAccount}>E-posta ile devam et <ChevronRightIcon /></button>
                <button className="btn-outline" onClick={onCancelVisual}>Şimdilik değil</button>
              </div>
            )}

            {visual?.status === 'confirm' && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 600 }}>Bu öneri uygulanmış hâliyle odanı görelim mi?</div>
                <div className="muted">Oda, mobilya ve kamera açısı aynı kalır; yalnızca bu öneri uygulanmış gibi görselleştirilir.</div>
                <button className="btn-primary" onClick={onConfirmVisual}>Görseli oluştur <ChevronRightIcon /></button>
                <button className="btn-outline" onClick={onCancelVisual}>Vazgeç</button>
              </div>
            )}

            {visual?.status === 'generating' && (
              <div className="thinking">
                <div className="spinner" />
                <p className="muted">Odanı bu öneriyle görüyoruz…</p>
              </div>
            )}

            {visual?.status === 'error' && <div className="errbox">{visual.error}</div>}

            {visualResult && (
              <>
                <PageHeading title="Böyle görünse nasıl olur?" center>Bu önerinin bir görselleştirmesi — odanın gerçek hâli değil.</PageHeading>
                <BeforeAfterSlider
                  beforeSrc={photoUrl(data.sourcePhotoId)}
                  afterSrc={`/api/rooms/${room?.id}/suggestions/${data.suggestionId}/ideas/${data.ideaIndex}/visual/${visualResult.id}`}
                  width={visualResult.outputWidth}
                  height={visualResult.outputHeight}
                />
              </>
            )}

            <div ref={chatRef} style={{ scrollMarginTop: 12 }}>
              {/* key: her önerinin kendi kayıtlı sohbeti; başka bir öneriye geçince taşınmaz. */}
              <ConversationPanel
                key={`${data.suggestionId}-${data.ideaIndex}`}
                productContext={{ kind: 'room_suggestion', roomSuggestionId: data.suggestionId, ideaIndex: data.ideaIndex }}
                initialMessages={data.messages}
                emptyStateHeading="Bunu konuşalım"
                emptyStateCopy="Bir adımı açmamı, daha ucuz bir yolunu ya da başka bir yaklaşımı sorabilirsin."
                className="sestia-embedded-chat"
                identityType={identityType}
                onRequireAccount={onRequireAccount}
              />
            </div>
          </>
        )}

        {state?.status === 'error' && !idea && (
          <>
            <div className="errbox">{state.error}</div>
            <button className="btn-primary" onClick={onRetry}>Tekrar dene</button>
          </>
        )}
      </div>
    </section>
  );
}

function CaptureButtons({ onFile, idPrefix, multiple, disabled = false, cameraLabel = 'Fotoğraf çek', galleryLabel = 'Galeriden seç' }) {
  const cameraId = `${idPrefix}-camera`;
  const galleryId = `${idPrefix}-gallery`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <button type="button" className="btn-primary" disabled={disabled} onClick={()=>document.getElementById(cameraId)?.click()}>
        <CameraIcon style={{ width: 18, height: 18 }} /> {cameraLabel}
      </button>
      <input type="file" id={cameraId} accept="image/*" capture="environment" disabled={disabled} onChange={onFile} />

      <button type="button" className="btn-outline" disabled={disabled} onClick={()=>document.getElementById(galleryId)?.click()}>
        <GalleryIcon style={{ width: 18, height: 18 }} /> {galleryLabel}
      </button>
      <input type="file" id={galleryId} accept="image/*" multiple={multiple} disabled={disabled} onChange={onFile} />
    </div>
  );
}

function ScanView({ onBack, onFile }) {
  return <section className="view"><div className="scroll"><Header onBack={onBack}/><PageHeading title="Birlikte bakalım.">Üzerine konuşmak istediğin eşyanın fotoğrafını paylaş.</PageHeading>
    <button className="sestia-upload-zone" onClick={()=>document.getElementById('photo-single-gallery')?.click()}><CameraIcon/><span>Fotoğrafını buraya ekle</span></button>
    <CaptureButtons onFile={onFile} idPrefix="photo-single"/>
    <p className="muted">Eşyanın tamamı ve ayrıntıları görünsün.</p>
  </div></section>;
}
function RoomScanView({ onBack, photos, onAddFiles, onRemovePhoto, error, coverageChecking, coverageResult, onContinueAnyway,
  photosSavedToRoom, photosUploading, photosUploadFailed, onRetryUploads, existingPick, onToggleExisting, onAnalyzeExisting, onRetryExisting }) {
  const canAddMore = photos.length < MAX_ROOM_PHOTOS;
  return (
    <section className="view">
      <div className="scroll">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack} aria-label="Geri"><BackIcon /></button>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Alanı birlikte görelim.</h2>
        </div>

        {error && (
          <div className="errbox" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {error}
            {photosUploadFailed && <button className="btn-outline" onClick={onRetryUploads}>Tekrar Dene</button>}
            {!photosUploadFailed && onRetryExisting && <button className="btn-outline" onClick={onRetryExisting}>Tekrar Dene</button>}
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
                  ) : photosSavedToRoom && !photo.photoId ? (
                    <div className="muted" style={{ fontSize: 11, textAlign: 'center' }}>Kaydediliyor...</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {existingPick && photos.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="muted" style={{ textAlign: 'center' }}>
                Bu odada {existingPick.photos.length} fotoğraf var. Birlikte bakmak için en fazla {MAX_ROOM_PHOTOS} tanesini seç.
              </div>
              <div className="photogrid">
                {existingPick.photos.map((photo, index) => {
                  const selected = existingPick.selected.includes(photo.id);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      className="photothumb"
                      aria-pressed={selected}
                      aria-label={`${index + 1}. fotoğraf`}
                      disabled={!selected && existingPick.selected.length >= MAX_ROOM_PHOTOS}
                      onClick={() => onToggleExisting(photo.id)}
                      style={{ padding: 0, border: 0, outline: selected ? '3px solid var(--teal)' : 'none', outlineOffset: -3 }}
                    >
                      <img src={`/api/rooms/${existingPick.roomId}/photos/${photo.id}`} alt="" />
                      {selected && <span className="photothumb-remove" aria-hidden="true"><CheckIcon style={{ width: 12, height: 12 }} /></span>}
                    </button>
                  );
                })}
              </div>
              <button className="btn-primary" disabled={!existingPick.selected.length} onClick={onAnalyzeExisting}>
                Seçtiklerimle devam et ({existingPick.selected.length}/{MAX_ROOM_PHOTOS})
              </button>
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
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Birlikte değerlendirelim.</h2>
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
            <div>Sestia fotoğrafına bakıyor…</div>
          </div>
        )}

        {analyzeError && <div className="errbox">{analyzeError}</div>}

        {analysis && meta && (
          <div className="rec-banner" style={{ background: `var(--${meta.varName}-tint)` }}>
            <span className="sestia-suggestion">Sestia’nın önerisi</span>
            <div className="rec-head">
              <div className="rec-iconwrap" style={{ background: `var(--${meta.varName})` }}>
                <meta.Icon style={{ width: 18, height: 18 }} />
              </div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600 }}>{meta.title}</div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{analysis.reasoning}</div>
          </div>
        )}

        {/* Sestia'nın fikri ve sorusu — öneriden (banner) ayrı; karar kaydına yazılmaz. */}
        {analysis && joinReplyAndQuestion(analysis.idea, analysis.question) && (
          <div className="card" role="status" aria-live="polite" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
            <div className="label" style={{ color: 'var(--eucalyptus)', marginBottom: 4 }}>{ASSISTANT_NAME.toUpperCase()}</div>
            {joinReplyAndQuestion(analysis.idea, analysis.question)}
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
          {confirming ? 'Kaydediliyor...' : 'Kararımı kaydet'}
        </button>
      </div>
    </section>
  );
}

// Sestia'nın tek mesajı: metin (oda: reply, tek eşya: idea) + question. Promptlar
// metnin soru içermemesini istiyor; model yine de metni soruyla bitirirse
// question eklenmez — kullanıcı tek mesajda art arda iki soru görmesin
// (docs/SESTIA_KARAKTER_ENTEGRASYON_TESTLERI.md, S3).
function joinReplyAndQuestion(reply, question) {
  const text = (reply || '').trim();
  const q = (question || '').trim();
  if (!q || text.endsWith('?')) return text;
  return text ? `${text} ${q}` : q;
}

// Oda seçilmeden başlatılan taramanın analizden sonraki kaydetme adımı:
// mevcut bir odayı seç ya da ad yazıp yeni oda oluştur.
function SaveScanToRoom({ rooms, pendingRoomName, saving, error, onSave }) {
  const [selectedId, setSelectedId] = useState(null);
  const [name, setName] = useState('');
  const canSave = !saving && (pendingRoomName || selectedId !== null || name.trim());

  function submit(e) {
    e.preventDefault();
    if (!canSave) return;
    onSave(selectedId !== null ? { roomId: selectedId } : { name: name.trim() });
  }

  return (
    <form onSubmit={submit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600 }}>Bu çalışmayı bir odaya kaydet</div>
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
        Fotoğraflar, bu analiz ve vereceğin kararlar aynı odada saklanır. Kararlarını onaylamadan önce kaydetmen
        gerekiyor. Kaydetmeden çıkarsan bu tarama saklanmaz.
      </div>
      {pendingRoomName ? (
        <div style={{ fontSize: 13.5 }}>
          {error && !saving ? `“${pendingRoomName}” odasına kaydetme yarım kaldı.` : `“${pendingRoomName}” odasına kaydediliyor...`}
        </div>
      ) : (
        <>
          {rooms.length > 0 && (
            <>
              <div className="label" style={{ color: 'var(--text-muted)' }}>Odalarından birini seç</div>
              <div className="roomchips">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    className={`roomchip${selectedId === room.id ? ' selected' : ''}`}
                    onClick={() => { setSelectedId(selectedId === room.id ? null : room.id); setName(''); }}
                    disabled={saving}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="label" style={{ color: 'var(--text-muted)' }}>
            {rooms.length > 0 ? 'Ya da yeni bir oda oluştur' : 'Yeni bir oda oluştur'}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSelectedId(null); }}
            placeholder="Oda adı, örn. Salon"
            maxLength={60}
            disabled={saving}
            aria-label="Yeni oda adı"
            style={{
              boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12,
              border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 15,
            }}
          />
        </>
      )}
      {error && <div role="alert" className="errbox">{error}</div>}
      <button type="submit" className="btn-outline" disabled={!canSave}>
        {saving ? 'Kaydediliyor...' : pendingRoomName ? 'Tekrar Dene' : 'Odaya Kaydet'}
      </button>
    </form>
  );
}

function RoomReviewView({ photos, analyzing, error, items, onToggleExclude, onSetRec, onBack, onConfirm, confirming,
  messages, chatDraft, onChatDraft, chatBusy, chatError, onSendChat, chatDisabled, scanSaved, scanSaving, onRetryScanSave, readOnly, finalItems,
  needsRoom, rooms, pendingRoomName, onSaveToRoom, saveToRoomError, savedRoomName,
  draftDirty, draftError, onSaveDraft, draftItems, legacyApprovalUnknown, closed, closeReason, onCloseScan, recovery, onLoadRecovery }) {
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
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>{readOnly ? 'Birlikte baktıklarımız' : 'Odaya birlikte bakalım.'}</h2>
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
            <div>Sestia {photos.length > 1 ? 'fotoğrafları' : 'odayı'} inceliyor...</div>
          </div>
        )}

        {error && <div className="errbox">{error}</div>}

        {closed && !finalItems && <div className="muted">{closeReason === 'legacy_unknown' ? 'Eski tarama kapatıldı — onay durumu bilinmiyor' : 'Onaylanmadan kapatıldı.'}</div>}
        {recovery && <div className="card" role="status">
          <p>{recovery.analysis?.confirmed ? 'Kararların sunucuda onaylanmış.' : recovery.analysis?.closed ? 'Bu tarama sunucuda kapatılmış.' : recovery.analysis ? 'Sunucuda kayıtlı bir sürüm bulundu. Açmadan önce kaydedilmemiş değişikliklerin yerine geçeceğini unutma.' : 'Bu oturum için kayıtlı analiz bulunamadı. Odayı yeniden açarak güncel çalışmayı kontrol et.'}</p>
          <button className="btn-outline" onClick={onLoadRecovery}>Sunucudaki kaydı aç</button>
        </div>}

        {!analyzing && messages.length > 0 && (
          <section className="decision-chat" aria-label="Oda hakkında sohbet">
            <h3 style={{ fontSize: 17 }}>Oda hakkında konuşalım</h3>
            <div ref={chatHistoryRef} className="chat-history" role="log" aria-live="polite" aria-relevant="additions">
              {messages.slice(1).map((message, index) => {
                const reply = message.role === 'assistant' ? JSON.parse(message.content) : null;
                const text = reply ? joinReplyAndQuestion(reply.reply, reply.question) : message.content;
                return text ? <p key={index} className={`chat-message chat-${message.role}`}><span className="chat-speaker">{reply ? ASSISTANT_NAME : 'Sen'}</span>{text}</p> : null;
              })}
            </div>
            {readOnly ? null : chatDisabled ? (
              <div className="muted" style={{ fontSize: 12.5 }}>
                {legacyApprovalUnknown ? 'Bu eski tarama salt okunur. Kapatıp odanın içinden yeni tarama başlatabilirsin.' : 'Bu, daha önce kaydedilmiş bir tarama — sohbete devam etmek için fotoğraflar yeniden gerekiyor. İstersen mevcut önerilerle kararlarını verebilirsin.'}
              </div>
            ) : (
              <>
                <form onSubmit={onSendChat} className="chat-form">
                  <label htmlFor="room-chat">Oda veya eşyalar hakkında eklemek istediğin bir şey var mı?</label>
                  <textarea id="room-chat" rows={2} maxLength={2000} value={chatDraft}
                    onChange={e => onChatDraft(e.target.value)} placeholder="İstersen yaz..."
                    disabled={chatBusy || confirming || scanSaving || messages.length >= 42} />
                  <button className="btn-outline" type="submit" disabled={!chatDraft.trim() || chatBusy || confirming || scanSaving || messages.length >= 42}>
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
          const draftMatch = readOnly && !finalItems && draftItems ? draftItems.find(f => f.id === item.id) : null;
          return (
            <div key={item.id} className={`roomcard${(finalMatch || draftMatch || item).excluded ? ' excluded' : ''}`}>
              <div className="roomcard-head">
                <div>
                  <div className="roomcard-title">{item.label}</div>
                  <div className="muted">{item.category}</div>
                </div>
                {!readOnly && !legacyApprovalUnknown && (
                  <button className="iconbtn" disabled={chatBusy || confirming || scanSaving} aria-label={item.excluded ? `${item.label} dahil et` : `${item.label} hariç tut`} style={{ width: 28, height: 28 }} onClick={() => onToggleExclude(index)}>
                    <CloseIcon style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
              {(!item.excluded || readOnly) && (
                <>
                  <div className="muted" style={{ fontSize: 12 }}>{readOnly ? item.modelSuggestion?.reasoning || item.reasoning : item.reasoning}</div>
                  {readOnly || legacyApprovalUnknown ? (
                    <div className="muted">{roomItemSources.suggestionLabel(item, REC_META)}</div>
                  ) : (
                    <>
                      <span className="sestia-suggestion">Öneri: {REC_META[item.modelSuggestion?.recommendation || item.recommendation]?.label}</span>
                      {item.manual && <div className="muted">Senin seçimin: {REC_META[item.recommendation].label}</div>}
                      <div className="roomcard-actions">
                        {ACTION_ORDER.map((key) => {
                          const m = REC_META[key];
                          return (
                            <button
                              key={key}
                              className={`roomcard-actionbtn${item.manual && item.recommendation === key ? ' selected' : ''}`}
                              data-key={key}
                              onClick={() => onSetRec(index, key)}
                              disabled={chatBusy || confirming || scanSaving}
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
              {readOnly && draftMatch && <div className="muted">Kaydedilmiş taslak: {draftMatch.excluded ? 'Hariç tutuldu' : REC_META[draftMatch.recommendation].label}{closed ? ' — tarama kapatıldı.' : ' — henüz onaylanmadı.'}</div>}
            </div>
          );
        })}
      </div>

      {!readOnly && !analyzing && (items.length > 0 || onCloseScan) && (
        <div className="decision-footer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {draftError && <div role="alert" className="errbox">{draftError}</div>}
          {legacyApprovalUnknown && <div className="errbox">Bu eski taramanın daha önce onaylanıp onaylanmadığı doğrulanamıyor. Geçmişin korunuyor; mükerrer karar oluşturmamak için yeniden onay kapalı.</div>}
          {draftDirty && !needsRoom && <div className="card">
            <div>Seçimlerin değişti; taslak henüz kaydedilmedi.</div>
            <button className="btn-outline" disabled={scanSaving || chatBusy || confirming} onClick={onSaveDraft}>{scanSaving ? 'Kaydediliyor...' : 'Taslak Seçimlerini Kaydet'}</button>
          </div>}
          {needsRoom && !scanSaved && (
            <SaveScanToRoom
              rooms={rooms || []}
              pendingRoomName={pendingRoomName}
              saving={scanSaving || chatBusy}
              error={saveToRoomError}
              onSave={onSaveToRoom}
            />
          )}
          {savedRoomName && scanSaved && (
            <div className="muted" role="status" style={{ fontSize: 12.5, textAlign: 'center' }}>
              Bu çalışma “{savedRoomName}” odasına kaydedildi.
            </div>
          )}
          {scanSaved && !draftDirty && !legacyApprovalUnknown && <div className="muted" role="status">Taslak seçimlerin kaydedildi. Kararlar yalnızca onayladığında oluşur.</div>}
          {!needsRoom && !scanSaved && !draftDirty && !legacyApprovalUnknown && (
            <div className="errbox" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>{scanSaving ? 'Analiz kaydediliyor...' : 'Analiz henüz kalıcı olarak kaydedilemedi — kararlarını onaylayamazsın.'}</span>
              {!scanSaving && <button type="button" className="btn-outline" onClick={onRetryScanSave}>Tekrar Dene</button>}
            </div>
          )}
          {onCloseScan && <button className="btn-outline" disabled={scanSaving || chatBusy || confirming} onClick={onCloseScan}>{legacyApprovalUnknown ? 'Bu eski taramayı kapat' : 'Onaylamadan kapat'}</button>}
          <button className="btn-primary" disabled={includedCount === 0 || confirming || chatBusy || scanSaving || draftDirty || legacyApprovalUnknown || !scanSaved} onClick={onConfirm}>
            {confirming ? 'Kaydediliyor...' : `Tümünü Onayla (${includedCount} eşya)`}
          </button>
        </div>
      )}
    </section>
  );
}

function CelebrationView({ celebration, onScanAgain, onHome }) {
  return <section className="view sestia-success"><div className="scroll center" style={{paddingTop:64}}>
    <div style={{width:72,height:72,borderRadius:'50%',background:'var(--teal)',display:'grid',placeItems:'center'}}><CheckIcon style={{width:32,height:32,color:'#fff'}}/></div>
    <h1 style={{fontSize:36,textAlign:'center'}}>Kararın kaydedildi.</h1>
    <div className="card" style={{width:'100%'}}><p>{celebration.summary}</p></div>
    <p className="sestia-stats">+{celebration.pointsGained} puan · {celebration.streak} günlük seri</p>
    <button className="btn-primary" onClick={onHome}>Kaydıma dön <ChevronRightIcon/></button>
    <button className="sestia-text-link" onClick={onScanAgain}>Başka bir eşyaya bak</button>
  </div></section>;
}
