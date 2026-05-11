# DayHR - Multi-Tenant HRIS Project

Human Resources Information System (HRIS) modern dengan arsitektur Multi-Tenant berbasis stack PERN (Postgres, Express, React, Node.js).

## Ringkasan Proyek

Proyek ini telah dimigrasi ke PostgreSQL (Supabase) untuk mendukung skala ribuan pengguna dan isolasi data antar perusahaan (multi-tenant).

- `client/`: Frontend React + Vite + Tailwind CSS.
- `server/`: Backend Express + Sequelize (PostgreSQL).

## Fitur Utama

- **Multi-Tenant Architecture**: Pemisahan data antar perusahaan menggunakan `company_id`.
- **Super Admin Console**: Manajemen global perusahaan dan pengguna.
- **Google OAuth**: Login aman terintegrasi.
- **Attendance with Geofencing**: Absensi dengan lokasi GPS dan radius kantor.
- **Payroll System**: Perhitungan gaji otomatis, BPJS, PPh21, dan slip gaji PDF.
- **Request Management**: Pengajuan cuti, izin, lembur, dan reimbursement.

## Persiapan Lingkungan

### 1. Clone & Install
```bash
git clone https://github.com/Zidhan-F/HRIS-Project-PERN.git
cd HRIS-Project-PERN

# Install Server
cd server && npm install

# Install Client
cd ../client && npm install
```

### 2. Konfigurasi Environment (.env)

Buat file `.env` di folder `server/`:
```env
PORT=5000
DATABASE_URL=postgresql://user:password@host:port/dbname
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
ROOT_ADMIN_EMAIL=your-email@gmail.com
FRONTEND_URL=http://localhost:5173
```

### 3. Setup Database (PENTING)

Jika Anda baru melakukan setup di laptop baru, jalankan perintah berikut secara berurutan untuk sinkronisasi tabel dan pembuatan Super Admin:

```bash
cd server
# 1. Sinkronisasi tabel dan migrasi multi-tenant
node scratch_migrate.js

# 2. Inisialisasi akun Super Admin (Sesuaikan email di file)
node scratch_superadmin.js
```

## Menjalankan Aplikasi

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm run dev
```

## Teknologi yang Digunakan

- **Frontend**: React, Vite, TailwindCSS, Lucide React, Recharts.
- **Backend**: Node.js, Express, Sequelize ORM.
- **Database**: PostgreSQL (Supabase).
- **Services**: Google OAuth, Nodemailer (SMTP).
