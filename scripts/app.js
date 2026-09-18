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
  isBellEnabled: true,
  mode: "normal"
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

// ==========================
// AUDIO
// ==========================
const bellMasuk = new Audio("/assets/sounds/bellmasuk.mp3");
const indonesiaRaya = new Audio("/assets/sounds/indoraya.mp3");

// unlock autoplay (WAJIB)
document.body.addEventListener("click", () => {
  bellMasuk.play().catch(()=>{});
  indonesiaRaya.play().catch(()=>{});
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
  }

  const now = getNowHHMM();

  const session = App.schedule.find(s => now >= s.start && now < s.end);

  if (session) {
    const key = session.start + session.end;

    if (App.lastBellKey !== key) {
      playBellMasuk();
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

// ==========================
// ANNOUNCEMENT (TTS) - jam 06:45
// ⚠️ TODO: teks ini masih DRAFT, tunggu revisi final dari sekolah.
// Format: { id: teks Bahasa Indonesia, en: teks Bahasa Inggris }
// ==========================
const ANNOUNCEMENTS = {
  senin: {
    id: "Perhatian, kepada seluruh siswa dan bapak ibu guru, dimohon segera menuju lapangan upacara. Upacara bendera akan segera dimulai.",
    id: "Perhatian, kepada seluruh siswa dan bapak ibu guru, dimohon segera menuju lapangan upacara. Upacara bendera akan segera dimulai.",
    en: "Attention, all students and teachers are requested to proceed to the ceremony field immediately. The flag ceremony will begin shortly."
  },
  selasa_kamis: {
    id: "Selamat pagi, seluruh siswa dimohon memasuki kelas masing-masing untuk memulai kegiatan literasi Al quran.",
    id: "Selamat pagi, seluruh siswa dimohon memasuki kelas masing-masing untuk memulai kegiatan literasi Al quran.",
    en: "Good morning, all students are requested to enter their classrooms to begin the morning literacy session."
  },
  jumat: {
    id: "Selamat pagi, seluruh siswa dan bapak ibu guru dimohon masuk kelas untuk mengikuti kegiatan istighosah pagi.",
    id: "Selamat pagi, seluruh siswa dan bapak ibu guru dimohon masuk kelas untuk mengikuti kegiatan istighosah pagi.",
    en: "Good morning, all students and teachers are requested to proceed to classroom for the morning Istighosah session."
  }
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
  const voice = pickFemaleVoice(lang.split("-")[0], voices);

  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    if (voice) utter.voice = voice;
    utter.onend = resolve;
    utter.onerror = resolve; // jangan sampai 1 error bikin urutan macet total
    window.speechSynthesis.speak(utter);
  });
}

// Bel di momen ini sudah otomatis bunyi lewat updateSession() (mekanisme umum
// tiap pergantian sesi). Di sini kita cuma nunggu 5 detik lalu nyusul
// pengumuman ID -> EN -> Indonesia Raya, ala PA system bandara/stasiun.
async function playMorningAnnouncement(dayGroup) {
  const ann = ANNOUNCEMENTS[dayGroup];
  if (!ann) return;

  await sleep(5000);

  if (!("speechSynthesis" in window)) {
    if (statusEl) {
      statusEl.innerText = "Browser ini tidak mendukung Text-to-Speech, pengumuman pagi dilewati.";
    }
    playIndonesiaRaya();
    return;
  }

  await speak(ann.id, "id-ID");
  await speak(ann.en, "en-US");
  playIndonesiaRaya();
}

// ==========================
// SESI PEMBUKA HARI (06:45): pengumuman TTS -> lanjut Indonesia Raya
// Dipicu di JAM MULAI sesi pertama hari itu, bukan hardcode 07:00,
// karena Senin/Selasa-Kamis/Jumat semua mulai 06:45.
// ==========================
let lastMorningTriggerDate = null;

function checkMorningSequence() {
  if (App.schedule.length === 0) return; // libur, nggak ada sesi pertama

  const nowHHMM = getNowHHMM();
  const todayKey = clock.currentTime.toDateString();
  const firstSession = App.schedule[0];

  if (nowHHMM === firstSession.start && lastMorningTriggerDate !== todayKey) {
    const dayGroup = getDayGroup(clock.currentTime);
    playMorningAnnouncement(dayGroup);
    lastMorningTriggerDate = todayKey;
  }
}

// ==========================
// LOOP
// ==========================
function loop() {
  updateClockUI();
  updateSession();
  checkMorningSequence();
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
window.playIndonesiaRaya = playIndonesiaRaya;
window.testAnnouncement = (dayGroup) =>
  playMorningAnnouncement(dayGroup || getDayGroup(clock.currentTime));
