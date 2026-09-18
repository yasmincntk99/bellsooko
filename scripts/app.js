// ==========================
// IMPORT
// ==========================
import clock from "./clock.js";

// ==========================
// GLOBAL STATE
// ==========================
const App = {
  schedule: [],
  currentSession: null,
  lastBellKey: null,
  isBellEnabled: true
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
// SCHEDULE GENERATOR
// ==========================
function generateSchedule() {
  let startHour = 7;
  let startMinute = 0;

  const result = [];

  for (let i = 1; i <= 8; i++) {
    const start = formatTime(startHour, startMinute);

    startMinute += 45;
    if (startMinute >= 60) {
      startHour++;
      startMinute -= 60;
    }

    const end = formatTime(startHour, startMinute);

    result.push({
      name: "JP " + i,
      start,
      end
    });
  }

  return result;
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
  const now = getNowHHMM();

  const session = App.schedule.find(s => {
    return now >= s.start && now < s.end;
  });

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
    currentEl.innerHTML = "Belum mulai";
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
// INDONESIA RAYA (07:00 SENIN–JUMAT)
// ==========================
let lastIndonesiaRayaDate = null;

function checkIndonesiaRaya() {
  const now = clock.currentTime;

  const day = now.getDay(); // 0=minggu, 1=senin
  const hours = now.getHours();
  const minutes = now.getMinutes();

  const todayKey = now.toDateString();

  if (
    day >= 1 && day <= 5 &&
    hours === 7 &&
    minutes === 0 &&
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
  App.schedule = generateSchedule();

  clock.onTick(loop);
  clock.start();
}

document.addEventListener("DOMContentLoaded", start);

// ==========================
// GLOBAL (UNTUK TEST BUTTON)
// ==========================
window.playBellMasuk = playBellMasuk;
window.playIndonesiaRaya = playIndonesiaRaya;
