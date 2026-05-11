# Skema Database HRIS (PERN Stack)

**Database:** PostgreSQL (Relational Database)
**ORM:** Sequelize v6+

## 1. Koleksi / Tabel Utama

### Tabel: `users`
Menyimpan data profil karyawan, informasi kontrak, dan pengaturan payroll.

| Field | Tipe Data | Default | Nullable | Key | Keterangan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | Integer | Auto | No | PK | Primary Key |
| `name` | String | — | No | — | Nama lengkap |
| `email` | String | — | No | Unique | Email (Login) |
| `google_id` | String | — | Yes | — | ID dari Google OAuth |
| `role` | Enum | `employee` | No | — | `employee`, `hrd`, `manager`, `admin` |
| `position` | String | `Staff` | No | — | Jabatan |
| `profile_picture`| Text | — | Yes | — | URL/Base64 foto |
| `bio` | String | `-` | No | — | Deskripsi singkat |
| `phone` | String | `-` | No | — | Nomor telepon |
| `address` | Text | `-` | No | — | Alamat tinggal |
| `birthday` | DateOnly | — | Yes | — | Tanggal lahir |
| `gender` | Enum | `-` | No | — | `Male`, `Female`, `Other`, `-` |
| `marital_status` | String | `-` | No | — | Status pernikahan |
| `employee_id_code`| String | `EMS-000` | No | — | ID Karyawan (Custom) |
| `join_date` | DateOnly | `NOW` | No | — | Tanggal masuk |
| `employment_status`| String | `Probation`| No | — | Kontrak, Tetap, dll |
| `base_salary` | Decimal(15,2)| `5000000`| No | — | Gaji pokok |
| `leave_quota` | Integer | `0` | No | — | Sisa kuota cuti |
| `created_at` | DateTime | `NOW` | No | — | Timestamp pembuatan |

---

### Tabel: `attendances`
Mencatat absensi harian karyawan.

| Field | Tipe Data | Default | Nullable | Key | Keterangan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | Integer | Auto | No | PK | Primary Key |
| `user_id` | Integer | — | No | FK | Relasi ke `users.id` |
| `date` | DateOnly | — | No | — | Tanggal absensi |
| `clock_in` | DateTime | — | Yes | — | Waktu masuk |
| `clock_out` | DateTime | — | Yes | — | Waktu keluar |
| `status` | Enum | `Present` | No | — | `Present`, `Late`, `Absent`, `Leave` |
| `location` | JSONB | — | Yes | — | Geolocation `{lat, lng}` |

---

### Tabel: `requests`
Menyimpan pengajuan cuti, izin, atau lembur.

| Field | Tipe Data | Default | Nullable | Key | Keterangan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | Integer | Auto | No | PK | Primary Key |
| `user_id` | Integer | — | No | FK | Relasi ke `users.id` |
| `type` | Enum | — | No | — | `Leave`, `Permission`, `Overtime` |
| `start_date` | DateOnly | — | No | — | Tanggal mulai |
| `end_date` | DateOnly | — | No | — | Tanggal selesai |
| `reason` | Text | — | No | — | Alasan pengajuan |
| `status` | Enum | `Pending` | No | — | `Pending`, `Approved`, `Rejected` |

---

### Tabel: `payrolls`
Data perhitungan gaji bulanan.

| Field | Tipe Data | Default | Nullable | Key | Keterangan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | Integer | Auto | No | PK | Primary Key |
| `employee_id` | Integer | — | No | FK | Relasi ke `users.id` |
| `month` | String | — | No | — | Format: `YYYY-MM` |
| `base_salary` | Decimal(15,2)| — | No | — | Gaji pokok saat itu |
| `total_allowance`| Decimal(15,2)| — | No | — | Total tunjangan |
| `total_deduction`| Decimal(15,2)| — | No | — | Total potongan |
| `net_salary` | Decimal(15,2)| — | No | — | Gaji bersih |
| `status` | Enum | `Draft` | No | — | `Draft`, `Processed`, `Paid` |

---

## 2. Relasi (Associations)

1. **User - Attendance**: One-to-Many (`user_id`).
2. **User - Request**: One-to-Many (`user_id`).
3. **User - Payroll**: One-to-Many (`employee_id`).
4. **User - TeamMember**: One-to-Many (Manager to Members).
