# Luxentra Finance (Money Tracker)

Luxentra Finance adalah aplikasi web dinamis manajemen keuangan pribadi premium yang mengintegrasikan arsitektur frontend modern dan backend Node.js + Express yang andal, menggunakan PostgreSQL (Supabase) sebagai basis data cloud.

Aplikasi ini dirancang untuk memenuhi seluruh kriteria tugas besar pemrograman web, termasuk autentikasi tingkat lanjut, manajemen data keuangan dengan CRUD penuh, visualisasi grafik interaktif, pembagian peran pengguna (admin & user), serta performa responsif yang optimal.

---

## 🛠️ Tech Stack & Library

### 1. Front-End (Antarmuka Pengguna)
- **HTML5 & CSS3**: Struktur semantik dengan desain kustom premium (kombinasi warna HSL modern, *glassmorphism*, dan animasi mikro yang halus).
- **Vanilla JavaScript (ES6+)**: Logika aplikasi klien, interaksi dinamis, manipulasi DOM, manajemen sesi, dan penanganan grafik kustom.
- **Custom Charting (SVG-based)**: Visualisasi grafik tren (Area Chart), perbandingan bulanan (Bar Chart), dan distribusi pengeluaran (Donut Chart) dibangun secara murni menggunakan SVG & Javascript untuk performa super ringan tanpa library pihak ketiga (seperti Chart.js).

### 2. Back-End (Server API)
- **Node.js & Express.js (v5.x)**: Server HTTP dan penyedia API RESTful terstruktur.
- **Nodemailer**: Modul pengiriman email otomatis via SMTP Gmail untuk verifikasi OTP (*One-Time Password*).
- **bcryptjs**: Pustaka hashing kata sandi untuk menjaga keamanan data autentikasi.
- **JSON Web Token (JWT)**: Sesi token stateless untuk otentikasi sesi aman berdurasi 7 hari.

### 3. Database & Hosting
- **Supabase (PostgreSQL)**: Database relasional di cloud untuk penyimpanan persisten.
- **Vercel**: Platform hosting serverless untuk penyebaran aplikasi secara *online*.

---

## 🔒 Fitur Utama Aplikasi

1. **Autentikasi & Otorisasi Lengkap**:
   - Pendaftaran & Login akun pengguna lokal.
   - Simulasi integrasi Google OAuth Supabase.
   - Proteksi rute halaman (User tidak bisa akses Admin dashboard, dan non-login user tidak bisa masuk halaman aplikasi).
   - Pengiriman & verifikasi kode OTP 6-digit ke email asli pengguna via **SMTP Gmail** untuk pemulihan password dan verifikasi profil.

2. **Manajemen Transaksi Keuangan (CRUD Penuh)**:
   - Pencatatan transaksi baru (Pemasukan & Pengeluaran) dengan nominal otomatis terformat rupiah.
   - Daftar riwayat transaksi lengkap dengan filter pencarian instan, jenis transaksi, kategori, serta pengurutan data (*sorting*).
   - Pembaruan (*Update*) data transaksi via modal interaktif.
   - Penghapusan (*Delete*) data transaksi dengan modal konfirmasi aman.

3. **Manajemen Kategori Kustom**:
   - Pilihan kategori bawaan (*default*) dan pembuatan kategori kustom secara dinamis sesuai kebutuhan pengguna.
   - Hapus kategori kustom secara aman.

4. **Dual-Mode System (Mock & Production)**:
   - Server backend secara otomatis mendeteksi ketersediaan berkas konfigurasi `.env`. Jika database belum dikonfigurasi, server berjalan dalam **Mock Mode** (menyimpan data sementara di RAM server) untuk kelancaran *local testing* tanpa database.

5. **Panel Admin (Otorisasi Khusus)**:
   - Statistik total pengguna aktif dan pendaftaran pengguna baru bulan ini.
   - Tabel manajemen akun pengguna: Blokir (*Block*), Aktifkan (*Activate*), dan Hapus (*Delete*) akun pengguna (melindungi akun admin agar tidak terhapus).
   - Sistem broadcast pengumuman: Admin dapat memposting pengumuman penting yang akan muncul sebagai banner dinamis di dashboard setiap user.

---

## 📊 Skema Database (ERD - PostgreSQL)

Berikut adalah struktur tabel relasional PostgreSQL yang digunakan di Supabase. Anda dapat menyalin kode SQL ini dan menjalankannya langsung di **SQL Editor Supabase** Anda:

```sql
-- 1. TABEL USERS (Pengguna)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'user' atau 'admin'
    status VARCHAR(50) DEFAULT 'active', -- 'active' atau 'blocked'
    phone VARCHAR(50),
    avatar_url TEXT, -- Menyimpan base64 foto profil
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL CATEGORIES (Kategori Transaksi)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Pemasukan', 'Pengeluaran', atau 'Lainnya'
    color VARCHAR(20) NOT NULL, -- Kode warna Hex (e.g. #FF3434)
    icon_label VARCHAR(10) NOT NULL, -- Inisial icon (e.g. 'MK', 'GJ')
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Null jika kategori bawaan global
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL TRANSACTIONS (Transaksi Keuangan)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL, -- Jumlah uang (negatif untuk pengeluaran)
    type VARCHAR(50) NOT NULL, -- 'Pemasukan' atau 'Pengeluaran'
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABEL BROADCASTS (Pengumuman Admin)
CREATE TABLE broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚙️ Cara Menjalankan Project Secara Lokal

### 1. Clone Project
```bash
git clone <url-repository-github-anda>
cd money-tracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi File `.env`
Buat file bernama `.env` di direktori utama project (sejajar dengan `server.js`) dan masukkan variabel berikut:

```env
# Port Server Lokal
PORT=3000

# URL dan Key API Supabase (Dapatkan dari Project Settings > API Supabase)
SUPABASE_URL=https://<id-proyek-supabase-anda>.supabase.co
SUPABASE_KEY=<key-anon-public-anda>
SUPABASE_SERVICE_ROLE_KEY=<key-service-role-anda>

# JWT Secret Key (Kunci acak bebas untuk enkripsi token JWT)
JWT_SECRET=rahasia_jwt_kalian_123_abc_xyz

# Konfigurasi SMTP Gmail untuk Pengiriman OTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=emailgmailkamu@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
```

> **Catatan Penting untuk `SMTP_PASS`**: Jangan gunakan password login akun Gmail biasa Anda. Anda wajib menggunakan **App Password** 16 karakter yang dibuat melalui halaman Keamanan Akun Google Anda (Google Account Security -> 2-Step Verification -> App Passwords).

### 4. Jalankan Aplikasi
```bash
npm start
```
Buka web browser dan akses aplikasi melalui tautan: `http://localhost:3000`.

---

## 🚀 Panduan Deployment ke Vercel

Aplikasi ini sudah dikonfigurasi dengan berkas `vercel.json` agar dapat langsung di-deploy ke Vercel sebagai aplikasi web serverless terpadu.

1. Buka dashboard [Vercel](https://vercel.com) dan hubungkan dengan akun GitHub Anda.
2. Impor repositori `money-tracker` ini.
3. Di bagian **Environment Variables** pada konfigurasi proyek Vercel, tambahkan seluruh variabel yang ada di file `.env` lokal Anda.
4. Klik **Deploy**. Selesai!
