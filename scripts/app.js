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
// ⚠️ FILE BELUM ADA: bellistirahat.mp3 belum di-upload ke assets/sounds/.
// Sampai filenya diupload, .play() bakal gagal diam-diam (di-catch, nggak
// bikin error), tapi chime istirahat-nya nggak akan kedengeran.
const bellIstirahat = new Audio("/assets/sounds/bellistirahat.mp3");
// ⚠️ FILE BELUM ADA JUGA: musik12.mp3 (musik jam 12.00 Senin-Kamis / 12.45 Jumat).
const musik12 = new Audio("/assets/sounds/musik12.mp3");

// unlock autoplay (WAJIB)
document.body.addEventListener("click", () => {
  bellMasuk.play().catch(()=>{});
  indonesiaRaya.play().catch(()=>{});
  bellIstirahat.play().catch(()=>{});
  musik12.play().catch(()=>{});
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

// Buat hitung waktu trigger "1 menit sebelum". Handle wrap tengah malam
// (walau nggak kepakai buat jam sekolah, tetep aman kalau dipanggil jam 00:xx).
function subtractMinutes(hhmm, minutesToSubtract) {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m - minutesToSubtract;
  if (total < 0) total += 24 * 60;
  return formatTime(Math.floor(total / 60), total % 60);
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

function playMusik12() {
  if (!App.isBellEnabled) return;

  musik12.currentTime = 0;
  musik12.play().catch(() => {});
}

// Pilih chime yang tepat berdasarkan JENIS sesi yang mau dimasuki:
// - "istirahat" -> bellistirahat.mp3 (bel mau istirahat)
// - lainnya (jp / special seperti Upacara, Literasi, Istighosah, Sholat
//   Jumat) -> bellmasuk.mp3 (bel masuk), termasuk sesi pertama tiap hari.
function playChimeFor(session) {
  if (session.type === "istirahat") {
    playBellIstirahat();
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

// Bel di momen ini dipilih otomatis via playChimeFor() berdasarkan tipe sesi
// (masuk vs istirahat). Sesi PERTAMA hari itu (isFirstSessionOfDay = true)
// pakai flow "pembukaan hari": jeda 5 detik lalu pengumuman lengkap 3 bahasa
// dari ANNOUNCEMENTS, ditutup Indonesia Raya. Sesi lainnya pakai flow
// "transisi rutin": jeda 1.5 detik lalu template singkat 3 bahasa.
async function playSessionAnnouncement(session, dayGroup, isFirstSessionOfDay) {
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

  await sleep(1500);

  if (!("speechSynthesis" in window)) return;

  const langs = getLangsForDay(dayGroup);
  for (const lang of langs) {
    const template = TRANSITION_TEMPLATES[lang] || TRANSITION_TEMPLATES["id-ID"];
    await speak(template(session.name), lang);
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
const TRANSITION_TEMPLATES = {
  "id-ID": (name) => `Perhatian, satu menit lagi memasuki ${name}.`,
  "en-US": (name) => `Attention, one minute remaining until ${name}.`,
  "ja-JP": (name) => `ご案内いたします。まもなく1分後に${name}が始まります。`,
  "ko-KR": (name) => `안내 말씀 드립니다. 1분 후에 ${name}이 시작됩니다.`,
  "ar-SA": (name) => `تنبيه، سيبدأ ${name} بعد دقيقة واحدة.`
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
  playBellMasuk(); // dismissal pakai bel masuk juga (bukan bel istirahat)
  await sleep(1500);

  const langs = getLangsForDay(dayGroup);
  for (const lang of langs) {
    const text = DISMISSAL_TEXTS[lang] || DISMISSAL_TEXTS["id-ID"];
    await speak(text, lang);
  }
}

// Dicek tiap detik untuk SEMUA entri jadwal (termasuk entri pertama hari
// itu), kalau sekarang persis H-1 menit dari jam mulainya, jalankan
// playSessionAnnouncement (chime yang sesuai + isi pengumumannya).
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
    const triggerTime = subtractMinutes(session.start, 1);
    const key = `${todayKey}-transisi-${i}`;

    if (nowHHMM === triggerTime && !App.triggeredKeys.has(key)) {
      App.triggeredKeys.add(key);
      playSessionAnnouncement(session, dayGroup, i === 0);
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
