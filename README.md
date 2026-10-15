# 🏥 Monitor Antrian Poliklinik Rawat Jalan — RS AMC Muhammadiyah

> **Versi**: 2.10  
> **Dibuat oleh**: Tim IT RS AMC Muhammadiyah Yogyakarta

Aplikasi web *real-time* untuk menampilkan dan memantau antrian pasien poliklinik rawat jalan di RS AMC Muhammadiyah. Data disinkronkan langsung dari server antrian internal rumah sakit setiap **15 detik**.

---

## 📑 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Arsitektur \& Tech Stack](#-arsitektur--tech-stack)
- [Struktur Direktori](#-struktur-direktori)
- [Petunjuk Teknis (Developer)](#-petunjuk-teknis-developer)
  - [Prasyarat](#prasyarat)
  - [Instalasi \& Menjalankan Lokal](#instalasi--menjalankan-lokal)
  - [Konfigurasi API Key](#konfigurasi-api-key)
  - [Deployment Produksi](#deployment-produksi)
  - [Penjelasan Alur Data](#penjelasan-alur-data)
  - [Menambah Ikon Poliklinik Baru](#menambah-ikon-poliklinik-baru)
- [Petunjuk Penggunaan (User)](#-petunjuk-penggunaan-user)
  - [Mengakses Halaman](#1-mengakses-halaman)
  - [Melihat Antrian Poliklinik](#2-melihat-antrian-poliklinik)
  - [Cek Antrian Saya](#3-cek-antrian-saya)
  - [Filter Kartu Poliklinik](#4-filter-kartu-poliklinik)
  - [Mode Gelap / Terang](#5-mode-gelap--terang)
  - [Memahami Status Kartu](#6-memahami-status-kartu)
  - [Tips \& Catatan Penting](#7-tips--catatan-penting)
- [Kontak](#-kontak)

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| **Live Sync** | Data antrian otomatis diperbarui setiap 15 detik tanpa perlu *reload* halaman |
| **Cek Antrian Saya** | Pasien dapat mengecek posisi antrean, jumlah pasien di depan, dan estimasi waktu giliran |
| **Kartu Poliklinik** | Setiap jadwal dokter ditampilkan dalam kartu informatif (status dokter, nomor sedang diperiksa, statistik antrean) |
| **Filter Klinik & Dokter** | Saring tampilan kartu berdasarkan nama klinik dan/atau dokter |
| **Mode Gelap** | Mendukung mode terang dan gelap, preferensi tersimpan di browser |
| **Responsif** | Tampilan optimal di desktop, tablet, maupun ponsel |
| **Skeleton Loading** | Tampilan *placeholder* saat data masih dimuat pertama kali |
| **Tombol Kembali ke Atas** | Muncul otomatis saat halaman digulir ke bawah |

---

## 🏗 Arsitektur & Tech Stack

```
┌───────────────┐        ┌──────────────┐        ┌─────────────────────┐
│   Browser     │  HTTP  │  proxy.php   │  HTTP  │ Server Antrian RS   │
│  (HTML/CSS/JS)│───────►│ (PHP Proxy)  │───────►│ 172.16.24.137:8080  │
│               │◄───────│              │◄───────│ /api/antrian        │
└───────────────┘  JSON  └──────────────┘  JSON  └─────────────────────┘
```

| Layer | Teknologi |
|---|---|
| **Frontend** | HTML5, Vanilla CSS, Vanilla JavaScript (tanpa framework) |
| **Font** | Google Fonts — Plus Jakarta Sans, Poppins |
| **Backend Proxy** | PHP (built-in server / Apache / Nginx) |
| **API Sumber** | REST API internal RS (`http://172.16.24.137:8080/api/antrian`) |
| **Autentikasi API** | Header `x-api-key` dikirim oleh proxy |

---

## 📁 Struktur Direktori

```
AMC/
├── index.html          # Halaman utama (single page)
├── style.css           # Seluruh styling (termasuk mode gelap & responsif)
├── script.js           # Logika JavaScript (fetch data, render kartu, filter, dll.)
├── proxy.php           # PHP proxy — meneruskan request ke API RS dengan API key
├── img/
│   ├── Favicon.png     # Ikon tab browser
│   ├── logo_baru.png   # Logo RS AMC
│   ├── AMC-tanpa-nama.png
│   ├── AMC-tanpa-nama-pad.png
│   ├── Logo AMC Jadi Lebih Sehat.png
│   └── Icon Poli/      # 29 ikon poliklinik (PNG)
│       ├── anak.png
│       ├── bedah.png
│       ├── gigi.png
│       ├── jantung.png
│       ├── mata.png
│       ├── paru.png
│       └── ... (dan lainnya)
└── README.md           # Dokumentasi ini
```

---

## 🔧 Petunjuk Teknis (Developer)

### Prasyarat

| Kebutuhan | Versi Minimum | Keterangan |
|---|---|---|
| **PHP** | 7.4+ | Untuk menjalankan `proxy.php` (built-in web server) |
| **Browser Modern** | Chrome 90+, Firefox 88+, Edge 90+ | Mendukung ES6+, `fetch`, CSS custom properties |
| **Akses Jaringan** | — | Komputer harus bisa menjangkau `172.16.24.137:8080` (jaringan internal RS) |

### Instalasi & Menjalankan Lokal

1. **Clone atau salin** folder proyek ke komputer Anda:

   ```bash
   git clone <url-repo> AMC
   cd AMC
   ```

2. **Jalankan PHP built-in server**:

   ```bash
   php -S 0.0.0.0:8000 -t .
   ```

   > Perintah di atas membuka server di port `8000`, bisa diakses dari perangkat lain dalam jaringan yang sama.

3. **Buka browser** dan akses:

   ```
   http://localhost:8000
   ```

   Atau dari perangkat lain dalam jaringan:

   ```
   http://<IP-KOMPUTER-SERVER>:8000
   ```

4. Jika data berhasil dimuat, kartu-kartu poliklinik akan muncul menggantikan *skeleton loading*.

### Konfigurasi API Key

API key digunakan `proxy.php` untuk mengautentikasi ke server antrian RS.

- **Environment Variable (Direkomendasikan untuk produksi)**:

  ```bash
  # Linux / macOS
  export ANTRIAN_API_KEY="kunci-api-anda"
  php -S 0.0.0.0:8000 -t .

  # Windows (PowerShell)
  $env:ANTRIAN_API_KEY = "kunci-api-anda"
  php -S 0.0.0.0:8000 -t .
  ```

- **Fallback Bawaan**: Jika env tidak di-set, `proxy.php` menggunakan key literal di source code (hanya untuk pengembangan lokal, **jangan** gunakan di produksi).

### Deployment Produksi

Untuk deployment di server (Apache / Nginx):

1. Salin seluruh isi folder `AMC/` ke *document root* web server.
2. Pastikan PHP terinstal dan dikonfigurasi sebagai handler `.php`.
3. Set environment variable `ANTRIAN_API_KEY` di konfigurasi server.
4. Pastikan server bisa mengakses `172.16.24.137:8080` dari jaringannya.
5. (Opsional) Konfigurasi HTTPS via *reverse proxy* atau sertifikat SSL.

**Contoh konfigurasi Nginx:**

```nginx
server {
    listen 80;
    server_name antrian.rsamcmuhammadiyah.com;
    root /var/www/amc;
    index index.html;

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### Penjelasan Alur Data

1. `script.js` melakukan `fetch('proxy.php')` setiap 15 detik.
2. `proxy.php` memvalidasi bahwa request berasal dari halaman yang sama (pengecekan `Referer`).
3. `proxy.php` meneruskan request ke API RS (`/api/antrian`) dengan header `x-api-key`.
4. Respons API RS di-normalisasi dari format `{ success, data: { antrian: [...] } }` menjadi `{ status: 'success', data: [...] }`.
5. `script.js` menerima data JSON, lalu merender/memperbarui kartu poliklinik secara *in-place* (tanpa mengganti seluruh DOM).

### Menambah Ikon Poliklinik Baru

1. Siapkan file ikon `.png` (disarankan ukuran 72×72 px atau lebih, transparan).
2. Simpan di folder `img/Icon Poli/`.
3. Tambahkan mapping di `script.js` pada objek `POLI_ICON_FILES`:

   ```javascript
   const POLI_ICON_FILES = {
     // ... ikon yang sudah ada ...
     'NAMA KLINIK BARU': 'nama-file-ikon.png',
   };
   ```

   > Key harus **UPPERCASE** dan sesuai dengan nama poliklinik dari API.

---

## 👤 Petunjuk Penggunaan (User)

### 1. Mengakses Halaman

Buka halaman monitor antrian melalui browser di komputer, tablet, atau ponsel Anda. Alamat akan diberikan oleh petugas RS atau tersedia di area informasi rumah sakit.

### 2. Melihat Antrian Poliklinik

Setelah halaman terbuka, Anda akan melihat:

- **Indikator "LIVE SYNCHRONIZED"** di bagian atas — menandakan data diperbarui otomatis setiap 15 detik.
- **Kartu-kartu poliklinik** yang menampilkan informasi setiap jadwal dokter:

  | Informasi | Keterangan |
  |---|---|
  | **Nama Dokter** | Nama dokter praktik |
  | **Status** | `Berjalan` (hijau), `Belum Mulai` (kuning), atau `Selesai` (abu-abu) |
  | **Nama Klinik** | Nama poliklinik beserta ikon |
  | **Menunggu** | Jumlah pasien yang masih menunggu |
  | **Sedang Diperiksa** | Nomor antrean yang saat ini diperiksa |
  | **Jam Praktik** | Jadwal mulai praktik dokter |
  | **Terlambat Belum Datang** | Pasien yang belum datang tapi nomornya sudah terlewat |
  | **Terlambat Sudah Datang** | Pasien yang sudah datang tapi nomornya terlewat |
  | **Dipanggil Tidak Hadir** | Pasien yang dipanggil tapi tidak hadir |
  | **Selesai** | Jumlah pasien yang sudah selesai diperiksa |
  | **Total Pasien** | Total seluruh pasien terdaftar |

### 3. Cek Antrian Saya

Fitur ini memungkinkan Anda mengetahui posisi antrean Anda secara spesifik.

**Langkah-langkah:**

1. Pada bagian **"Cek Antrian Saya"** di atas halaman, pilih **Klinik** tempat Anda terdaftar.
2. Pilih **Dokter** yang Anda tuju.
3. Pilih **Nomor Antrean** Anda dari daftar yang muncul.
4. Klik tombol **"Cek"**.

**Hasil yang ditampilkan:**

| Kolom | Arti |
|---|---|
| **Nomor Antrean** | Nomor antrean Anda (beserta kode dokter, misal: `RP-4`) |
| **Pasien di Depan Anda** | Berapa orang yang masih di depan Anda |
| **Estimasi Giliran** | Perkiraan waktu/jam Anda akan dipanggil (± 5 menit per pasien) |
| **Status** | Status nomor Anda saat ini |

**Penjelasan Status Nomor:**

| Status | Warna | Arti |
|---|---|---|
| **Belum Datang** | Default | Anda belum melakukan check-in di pendaftaran |
| **Sudah Datang** | Default | Anda sudah check-in, menunggu dipanggil |
| **Dipanggil** | Hijau | Nomor Anda sedang dipanggil, silakan menuju ruang periksa |
| **Diperiksa** | Hijau | Anda sedang dalam pemeriksaan dokter |
| **Terlewati** | Merah | Nomor Anda terlewat, segera lapor ke petugas pendaftaran poli |

### 4. Filter Kartu Poliklinik

Jika Anda ingin melihat kartu poliklinik tertentu saja:

1. Pada bagian filter di bawah *divider* warna, pilih **Klinik** dan/atau **Dokter**.
2. Kartu yang tidak sesuai akan disembunyikan.
3. Klik **"Hapus Pilihan"** untuk menampilkan semua kartu kembali.

### 5. Mode Gelap / Terang

- Klik ikon **☀️ / 🌙** di pojok kanan atas *navbar* untuk beralih antara mode terang dan mode gelap.
- Preferensi Anda akan diingat oleh browser sehingga mode yang dipilih tetap aktif saat halaman dibuka kembali.

### 6. Memahami Status Kartu

**Warna banner "Sedang Diperiksa":**

| Warna Banner | Arti |
|---|---|
| 🟠 Koral (menampilkan `-`) | Dokter belum mulai memeriksa pasien |
| 🟡 Kuning tua (menampilkan kode, misal `RP-4`) | Sedang memeriksa pasien dengan nomor tersebut |
| 🟢 Hijau (menampilkan "Pasien selesai") | Semua pasien sudah selesai diperiksa |

**Badge status dokter:**

| Badge | Arti |
|---|---|
| `Belum Mulai` (kuning) | Dokter belum memulai praktik |
| `Berjalan` (hijau) | Dokter sedang praktik dan melayani pasien |
| `Selesai` (abu-abu) | Sesi praktik dokter telah selesai |

### 7. Tips & Catatan Penting

> ⚠️ **Jika nomor antrean Anda terlewati**, segera lapor ke petugas pendaftaran poli untuk dipanggil ulang.

- Data diperbarui otomatis — **tidak perlu** me-refresh halaman secara manual.
- Estimasi waktu bersifat **perkiraan** (± 5 menit per pasien). Waktu aktual dapat berbeda tergantung kondisi pemeriksaan.
- Gunakan tombol **⬆️** (muncul saat menggulir ke bawah) untuk kembali ke atas halaman dengan cepat.
- Halaman ini membutuhkan koneksi internet/jaringan yang stabil untuk menerima pembaruan data secara *real-time*.

---

## 📞 Kontak

| Kanal | Detail |
|---|---|
| **Alamat** | Jl. HOS Cokroaminoto 178, Pakuncen, Wirobrajan, Yogyakarta 55252 |
| **Emergency Call** | (0274) 618224 |
| **Call Center** | (0274) 618400 |
| **WhatsApp** | [+6285179701004](https://wa.me/6285179701004) |
| **Email** | [info@amcmuhammadiyah.com](mailto:info@amcmuhammadiyah.com) |
| **Website** | [rsamcmuhammadiyah.com](https://rsamcmuhammadiyah.com/) |

---

<p align="center">
  &copy; All rights reserved. IT RS AMC Muhammadiyah
</p>
