# Tools dan Teknologi

Dokumen ini merinci tumpukan teknologi (tech stack) yang digunakan dalam pengembangan sistem **EMS (Employee Management System)**.

## 1. Bahasa Pemrograman
- **JavaScript (Node.js)**: Digunakan di seluruh ekosistem aplikasi (Full-stack JS), baik untuk logika backend maupun frontend.

## 2. Framework & Library Inti
- **Backend**: 
  - **Express.js**: Framework web minimalis untuk membangun RESTful API.
- **Frontend**: 
  - **React.js**: Library untuk membangun antarmuka pengguna (UI).
  - **Vite**: Build tool modern yang digunakan untuk pengembangan frontend yang cepat.

## 3. Database
- **PostgreSQL**: Relational database (RDBMS) untuk penyimpanan data yang terstruktur dan handal.
- **Sequelize**: ORM (Object-Relational Mapping) untuk berinteraksi dengan PostgreSQL menggunakan JavaScript.

## 4. Tools Pendukung
- **Autentikasi**: 
  - **Google OAuth 2.0**: Digunakan untuk sistem login yang aman menggunakan akun Google.
- **Geolokasi & Peta**: 
  - **Leaflet.js & React-Leaflet**: Digunakan untuk fitur absensi berbasis lokasi (geofencing).
- **Styling & Animasi**: 
  - **Vanilla CSS**: Untuk desain antarmuka yang bersih dan responsif.
  - **Framer Motion**: Untuk micro-interactions dan animasi UI yang premium.
- **Utilitas Backend**:
  - **Node-cron**: Untuk menjalankan tugas otomatis terjadwal (seperti reset status harian).
  - **Nodemailer**: Untuk pengiriman notifikasi via email.
  - **PDFKit**: Untuk pembuatan laporan atau dokumen dalam format PDF.
  - **Axios**: Untuk komunikasi data antara frontend dan backend.
- **Keamanan**:
  - **Helmet.js**: Meningkatkan keamanan HTTP header.
  - **Express Rate Limit**: Mencegah serangan brute-force dan pembatasan request API.
- **DevOps & Deployment**:
  - **Docker & Docker Compose**: Untuk standarisasi lingkungan pengembangan dan deployment.
  - **Git**: Untuk manajemen versi kode (Source Control).
  - **Render / Vercel**: Platform hosting untuk backend dan frontend.

## 5. Hardware
- **Development**: Perangkat komputer (Laptop/PC) dengan spesifikasi standar pengembangan web.
- **Production/Deployment**: Cloud Server (VPS atau Platform-as-a-Service) yang menjalankan runtime Node.js dan instance PostgreSQL.
- **Client Access**: Smartphone atau Laptop dengan browser modern (Chrome, Safari, Edge) untuk mengakses fitur aplikasi, terutama fitur GPS untuk absensi.
