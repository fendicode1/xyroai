# Xyro AI — Project Dev Edition (SPCK + ZIP Builder)

Paket ini memisahkan frontend statis yang bisa diedit/di-preview di SPCK dari backend Node.js yang menyimpan API key.

## Fitur Project Dev

1. **Project Builder** — pilih menu `Project Dev`, tulis kebutuhan website/aplikasi, atau gunakan template cepat.
2. **Proses pembuatan tanpa source code di layar** — saat AI sedang membangun project, antarmuka hanya menampilkan status/progress. File code baru tersedia setelah respons selesai diproses.
3. **File explorer multi-file** — lihat daftar file yang dihasilkan; source code tetap tersembunyi sampai tombol `Lihat kode` ditekan.
4. **Preview website** — coba file HTML di iframe sandbox. CSS dan JavaScript lokal yang direferensikan di HTML akan digabungkan untuk preview bila cocok.
5. **Unduh ZIP** — hasil project bisa diunduh sebagai `.zip`, lengkap dengan struktur folder dan README. ZIP dibuat langsung di browser tanpa menambahkan API key ke dalam arsip.
6. **Unduh file satuan** — unduh file yang sedang dipilih dari file explorer.
7. **Template prompt** — contoh portfolio, aplikasi catatan, landing page, dan dashboard admin.
8. **Penyimpanan project lokal** — file project disimpan di localStorage browser bersama riwayat chat pada perangkat yang sama.

> Project yang dihasilkan AI tetap perlu diperiksa dan diuji sebelum digunakan di produksi. Preview sandbox bukan lingkungan server penuh, sehingga fitur backend, package Node, dan API eksternal tidak otomatis berjalan di iframe.


## Konfigurasi RadoxAI

Base URL sudah disesuaikan ke `https://radoxai.com/v1` dan model awal ke `claude-opus-4.8` (contoh model yang didokumentasikan RadoxAI). Untuk deployment, buka Vercel → Project → Settings → Environment Variables lalu tambahkan:

- `RADOXAI_API_KEY` = API key RadoxAI kamu
- `RADOXAI_BASE_URL` = `https://radoxai.com/v1`
- `ADMIN_PASSWORD` = password admin baru yang kuat
- `CORS_ORIGIN` = `https://xyrotesai.vercel.app` (sesuaikan dengan domain frontend)

Setelah menyimpan Environment Variables, lakukan redeploy. API key sengaja tidak dimasukkan ke ZIP atau frontend supaya tidak ikut tersebar saat file dibagikan. Karena key sudah pernah ditempel di percakapan, pertimbangkan untuk membuat key baru setelah konfigurasi berhasil.

## A. Edit dan preview UI di SPCK

1. Ekstrak ZIP di Android.
2. Di SPCK Editor biasa, buka folder `website` sebagai project.
3. Buka `index.html`, lalu gunakan Preview / Launch Project Preview.
4. UI bisa dibuka tanpa backend, tetapi chat AI dan Project Dev memerlukan backend online.

File frontend: `website/index.html`, `website/style.css`, `website/main.js`.

## B. Hubungkan backend dengan aman

SPCK Editor biasa tidak menjalankan backend Node.js. Deploy folder `backend` pada hosting/server yang mendukung Node.js.

1. Pada hosting, atur environment variables `RADOXAI_API_KEY`, `RADOXAI_BASE_URL`, `ADMIN_PASSWORD`, dan `CORS_ORIGIN`.
2. Gunakan `RADOXAI_BASE_URL=https://radoxai.com/v1`.
3. Isi `RADOXAI_API_KEY` melalui dashboard environment variables hosting. Jangan masukkan key di frontend, riwayat chat, atau file ZIP project yang dibagikan.
4. Set `CORS_ORIGIN` ke origin website frontend yang sebenarnya. Gunakan HTTPS.
5. Di Xyro AI, buka Pengaturan, isi alamat backend HTTPS, verifikasi admin, lalu simpan.
6. Tes `https://ALAMAT-BACKEND/api/health`. Respons yang diharapkan berisi `ok: true`.

### Deployment Vercel

Vercel mendukung Express, tetapi struktur proyek dan entrypoint harus sesuai pengaturan Vercel. Folder `website` dan `backend` di paket ini dipisahkan untuk memudahkan edit di SPCK. Jika ingin satu deployment Vercel, susun ulang static frontend dan entrypoint backend mengikuti dokumentasi Express di Vercel; jangan menganggap backend otomatis aktif hanya karena frontend berhasil di-deploy.

### Penting

- Jangan pernah menaruh API key atau password admin di `website/main.js`, `index.html`, atau `style.css`.
- Jika key pernah dibagikan di chat atau publik, cabut/rotasi dan gunakan key baru.
- CORS bukan autentikasi. Endpoint backend publik perlu pembatasan penggunaan, autentikasi, dan pemantauan biaya.
- Di hosting serverless, file lokal bisa bersifat sementara. Simpan konfigurasi rahasia melalui environment variables hosting, bukan file `.env` yang dipublikasikan.

## C. Menggunakan Project Dev

1. Buka website dan pilih menu **Project Dev**.
2. Tulis project yang ingin dibuat atau pilih salah satu contoh template.
3. Selama proses berlangsung, source code tidak ditampilkan. Setelah selesai, daftar file dan tombol tindakan akan muncul.
4. Tekan **Preview website** untuk mencoba HTML. Tekan **Lihat kode** untuk membaca source setelah pembuatan selesai.
5. Tekan **Unduh ZIP** untuk mengunduh semua file project. Jika ZIP tidak mulai terunduh di browser mobile, izinkan unduhan untuk situs tersebut dan tekan tombol sekali lagi.

## Struktur

- `website/` — frontend statis untuk SPCK
- `backend/` — Express API proxy
- `.env.example` — template konfigurasi; bukan tempat menaruh rahasia untuk ZIP publik


## Pembaruan privasi alamat backend dan daftar model

- Kolom alamat backend di Pengaturan menggunakan input password sehingga teks terlihat sebagai titik. Aksi salin/potong/menu konteks dibatasi pada kolom itu. Ini menyamarkan tampilan, tetapi bukan kerahasiaan mutlak: browser tetap perlu mengetahui URL untuk mengirim permintaan dan URL dapat terlihat melalui developer tools atau penyimpanan browser. Untuk benar-benar menyembunyikan alamat layanan internal, gunakan proxy server-side pada domain frontend.
- Daftar model tidak lagi hanya satu pilihan hardcoded. Frontend mengambil model yang tersedia dari `GET /api/models` pada backend, lalu mengisi menu model dan pilihan model default. Tombol **Muat ulang daftar model** tersedia di Pengaturan.
- Jika model yang tampil tetap satu, periksa respons `https://ALAMAT-BACKEND/api/models` dan log backend. RadoxAI mengembalikan model yang tersedia untuk API key tersebut; akses key atau kegagalan endpoint bisa membatasi hasil.
