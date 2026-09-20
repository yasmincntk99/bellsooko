// ==========================
// IMPORT
// ==========================
import clock from "./clock.js";

// ==========================
// GLOBAL STATE
// ==========================
const App = {
  schedule: [],
  scheduleDateKey: null, // buat deteksi pergantian hari, biar jadwal ke-refresh otomatis
  currentSession: null,
  lastBellKey: null,
  triggeredKeys: new Set(), // penanda one-shot per-hari buat announcement transisi & pulang
  isBellEnabled: true,
  mode: "normal",
  isAdminAuthenticated: false // reset tiap reload halaman, sengaja nggak di-persist
};

// ⚠️ CATATAN KEAMANAN: ini kredensial hardcoded di kode FRONTEND, kelihatan
// mentah-mentah di source (DevTools browser -> tab Sources -> file ini).
// Ini cuma nyegah orang iseng klak-klik, BUKAN proteksi beneran terhadap
// orang yang niat (bisa dibaca langsung dari sini, atau di-bypass dengan
// set App.isAdminAuthenticated = true manual lewat console). Kalau nanti
// butuh proteksi sungguhan, itu perlu backend/server, bukan cuma JS di sini.
const ADMIN_CREDENTIALS = {
  username: "adminbell",
  password: "generasibaru"
};

// ==========================
// ELEMENT
// ==========================
const clockEl = document.getElementById("clock");
const scheduleEl = document.getElementById("scheduleContainer");
const currentEl = document.getElementById("currentSession");
const modeIndicator = document.getElementById("mode-indicator");

const gearBtn = document.getElementById("gearBtn");
const adminPanel = document.getElementById("adminPanel");
const modeSelect = document.getElementById("modeSelect");
const applyModeBtn = document.getElementById("applyMode");
const toggleBellBtn = document.getElementById("toggleBell");
const statusEl = document.getElementById("status");

const adminLoginEl = document.getElementById("adminLogin");
const adminControlsEl = document.getElementById("adminControls");
const adminUsernameEl = document.getElementById("adminUsername");
const adminPasswordEl = document.getElementById("adminPassword");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLoginErrorEl = document.getElementById("adminLoginError");

// ==========================
// AUDIO
// ==========================
const bellMasuk = new Audio("/assets/sounds/bellmasuk.mp3");
const indonesiaRaya = new Audio("/assets/sounds/indoraya.mp3");
// ⚠️ FILE BELUM ADA: bellistirahat.mp3 belum di-upload ke assets/sounds/.
// Sampai filenya diupload, .play() bakal gagal diam-diam (di-catch, nggak
// bikin error), tapi chime istirahat-nya nggak akan kedengeran.
const bellIstirahat = new Audio("/assets/sounds/bellistirahat.mp3");
// ⚠️ FILE BELUM ADA: belljp.mp3 belum di-upload ke assets/sounds/.
const bellJp = new Audio("/assets/sounds/belljp.mp3");
// ⚠️ Nama file ini ada SPASI ("bell pulang.mp3", bukan "bellpulang.mp3") -
// beda pola dari file lain (bellmasuk/bellistirahat/belljp yang nggak pakai
// spasi). Di-encode pakai encodeURI() biar aman diakses browser, tapi
// disarankan rename di repo jadi tanpa spasi biar konsisten & nggak rawan
// typo lagi (ini persis jenis bug yang bikin bel pertama sempet nggak
// bunyi di awal-awal project ini).
const bellPulang = new Audio(encodeURI("/assets/sounds/bell pulang.mp3"));
// ⚠️ FILE BELUM ADA JUGA: musik12.mp3 (musik jam 12.00 Senin-Kamis / 12.45 Jumat).
const musik12 = new Audio("/assets/sounds/musik12.mp3");

// unlock autoplay (WAJIB) - pakai SALINAN terpisah (cloneNode) dari tiap
// audio, BUKAN objek audio asli yang dipakai buat pemutaran beneran.
//
// Kenapa: kalau pakai objek yang sama, dan klik pertama di halaman
// KEBETULAN adalah tombol test (misal "Test Musik Jam 12"), maka dalam 1
// event klik yang sama: tombolnya manggil playMusik12() (mulai muter),
// TAPI event itu juga ngebubble ke document.body dan mentrigger unlock,
// yang langsung nge-pause() balik audio yang sama itu - hasilnya diem
// total. Ini sempet kejadian & sudah diverifikasi bukan soal ukuran file.
// Pakai cloneNode() memutus keterkaitan itu; izin autoplay browser sendiri
// berlaku per-halaman (bukan per elemen audio), jadi cukup salinan yang
// di-unlock, objek aslinya ikut kebuka juga buat dipakai kapan saja.
function unlockAudio(audio) {
  try {
    const clone = audio.cloneNode();
    clone.volume = 0; // jaga-jaga kalau pause() nggak keburu secepat play()-nya
    clone.play().then(() => clone.pause()).catch(() => {});
  } catch (e) {
    // no-op, browser lama/aneh - nggak fatal, cuma unlock-nya nggak jalan
  }
}

document.body.addEventListener("click", () => {
  [bellMasuk, indonesiaRaya, bellIstirahat, bellJp, bellPulang, musik12].forEach(unlockAudio);
}, { once: true });

// ==========================
// ADMIN PANEL
// ==========================
gearBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  adminPanel.classList.toggle("show");
});

document.addEventListener("click", (e) => {
  if (
    !adminPanel.contains(e.target) &&
    !gearBtn.contains(e.target)
  ) {
    adminPanel.classList.remove("show");
  }
});

// Login gate - cek username & password, tampilkan admin-body kalau cocok.
// Sekali berhasil login, tetap login sampai halaman di-reload (nggak
// di-persist ke localStorage/sessionStorage, sengaja, biar minimal).
function handleAdminLogin() {
  const username = adminUsernameEl.value.trim();
  const password = adminPasswordEl.value;

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    App.isAdminAuthenticated = true;
    adminLoginErrorEl.style.display = "none";
    adminLoginEl.style.display = "none";
    adminControlsEl.style.display = "";
    adminPasswordEl.value = ""; // jangan nyimpen password di DOM lebih lama dari perlu
  } else {
    adminLoginErrorEl.style.display = "";
    adminPasswordEl.value = "";
  }
}

adminLoginBtn?.addEventListener("click", handleAdminLogin);

// Biar bisa login pakai Enter, bukan cuma klik tombol
adminPasswordEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleAdminLogin();
});

// Mode "exam" / "hybrid" / "custom" belum ada jadwalnya -> jangan pura-pura
// jalan, kasih tau terus terang ke admin daripada diam-diam nggak ngefek.
const MODES_BELUM_TERSEDIA = ["exam", "hybrid", "custom"];

applyModeBtn?.addEventListener("click", () => {
  const selected = modeSelect.value;

  if (MODES_BELUM_TERSEDIA.includes(selected)) {
    if (statusEl) {
      statusEl.innerText = `Mode "${modeSelect.options[modeSelect.selectedIndex].text}" belum tersedia. Tetap memakai jadwal Normal.`;
    }
    modeSelect.value = "normal";
    return;
  }

  App.mode = selected;
  modeIndicator.textContent = `MODE: ${selected.toUpperCase()}`;
  if (statusEl) statusEl.innerText = "Mode Normal diterapkan.";
});

toggleBellBtn?.addEventListener("click", () => {
  App.isBellEnabled = !App.isBellEnabled;
  toggleBellBtn.textContent = App.isBellEnabled ? "Toggle Bell (ON)" : "Toggle Bell (OFF)";
  if (statusEl) {
    statusEl.innerText = App.isBellEnabled ? "Bel diaktifkan." : "Bel dimatikan sementara.";
  }
});

// ==========================
// UTIL
// ==========================
function formatTime(h, m) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getNowHHMM() {
  const now = clock.currentTime;
  return formatTime(now.getHours(), now.getMinutes());
}

// Buat hitung waktu trigger "1 menit sebelum" (dipakai musik12 & pulang,
// yang masih cukup aman dicek per-menit).
function subtractMinutes(hhmm, minutesToSubtract) {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m - minutesToSubtract;
  if (total < 0) total += 24 * 60;
  return formatTime(Math.floor(total / 60), total % 60);
}

// Hitung berapa detik lagi menuju jam "HH:MM" (asumsi detik ke-00) dari
// waktu sekarang. Dipakai buat trigger yang butuh presisi detik (JP: 15
// detik sebelum) - JANGAN dicocokin pakai "===" persis, karena clock jalan
// per-1-detik dan interval bisa meleset dikit (apalagi kalau tab browser
// di-minimize, throttle browser bisa bikin timer ini kelewat). Dengan
// hitung mundur + pengecekan "<=", begitu jendelanya kelewatan dikit pun
// tetep ke-trigger, bukan silently missed.
function secondsUntil(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const now = clock.currentTime;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 1000);
}

// ==========================
// SCHEDULE DATA (MODE NORMAL)
// Sumber: jadwal resmi SMAN 1 SOOKO.
// type dipakai buat styling & buat nentuin apakah suatu blok
// perlu bunyi bel "masuk" biasa atau enggak.
// ==========================
const SCHEDULE_SENIN = [
  { name: "Upacara Bendera", start: "06:45", end: "07:45", type: "special" },
  { name: "JP 1", start: "08:00", end: "08:35", type: "jp" },
  { name: "JP 2", start: "08:35", end: "09:10", type: "jp" },
  { name: "JP 3", start: "09:10", end: "09:45", type: "jp" },
  { name: "JP 4", start: "09:45", end: "10:20", type: "jp" },
  { name: "Istirahat 1", start: "10:20", end: "10:40", type: "istirahat" },
  { name: "JP 5", start: "10:40", end: "11:15", type: "jp" },
  { name: "JP 6", start: "11:15", end: "11:50", type: "jp" },
  { name: "Istirahat 2", start: "11:50", end: "12:40", type: "istirahat" },
  { name: "JP 7", start: "12:40", end: "13:15", type: "jp" },
  { name: "JP 8", start: "13:15", end: "13:50", type: "jp" },
  { name: "JP 9", start: "13:50", end: "14:25", type: "jp" },
  { name: "JP 10", start: "14:25", end: "15:00", type: "jp" }
];

const SCHEDULE_SELASA_KAMIS = [
  { name: "Literasi", start: "06:45", end: "07:15", type: "special" },
  { name: "JP 1", start: "07:15", end: "07:55", type: "jp" },
  { name: "JP 2", start: "07:55", end: "08:35", type: "jp" },
  { name: "JP 3", start: "08:35", end: "09:15", type: "jp" },
  { name: "JP 4", start: "09:15", end: "09:55", type: "jp" },
  { name: "Istirahat 1", start: "09:55", end: "10:15", type: "istirahat" },
  { name: "JP 5", start: "10:15", end: "10:55", type: "jp" },
  { name: "JP 6", start: "10:55", end: "11:35", type: "jp" },
  { name: "Istirahat 2", start: "11:35", end: "12:20", type: "istirahat" },
  { name: "JP 7", start: "12:20", end: "13:00", type: "jp" },
  { name: "JP 8", start: "13:00", end: "13:40", type: "jp" },
  { name: "JP 9", start: "13:40", end: "14:20", type: "jp" },
  { name: "JP 10", start: "14:20", end: "15:00", type: "jp" }
];

const SCHEDULE_JUMAT = [
  { name: "Istighosah", start: "06:45", end: "07:30", type: "special" },
  { name: "JP 1", start: "07:30", end: "08:00", type: "jp" },
  { name: "JP 2", start: "08:00", end: "08:30", type: "jp" },
  { name: "JP 3", start: "08:30", end: "09:00", type: "jp" },
  { name: "JP 4", start: "09:00", end: "09:30", type: "jp" },
  { name: "Istirahat", start: "09:30", end: "10:00", type: "istirahat" },
  { name: "JP 5", start: "10:00", end: "10:30", type: "jp" },
  { name: "JP 6", start: "10:30", end: "11:00", type: "jp" },
  { name: "Sholat Jumat", start: "11:00", end: "12:20", type: "special" }
];

// ==========================
// SCHEDULE GENERATOR
// Dipilih berdasarkan hari (0=Minggu ... 6=Sabtu).
// Sabtu & Minggu belum ada jadwal (libur) -> array kosong.
// ==========================
function getDayGroup(date) {
  const day = date.getDay();
  if (day === 1) return "senin";
  if (day >= 2 && day <= 4) return "selasa_kamis";
  if (day === 5) return "jumat";
  return null; // Sabtu / Minggu
}

function generateSchedule(date = clock.currentTime) {
  switch (getDayGroup(date)) {
    case "senin":
      return SCHEDULE_SENIN;
    case "selasa_kamis":
      return SCHEDULE_SELASA_KAMIS;
    case "jumat":
      return SCHEDULE_JUMAT;
    default:
      return [];
  }
}

// ==========================
// RENDER SCHEDULE
// ==========================
function renderSchedule() {
  scheduleEl.innerHTML = App.schedule.map(s => {
    const active =
      App.currentSession &&
      s.start === App.currentSession.start;

    return `
      <div class="card ${active ? "active" : ""}">
        <h3>${s.name}</h3>
        <p>${s.start} - ${s.end}</p>
      </div>
    `;
  }).join("");
}

// ==========================
// CURRENT SESSION DETECTION
// ==========================
function updateSession() {
  // Kalau hari ganti (misal tab dibiarkan terbuka lewat tengah malam),
  // regenerate jadwal & reset penanda bel supaya nggak kebawa hari sebelumnya.
  const todayKey = clock.currentTime.toDateString();
  if (App.scheduleDateKey !== todayKey) {
    App.schedule = generateSchedule(clock.currentTime);
    App.scheduleDateKey = todayKey;
    App.lastBellKey = null;
    App.triggeredKeys = new Set();
  }

  const now = getNowHHMM();

  const session = App.schedule.find(s => now >= s.start && now < s.end);

  if (session) {
    const key = session.start + session.end;

    if (App.lastBellKey !== key) {
      playChimeFor(session); // bel MASUK/ISTIRAHAT persis di detik pergantian, beda dari chime T-1-menit di atas
      App.lastBellKey = key;
    }
  }

  App.currentSession = session;
}

// ==========================
// RENDER CURRENT
// ==========================
function renderCurrent() {
  if (!App.currentSession) {
    const label = App.schedule.length === 0
      ? "Hari ini libur"
      : "Jeda / di luar jam sekolah";

    currentEl.innerHTML = `<div class="card">${label}</div>`;
    return;
  }

  const s = App.currentSession;

  currentEl.innerHTML = `
    <div class="card active">
      <h2>${s.name}</h2>
      <p>${s.start} - ${s.end}</p>
    </div>
  `;
}

// ==========================
// CLOCK UI
// ==========================
function updateClockUI() {
  clockEl.innerText = clock.currentTime.toLocaleTimeString("id-ID");
}

// ==========================
// BELL FUNCTIONS
// ==========================
function playBellMasuk() {
  if (!App.isBellEnabled) return;

  bellMasuk.currentTime = 0;
  bellMasuk.play().catch(() => {});
}

function playIndonesiaRaya() {
  indonesiaRaya.currentTime = 0;
  indonesiaRaya.play().catch(() => {});
}

function playBellIstirahat() {
  if (!App.isBellEnabled) return;

  bellIstirahat.currentTime = 0;
  bellIstirahat.play().catch(() => {});
}

function playBellJp() {
  if (!App.isBellEnabled) return;

  bellJp.currentTime = 0;
  bellJp.play().catch(() => {});
}

function playBellPulang() {
  if (!App.isBellEnabled) return;

  bellPulang.currentTime = 0;
  bellPulang.play().catch(() => {});
}

function playMusik12() {
  if (!App.isBellEnabled) return;

  musik12.currentTime = 0;
  musik12.play().catch(() => {});
}

// Pilih chime yang tepat berdasarkan JENIS sesi yang mau dimasuki:
// - "istirahat"           -> bellistirahat.mp3 (mau istirahat)
// - "jp"                  -> belljp.mp3 (pergantian ke jam pelajaran)
// - lainnya ("special": Upacara, Literasi, Istighosah, Sholat Jumat,
//   termasuk sesi pertama tiap hari) -> bellmasuk.mp3
function playChimeFor(session) {
  if (session.type === "istirahat") {
    playBellIstirahat();
  } else if (session.type === "jp") {
    playBellJp();
  } else {
    playBellMasuk();
  }
}

// ==========================
// ANNOUNCEMENT (TTS) - jam 06:45
// ⚠️ TODO: teks ini masih DRAFT (termasuk JP/KO/AR, hasil terjemahan sendiri,
// belum dicek penutur asli), tunggu revisi final dari sekolah.
// Format: array of segments, diputar berurutan sesuai urutan array-nya.
// Struktur ini sengaja generic (bukan field id/en tetap) supaya nambah/kurang
// bahasa di masa depan cukup edit data ini, tanpa ubah logic pemutaran.
// ==========================
const ANNOUNCEMENTS = {
  senin: [
    { lang: "id-ID", text: "Perhatian, kepada seluruh siswa dan bapak ibu guru, dimohon segera menuju lapangan upacara. Upacara bendera akan segera dimulai." },
    { lang: "en-US", text: "Attention, all students and teachers are requested to proceed to the ceremony field immediately. The flag ceremony will begin shortly." },
    { lang: "ja-JP", text: "生徒および教職員の皆様にお知らせします。直ちに式典広場へ移動してください。まもなく国旗掲揚式が始まります。" }
  ],
  selasa_kamis: [
    { lang: "id-ID", text: "Selamat pagi, seluruh siswa dimohon memasuki kelas masing-masing untuk memulai kegiatan literasi pagi." },
    { lang: "en-US", text: "Good morning, all students are requested to enter their classrooms to begin the morning literacy session." },
    { lang: "ko-KR", text: "안녕하세요, 모든 학생 여러분은 각자의 교실로 들어가 아침 문해력 활동을 시작해 주시기 바랍니다." }
  ],
  jumat: [
    { lang: "id-ID", text: "Selamat pagi, seluruh siswa dan bapak ibu guru dimohon menuju tempat istighosah untuk mengikuti kegiatan istighosah pagi." },
    { lang: "en-US", text: "Good morning, all students and teachers are requested to proceed to the designated area for the morning Istighosah session." },
    { lang: "ar-SA", text: "صباح الخير، يُرجى من جميع الطلاب والمعلمين التوجه إلى المكان المخصص لحضور جلسة الاستغاثة الصباحية." }
  ]
};

// Cari voice yang paling mendekati "suara perempuan" untuk bahasa tertentu.
// CATATAN JUJUR: Web Speech API TIDAK punya field gender resmi. Ini cuma
// heuristik nebak dari nama voice-nya. Kalau device cuma punya 1 voice
// untuk bahasa itu dan kebetulan suara pria, hasilnya ya tetap suara pria -
// nggak ada cara memaksa gender lewat kode di browser manapun.
const FEMALE_VOICE_HINTS = [
  "female", "wanita", "perempuan", "zira", "samantha", "susan",
  "gadis", "ayu", "damayanti", "heera", "salli", "joanna", "ivy"
];

function pickFemaleVoice(langPrefix, voices) {
  const matches = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
  if (matches.length === 0) return null;

  const femaleMatch = matches.find(v =>
    FEMALE_VOICE_HINTS.some(hint => v.name.toLowerCase().includes(hint))
  );

  return femaleMatch || matches[0]; // kalau nggak ketemu, pakai voice pertama yang ada buat bahasa itu
}

// Voice list di beberapa browser di-load async, jadi getVoices() awal bisa kosong.
function waitForVoices() {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000); // jaga-jaga kalau event nggak pernah fire
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mainkan 1 kalimat TTS dengan voice perempuan (best-effort), resolve setelah
// selesai (atau langsung kalau error/nggak didukung) biar bisa disusun
// berurutan (ID dulu, baru EN) tanpa numpuk/tabrakan.
async function speak(text, lang) {
  if (!("speechSynthesis" in window)) return;

  const voices = await waitForVoices();
  const langPrefix = lang.split("-")[0];
  const hasAnyVoiceForLang = voices.some(v => v.lang.toLowerCase().startsWith(langPrefix));

  if (!hasAnyVoiceForLang) {
    console.warn(`[TTS] Tidak ada voice terpasang untuk bahasa "${lang}" di device ini. Pengumuman tetap dicoba diputar pakai voice default, tapi kemungkinan pelafalannya salah/tidak terbaca.`);
  }

  const voice = pickFemaleVoice(langPrefix, voices);

  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    if (voice) utter.voice = voice;
    utter.onend = resolve;
    utter.onerror = resolve; // jangan sampai 1 error bikin urutan macet total
    window.speechSynthesis.speak(utter);
  });
}

// Bel di momen ini dipilih otomatis via playChimeFor() berdasarkan tipe sesi.
// Sesi PERTAMA hari itu (isFirstSessionOfDay = true) pakai flow "pembukaan
// hari": jeda 5 detik lalu pengumuman lengkap 3 bahasa dari ANNOUNCEMENTS,
// ditutup Indonesia Raya. Sesi lainnya pakai flow "transisi rutin": jeda
// pendek lalu template singkat 3 bahasa yang nyebut countdown-nya (60 detik
// buat istirahat/special, 15 detik buat JP - lihat checkTransitionAnnouncements).
async function playSessionAnnouncement(session, dayGroup, isFirstSessionOfDay, countdownSeconds = 60) {
  playChimeFor(session);

  if (isFirstSessionOfDay) {
    await sleep(5000);

    const segments = ANNOUNCEMENTS[dayGroup];
    if (!segments || segments.length === 0) return;

    if (!("speechSynthesis" in window)) {
      if (statusEl) {
        statusEl.innerText = "Browser ini tidak mendukung Text-to-Speech, pengumuman pagi dilewati.";
      }
      playIndonesiaRaya();
      return;
    }

    for (const segment of segments) {
      await speak(segment.text, segment.lang);
    }

    playIndonesiaRaya();
    return;
  }

  // Jeda lebih pendek buat JP (jendela cuma 15 detik, nggak boleh boros waktu)
  await sleep(countdownSeconds < 60 ? 500 : 1500);

  if (!("speechSynthesis" in window)) return;

  const langs = getLangsForDay(dayGroup);
  for (const lang of langs) {
    const template = TRANSITION_TEMPLATES[lang] || TRANSITION_TEMPLATES["id-ID"];
    await speak(template(session.name, countdownSeconds), lang);
  }
}

// ==========================
// TRANSITION & DISMISSAL ANNOUNCEMENT (TTS, 3 bahasa - sama kayak
// pengumuman pagi harinya, bahasa ke-3 ngikut dayGroup)
// ⚠️ TODO: teks JA/KO/AR masih DRAFT, sama seperti ANNOUNCEMENTS di atas,
// belum dicek penutur asli.
// Nama sesi berikutnya (mis. "JP 5", "Istirahat 1") sengaja TIDAK
// diterjemahkan - dipakai apa adanya di semua bahasa, karena itu istilah
// internal sekolah, bukan kosakata umum yang punya padanan baku.
// ==========================
// ==========================
// TRANSITION & DISMISSAL ANNOUNCEMENT (TTS, 3 bahasa - sama kayak
// pengumuman pagi harinya, bahasa ke-3 ngikut dayGroup)
// ⚠️ TODO: teks JA/KO/AR masih DRAFT, sama seperti ANNOUNCEMENTS di atas,
// belum dicek penutur asli.
// Nama sesi berikutnya (mis. "JP 5", "Istirahat 1") sengaja TIDAK
// diterjemahkan - dipakai apa adanya di semua bahasa, karena itu istilah
// internal sekolah, bukan kosakata umum yang punya padanan baku.
//
// Kalimatnya nyebut durasi countdown yang SESUAI kejadiannya - JP cuma
// 15 detik sebelum, sisanya (istirahat/special) 1 menit sebelum. Kalau
// nggak dibedain, TTS-nya bakal ngomong info yang salah (misal bilang
// "satu menit lagi" padahal cuma 15 detik).
// ==========================
const TRANSITION_TEMPLATES = {
  "id-ID": (name, seconds) => seconds < 60
    ? `Perhatian, ${seconds} detik lagi memasuki ${name}.`
    : `Perhatian, satu menit lagi memasuki ${name}.`,
  "en-US": (name, seconds) => seconds < 60
    ? `Attention, ${seconds} seconds remaining until ${name}.`
    : `Attention, one minute remaining until ${name}.`,
  "ja-JP": (name, seconds) => seconds < 60
    ? `ご案内いたします。まもなく${seconds}秒後に${name}が始まります。`
    : `ご案内いたします。まもなく1分後に${name}が始まります。`,
  "ko-KR": (name, seconds) => seconds < 60
    ? `안내 말씀 드립니다. ${seconds}초 후에 ${name}이 시작됩니다.`
    : `안내 말씀 드립니다. 1분 후에 ${name}이 시작됩니다.`,
  "ar-SA": (name, seconds) => seconds < 60
    ? `تنبيه، سيبدأ ${name} بعد ${seconds} ثانية.`
    : `تنبيه، سيبدأ ${name} بعد دقيقة واحدة.`
};

const DISMISSAL_TEXTS = {
  "id-ID": "Kegiatan belajar mengajar hari ini telah selesai. Seluruh siswa dipersilakan meninggalkan sekolah dengan tertib. Sampai jumpa besok.",
  "en-US": "Today's school activities have ended. All students are requested to leave the school in an orderly manner. See you tomorrow.",
  "ja-JP": "本日の授業はすべて終了しました。生徒の皆さんは、静かに、整然と学校を離れてください。また明日お会いしましょう。",
  "ko-KR": "오늘 수업이 모두 종료되었습니다. 학생 여러분은 질서 있게 하교해 주시기 바랍니다. 내일 또 만나요.",
  "ar-SA": "انتهت الأنشطة الدراسية لهذا اليوم. يُرجى من جميع الطلاب مغادرة المدرسة بنظام. نراكم غدًا."
};

// Ambil urutan bahasa yang dipakai hari itu, sama persis kayak ANNOUNCEMENTS
// pembuka pagi, biar konsisten (Senin=ID/EN/JA, Selasa-Kamis=ID/EN/KO, dst).
function getLangsForDay(dayGroup) {
  const segments = ANNOUNCEMENTS[dayGroup];
  return segments ? segments.map(s => s.lang) : ["id-ID", "en-US"];
}

// Chime -> jeda pendek -> announcement 3 bahasa. Jeda di sini sengaja lebih
// pendek (1.5 detik) daripada jeda 5 detik di pembukaan pagi, karena ini
// pengumuman rutin & singkat, bukan sesi pembukaan hari.
async function playDismissalAnnouncement(dayGroup) {
  playBellPulang();
  await sleep(1500);

  const langs = getLangsForDay(dayGroup);
  for (const lang of langs) {
    const text = DISMISSAL_TEXTS[lang] || DISMISSAL_TEXTS["id-ID"];
    await speak(text, lang);
  }
}

// Dicek tiap detik untuk SEMUA entri jadwal (termasuk entri pertama hari
// itu). Jendela waktunya beda per tipe:
// - "jp"                    -> 15 detik sebelum jam mulainya
// - lainnya (istirahat/special, termasuk sesi pertama) -> 60 detik sebelum
// Pakai secondsUntil() + "<=" (bukan cocokin persis), biar nggak silently
// missed kalau tick clock-nya meleset dikit (lihat catatan di secondsUntil).
// Generic - otomatis jalan buat JP, istirahat, Upacara/Literasi/Istighosah,
// MAUPUN "Sholat Jumat", tanpa perlu ditulis satu-satu.
//
// Musik jam 12:00 (Senin-Kamis) / 12:45 (Jumat) dicek terpisah karena itu
// bukan bagian dari transisi sesi, cuma pemutaran musik di jam tetap.
//
// Pulang dipicu PERSIS di jam berakhirnya entri terakhir hari itu.
function checkTransitionAnnouncements() {
  if (App.schedule.length === 0) return;

  const nowHHMM = getNowHHMM();
  const todayKey = clock.currentTime.toDateString();
  const dayGroup = getDayGroup(clock.currentTime);

  for (let i = 0; i < App.schedule.length; i++) {
    const session = App.schedule[i];
    const countdownSeconds = session.type === "jp" ? 15 : 60;
    const secondsLeft = secondsUntil(session.start);
    const key = `${todayKey}-transisi-${i}`;

    if (
      secondsLeft <= countdownSeconds &&
      secondsLeft >= 0 &&
      !App.triggeredKeys.has(key)
    ) {
      App.triggeredKeys.add(key);
      playSessionAnnouncement(session, dayGroup, i === 0, countdownSeconds);
    }
  }

  const lastSession = App.schedule[App.schedule.length - 1];
  const dismissalKey = `${todayKey}-pulang`;

  if (nowHHMM === lastSession.end && !App.triggeredKeys.has(dismissalKey)) {
    App.triggeredKeys.add(dismissalKey);
    playDismissalAnnouncement(dayGroup);
  }
}

// ==========================
// MUSIK JAM 12 (Senin-Kamis 12:00, Jumat 12:45)
// ⚠️ CATATAN: parenthetical "15 menit setelah bel istirahat ke-2" yang
// disebutkan awalnya SECARA MATEMATIS nggak persis pas 12:00 untuk Senin
// (istirahat 2 mulai 11:50) vs Selasa-Kamis (istirahat 2 mulai 11:35) -
// selisihnya beda 15 menit antara 2 kelompok hari itu. Di sini aku pakai
// ANGKA LITERAL yang diminta (12:00 & 12:45), bukan hasil turunan rumus,
// jadi kalau ternyata yang dimaksud beda per hari, tinggal kabari.
// ==========================
function checkMusik12() {
  const dayGroup = getDayGroup(clock.currentTime);
  if (!dayGroup) return; // libur

  const nowHHMM = getNowHHMM();
  const todayKey = clock.currentTime.toDateString();
  const key = `${todayKey}-musik12`;
  const triggerTime = dayGroup === "jumat" ? "12:45" : "12:00";

  if (nowHHMM === triggerTime && !App.triggeredKeys.has(key)) {
    App.triggeredKeys.add(key);
    playMusik12();
  }
}

// ==========================
// LOOP
// ==========================
function loop() {
  updateClockUI();
  updateSession();
  checkTransitionAnnouncements();
  checkMusik12();
  renderCurrent();
  renderSchedule();
}

// ==========================
// INIT
// ==========================
function start() {
  App.schedule = generateSchedule(clock.currentTime);
  App.scheduleDateKey = clock.currentTime.toDateString();

  clock.onTick(loop);
  clock.start();
}

document.addEventListener("DOMContentLoaded", start);

// ==========================
// GLOBAL (UNTUK TEST BUTTON)
// ==========================
window.playBellMasuk = playBellMasuk;
window.playBellIstirahat = playBellIstirahat;
window.playBellJp = playBellJp;
window.playBellPulang = playBellPulang;
window.playIndonesiaRaya = playIndonesiaRaya;
window.playMusik12 = playMusik12;
window.testAnnouncement = (dayGroup) => {
  const group = dayGroup || getDayGroup(clock.currentTime);
  const session = App.schedule[0];
  if (!session) {
    console.warn("Hari ini libur, nggak ada sesi pertama buat ditest.");
    return;
  }
  playSessionAnnouncement(session, group, true);
};
window.testTransition = (index = 1) => {
  const dayGroup = getDayGroup(clock.currentTime);
  const session = App.schedule[index];
  if (!session) {
    console.warn(`Index ${index} nggak ada di jadwal hari ini (panjang jadwal: ${App.schedule.length}).`);
    return;
  }
  playSessionAnnouncement(session, dayGroup, false);
};
window.testDismissal = () => playDismissalAnnouncement(getDayGroup(clock.currentTime));
