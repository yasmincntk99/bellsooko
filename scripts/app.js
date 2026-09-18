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
function generateSchedule(date = clock.currentTime) {
  const day = date.getDay();

  switch (day) {
    case 1: // Senin
      return SCHEDULE_SENIN;
    case 2: // Selasa
    case 3: // Rabu
    case 4: // Kamis
      return SCHEDULE_SELASA_KAMIS;
    case 5: // Jumat
      return SCHEDULE_JUMAT;
    default: // Sabtu & Minggu
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
// INDONESIA RAYA
// Dimainkan di JAM MULAI sesi pertama hari itu (bukan hardcode 07:00),
// karena tiap hari beda: Senin/Selasa-Kamis/Jumat semua mulai 06:45,
// tapi ini dibuat generic biar kalau jadwal berubah lagi, tetap sinkron.
// ==========================
let lastIndonesiaRayaDate = null;

function checkIndonesiaRaya() {
  if (App.schedule.length === 0) return; // libur, nggak ada sesi pertama

  const now = clock.currentTime;
  const nowHHMM = getNowHHMM();
  const todayKey = now.toDateString();

  const firstSession = App.schedule[0];

  if (
    nowHHMM === firstSession.start &&
    lastIndonesiaRayaDate !== todayKey
  ) {
    playIndonesiaRaya();
    lastIndonesiaRayaDate = todayKey;
  }
}

// ==========================
// LOOP
// ==========================
function loop() {
  updateClockUI();
  updateSession();
  checkIndonesiaRaya();
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
