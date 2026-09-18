# 🎓 Smart Bell System – SMAN 1 Sooko

Sistem bel sekolah digital berbasis web yang dirancang untuk mengatur jadwal kegiatan sekolah secara otomatis, fleksibel, dan adaptif terhadap berbagai kondisi seperti pembelajaran normal, ujian, hybrid, hingga skenario khusus.

---

## 🚀 Fitur Utama

### 🟦 Mode Normal

* Menampilkan jadwal pelajaran berbasis jam pelajaran (JP)
* Grid informasi real-time
* Indikator status aktif

### 🟥 Mode Ujian

* Mendukung 1–3 sesi ujian
* 2 mata pelajaran dalam 1 sesi
* Countdown timer per sesi

### 🟪 Mode Hybrid

* Menggabungkan jadwal normal dan ujian
* Ditampilkan dalam satu grid terpusat
* Prioritas informasi dinamis

### 🟨 Mode Custom

* Admin cukup input:

  * Durasi JP
  * Durasi Istirahat 1 & 2
* Sistem otomatis generate jadwal
* Jika durasi istirahat = 0 → otomatis dilewati

---

## ⚙️ Admin Panel (Floating UI – iOS Style)

* Akses melalui tombol ⚙️
* Menggunakan desain glassmorphism
* Mengatur:

  * Mode aktif
  * Konfigurasi Custom
  * Konfigurasi Ujian
* Data disimpan menggunakan `localStorage`

---

## 🧠 Arsitektur Sistem

```bash
smart-bell-system/
│
├── index.html
├── README.md
│
├── /styles
├── /scripts
│   ├── app.js
│   ├── clock.js
│   └── /modes
│
├── /config
└── /assets
```

---

## 🌐 Deployment (Vercel)

1. Push project ke GitHub
2. Login ke Vercel: https://vercel.com
3. Klik **"Add New Project"**
4. Import repository
5. Deploy otomatis 🚀

> Tidak memerlukan backend (static web app)

---

## 💡 Future Development

* 🔐 Admin login system
* ☁️ Integrasi database (Firebase / Supabase)
* 🤖 Machine Learning:

  * Prediksi keterlambatan
  * Adaptasi jadwal otomatis
* 📊 Dashboard monitoring sekolah

---

## 🏫 Use Case

* Sekolah reguler
* Ujian sekolah / CBT
* Jadwal Ramadhan
* Sistem bel otomatis tanpa operator manual

---

## 👨‍🏫 Author

Dikembangkan oleh guru SMAN 1 Sooko Mojokerto
dengan fokus pada inovasi pendidikan dan transformasi digital sekolah.

---

## ⭐ Catatan

Project ini dirancang modular dan scalable, sehingga dapat dikembangkan menjadi sistem manajemen sekolah berbasis digital di masa depan.

