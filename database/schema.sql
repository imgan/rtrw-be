-- Role & hak akses. permissions = JSON array key (lihat src/config/permissions.js), '*' = semua.
CREATE TABLE IF NOT EXISTS roles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama          VARCHAR(60)   NOT NULL,
  slug          VARCHAR(40)   NOT NULL,
  deskripsi     VARCHAR(255)  NULL,
  permissions   TEXT          NOT NULL,
  is_system     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roles_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Warga login dengan NIK/No. WA + PIN; akun pengurus juga punya username + password.
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(50)   NULL,
  password_hash   VARCHAR(100)  NULL,
  role_id         INT UNSIGNED  NOT NULL,
  nik             CHAR(16)      NOT NULL,
  no_kk           CHAR(16)      NULL,
  nama            VARCHAR(120)  NOT NULL,
  no_wa           VARCHAR(16)   NULL,
  email           VARCHAR(120)  NULL,
  jenis_kelamin   ENUM('L','P') NULL,
  tanggal_lahir   DATE          NULL,
  alamat          VARCHAR(255)  NULL,
  blok            VARCHAR(10)   NULL,
  no_rumah        VARCHAR(10)   NULL,
  status_hunian   ENUM('tetap','kontrak','kost') NOT NULL DEFAULT 'tetap',
  jabatan         VARCHAR(60)   NULL,
  status_keluarga ENUM('suami','istri','anak','lainnya') NULL,
  keberadaan      ENUM('netap','pindah','meninggal') NOT NULL DEFAULT 'netap',
  pin_hash       VARCHAR(100)  NOT NULL,
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  last_login_at   DATETIME      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_nik (nik),
  UNIQUE KEY uq_users_no_wa (no_wa),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_nama (nama),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Konten beranda (hero, statistik, siaga, wilayah, footer) disimpan sebagai JSON per key.
CREATE TABLE IF NOT EXISTS settings (
  `key`       VARCHAR(50)  NOT NULL PRIMARY KEY,
  `value`     LONGTEXT     NOT NULL,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kategori           VARCHAR(50)   NOT NULL,
  warna              ENUM('green','blue','red','amber') NOT NULL DEFAULT 'green',
  judul              VARCHAR(160)  NOT NULL,
  isi                TEXT          NOT NULL,
  tanggal            DATE          NOT NULL,
  penanggung_jawab   VARCHAR(120)  NULL,
  is_published       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_announcements_tanggal (tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cash_transactions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tanggal     DATE           NOT NULL,
  uraian      VARCHAR(200)   NOT NULL,
  kategori    VARCHAR(50)    NOT NULL,
  jenis       ENUM('masuk','keluar') NOT NULL,
  nominal     DECIMAL(14,0)  NOT NULL,
  created_by  INT UNSIGNED   NULL,
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cash_tanggal (tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contacts (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama        VARCHAR(100)  NOT NULL,
  keterangan  VARCHAR(150)  NULL,
  telepon     VARCHAR(30)   NULL,
  aksi        ENUM('telepon','whatsapp') NOT NULL DEFAULT 'telepon',
  tone        ENUM('primary','default','danger') NOT NULL DEFAULT 'default',
  urutan      INT           NOT NULL DEFAULT 0,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kegiatan warga; fotos = JSON array URL gambar, foto pertama jadi sampul
CREATE TABLE IF NOT EXISTS activities (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  judul              VARCHAR(160)  NOT NULL,
  kategori           VARCHAR(50)   NOT NULL,
  deskripsi          TEXT          NOT NULL,
  tanggal            DATE          NOT NULL,
  waktu              VARCHAR(40)   NULL,
  lokasi             VARCHAR(120)  NULL,
  penanggung_jawab   VARCHAR(120)  NULL,
  fotos              TEXT          NULL,
  is_published       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_activities_tanggal (tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fasilitas umum lingkungan
CREATE TABLE IF NOT EXISTS facilities (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama               VARCHAR(120)  NOT NULL,
  kategori           VARCHAR(50)   NOT NULL,
  deskripsi          TEXT          NULL,
  lokasi             VARCHAR(120)  NULL,
  kondisi            ENUM('baik','perbaikan','rusak') NOT NULL DEFAULT 'baik',
  jam_operasional    VARCHAR(80)   NULL,
  penanggung_jawab   VARCHAR(120)  NULL,
  fotos              TEXT          NULL,
  urutan             INT           NOT NULL DEFAULT 0,
  is_active          TINYINT(1)    NOT NULL DEFAULT 1,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pembangunan lingkungan
CREATE TABLE IF NOT EXISTS projects (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama_kegiatan   VARCHAR(160)  NOT NULL,
  no_sk           VARCHAR(60)   NULL,
  tgl_sk          DATE          NULL,
  tgl_mulai       DATE          NULL,
  tgl_selesai     DATE          NULL,
  nilai           DECIMAL(14,0) NOT NULL DEFAULT 0,
  asal_projek     VARCHAR(120)  NULL,
  volume          VARCHAR(60)   NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_projects_mulai (tgl_mulai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pembayaran iuran warga per bulan
CREATE TABLE IF NOT EXISTS payments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED  NOT NULL,
  tanggal     DATE          NOT NULL,
  keterangan  VARCHAR(200)  NOT NULL,
  nominal     DECIMAL(14,0) NOT NULL,
  bulan       TINYINT UNSIGNED NOT NULL,
  tahun       SMALLINT UNSIGNED NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_payments_periode (tahun, bulan),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Surat keterangan: ACC berurutan sekretaris -> bendahara -> ketua
CREATE TABLE IF NOT EXISTS letters (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id              INT UNSIGNED  NOT NULL,
  nomor_surat          VARCHAR(60)   NULL,
  nomor_tahun          SMALLINT UNSIGNED NULL,
  nomor_urut           INT UNSIGNED  NULL,
  tanggal_pengajuan    DATE          NOT NULL,
  jenis_surat          VARCHAR(100)  NOT NULL,
  keperluan            VARCHAR(255)  NOT NULL,
  tanggal_pelaksanaan  DATE          NULL,
  status               ENUM('diajukan','diproses','disetujui','ditolak') NOT NULL DEFAULT 'diajukan',
  alasan_tolak         VARCHAR(255)  NULL,
  acc_sekretaris_by    INT UNSIGNED  NULL,
  acc_sekretaris_at    DATETIME      NULL,
  acc_bendahara_by     INT UNSIGNED  NULL,
  acc_bendahara_at     DATETIME      NULL,
  acc_ketua_by         INT UNSIGNED  NULL,
  acc_ketua_at         DATETIME      NULL,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_letters_nomor (nomor_tahun, nomor_urut),
  KEY idx_letters_status (status),
  CONSTRAINT fk_letters_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_letters_sekretaris FOREIGN KEY (acc_sekretaris_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_letters_bendahara FOREIGN KEY (acc_bendahara_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_letters_ketua FOREIGN KEY (acc_ketua_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Struktur kepengurusan RT/RW
CREATE TABLE IF NOT EXISTS officials (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama          VARCHAR(120)  NOT NULL,
  jabatan       VARCHAR(120)  NOT NULL,
  satuan        VARCHAR(20)   NOT NULL DEFAULT 'RW',
  label         VARCHAR(60)   NULL,
  warna         ENUM('blue','green','dark','amber') NOT NULL DEFAULT 'blue',
  nik           CHAR(16)      NULL,
  no_wa         VARCHAR(20)   NULL,
  domisili      VARCHAR(160)  NULL,
  foto          VARCHAR(255)  NULL,
  no_sk         VARCHAR(60)   NULL,
  status_label  VARCHAR(60)   NULL,
  is_utama      TINYINT(1)    NOT NULL DEFAULT 0,
  urutan        INT           NOT NULL DEFAULT 0,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_officials_satuan (satuan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS official_mutations (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  official_id       INT UNSIGNED  NULL,
  tanggal_efektif   DATE          NOT NULL,
  jabatan           VARCHAR(120)  NOT NULL,
  pejabat_lama      VARCHAR(120)  NULL,
  keterangan_lama   VARCHAR(80)   NULL,
  pejabat_baru      VARCHAR(120)  NOT NULL,
  keterangan_baru   VARCHAR(80)   NULL,
  no_sk             VARCHAR(60)   NULL,
  status            ENUM('disahkan','diproses','ditolak') NOT NULL DEFAULT 'disahkan',
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_mutations_tanggal (tanggal_efektif),
  CONSTRAINT fk_mutations_official FOREIGN KEY (official_id) REFERENCES officials(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;