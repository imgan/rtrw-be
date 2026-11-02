// Membuat database, tabel, dan akun admin awal.
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { HOME_DEFAULTS } from '../src/config/homeDefaults.js';
import { STRUKTUR_DEFAULTS } from '../src/config/strukturDefaults.js';
import { SYSTEM_ROLES } from '../src/config/permissions.js';

const {
  DB_HOST = 'localhost',
  DB_PORT = 3306,
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'rtrw_db',
  SEED_ADMIN_NIK = '3276000000000001',
  SEED_ADMIN_NAME = 'Administrator',
  SEED_ADMIN_PHONE = '081234567890',
  SEED_ADMIN_PIN = '123456',
  SEED_ADMIN_USERNAME = 'admin',
  SEED_ADMIN_PASSWORD = 'Admin@RT04',
} = process.env;

async function columnExists(conn, table, column) {
  const [[{ n }]] = await conn.query(
    'SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return n > 0;
}

// Role bawaan dibuat bila belum ada; role yang sudah ada tidak ditimpa agar perubahan admin tetap.
async function seedRoles(conn) {
  const [existing] = await conn.query('SELECT slug FROM roles');
  const slugs = new Set(existing.map((r) => r.slug));
  for (const role of SYSTEM_ROLES) {
    if (slugs.has(role.slug)) continue;
    await conn.query(
      'INSERT INTO roles (nama, slug, deskripsi, permissions, is_system) VALUES (?, ?, ?, ?, 1)',
      [role.nama, role.slug, role.deskripsi, JSON.stringify(role.permissions)]
    );
    console.log(`✔ Role "${role.nama}" dibuat`);
  }
}

// Migrasi database lama: kolom ENUM `role` → `role_id`, tambah username & password.
async function migrateUsers(conn) {
  if (!(await columnExists(conn, 'users', 'username'))) {
    await conn.query(
      `ALTER TABLE users
         ADD COLUMN username VARCHAR(50) NULL AFTER id,
         ADD COLUMN password_hash VARCHAR(100) NULL AFTER username,
         ADD UNIQUE KEY uq_users_username (username)`
    );
    console.log('✔ Kolom username & password ditambahkan');
  }

  if (!(await columnExists(conn, 'users', 'status_keluarga'))) {
    await conn.query(
      `ALTER TABLE users
         ADD COLUMN status_keluarga ENUM('suami','istri','anak','lainnya') NULL AFTER jabatan,
         ADD COLUMN keberadaan ENUM('netap','pindah','meninggal') NOT NULL DEFAULT 'netap' AFTER status_keluarga`
    );
    console.log('✔ Kolom status keluarga & keberadaan ditambahkan');
  }

  const hasLegacyRole = await columnExists(conn, 'users', 'role');
  if (!(await columnExists(conn, 'users', 'role_id'))) {
    await conn.query('ALTER TABLE users ADD COLUMN role_id INT UNSIGNED NULL AFTER password_hash');
    if (hasLegacyRole) {
      await conn.query('UPDATE users u JOIN roles r ON r.slug = u.role SET u.role_id = r.id');
    }
    await conn.query("UPDATE users SET role_id = (SELECT id FROM roles WHERE slug = 'warga') WHERE role_id IS NULL");
    await conn.query(
      `ALTER TABLE users
         MODIFY role_id INT UNSIGNED NOT NULL,
         ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)`
    );
    console.log('✔ Peran pengguna dimigrasikan ke tabel roles');
  }
  if (hasLegacyRole) {
    await conn.query('ALTER TABLE users DROP INDEX idx_users_role, DROP COLUMN role');
    console.log('✔ Kolom role lama dihapus');
  }
}

async function seedAdmin(conn) {
  const [[adminRole]] = await conn.query("SELECT id FROM roles WHERE slug = 'admin'");
  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  const [rows] = await conn.query('SELECT id, username FROM users WHERE nik = ?', [SEED_ADMIN_NIK]);

  if (rows.length === 0) {
    await conn.query(
      `INSERT INTO users (username, password_hash, role_id, nik, nama, no_wa, jabatan, pin_hash, blok, no_rumah)
       VALUES (?, ?, ?, ?, ?, ?, 'Ketua RT 04', ?, 'B', '24')`,
      [SEED_ADMIN_USERNAME, passwordHash, adminRole.id, SEED_ADMIN_NIK, SEED_ADMIN_NAME, SEED_ADMIN_PHONE,
        await bcrypt.hash(SEED_ADMIN_PIN, 10)]
    );
    console.log(`✔ Admin dibuat — username: ${SEED_ADMIN_USERNAME}, password: ${SEED_ADMIN_PASSWORD}`);
  } else if (!rows[0].username) {
    await conn.query('UPDATE users SET username = ?, password_hash = ?, role_id = ? WHERE id = ?', [
      SEED_ADMIN_USERNAME, passwordHash, adminRole.id, rows[0].id,
    ]);
    console.log(`✔ Akun admin diberi login — username: ${SEED_ADMIN_USERNAME}, password: ${SEED_ADMIN_PASSWORD}`);
  } else {
    console.log('• Admin sudah ada, seed dilewati');
  }
}

// Isi tabel konten beranda dengan contoh data, hanya bila tabelnya masih kosong.
async function seedContent(conn) {
  const isEmpty = async (table) => {
    const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM ${table}`);
    return n === 0;
  };

  if (await isEmpty('settings')) {
    await conn.query("INSERT INTO settings (`key`, `value`) VALUES ('home', ?)", [JSON.stringify(HOME_DEFAULTS)]);
    console.log('✔ Konten beranda bawaan dibuat');
  }

  if (await isEmpty('announcements')) {
    await conn.query(
      'INSERT INTO announcements (kategori, warna, judul, isi, tanggal, penanggung_jawab) VALUES ?',
      [[
        ['Gotong Royong', 'green', 'Kerja Bakti Bersih Selokan & Antisipasi Musim Hujan',
          'Dihimbau seluruh warga membawa peralatan kebersihan pada hari Minggu pagi pukul 06.30 WIB. Titik kumpul Lapangan Serbaguna RT 04.',
          '2024-10-05', 'Koordinator: Pak RT & Sie Kebersihan'],
        ['Kesehatan Lingkungan', 'blue', 'Pelaksanaan Fogging Nyamuk DBD Bersama Puskesmas',
          'Penyemprotan insektisida akan dilaksanakan serentak hari Sabtu pagi. Harap tutup rapat penampungan air dan amankan hewan peliharaan.',
          '2024-10-02', 'Kerjasama: Puskesmas Sukamaju'],
        ['Keamanan Wilayah', 'red', 'Penegasan Jam Portal Masuk & Wajib Lapor Tamu Menginap',
          'Portal Gang Utama ditutup pukul 23.00 WIB. Bagi tamu yang menginap lebih dari 24 jam wajib didaftarkan lewat pengurus RT atau portal ini.',
          '2024-09-28', 'Sie Keamanan & Kamtibmas'],
      ]]
    );
    console.log('✔ Contoh pengumuman dibuat');
  }

  if (await isEmpty('cash_transactions')) {
    await conn.query(
      'INSERT INTO cash_transactions (tanggal, uraian, kategori, jenis, nominal) VALUES ?',
      [[
        ['2024-08-31', 'Saldo Awal Kas Per Agustus 2024', 'Saldo Awal', 'masuk', 12500000],
        ['2024-09-02', 'Penerimaan Iuran Warga Gang Anggrek (38 KK)', 'Iuran Warga', 'masuk', 1900000],
        ['2024-09-05', 'Penerimaan Iuran Warga Kompleks Blok C-D (14 KK)', 'Iuran Warga', 'masuk', 700000],
        ['2024-09-08', 'Perbaikan Atap Pos Ronda RT 04', 'Pemeliharaan', 'keluar', 1000000],
        ['2024-09-10', 'Konsumsi Kerja Bakti Bulanan', 'Kegiatan', 'keluar', 600000],
        ['2024-09-15', 'Konsumsi & Logistik Pertemuan Warga Bulanan RT', 'Konsumsi Rapat', 'keluar', 300000],
        ['2024-09-20', 'Penerimaan Iuran Warga Gang Melati (42 KK Lunas)', 'Iuran Warga', 'masuk', 2100000],
        ['2024-09-24', 'Penggantian Lampu Sorot LED Pos Ronda & Kabel Listrik', 'Pemeliharaan', 'keluar', 450000],
        ['2024-09-27', 'Penerimaan Iuran Warga Gang Mawar (30 KK Lunas)', 'Iuran Warga', 'masuk', 1500000],
        ['2024-09-29', 'Honor Petugas Sampah & Kebersihan Bulan September', 'Operasional', 'keluar', 1500000],
      ]]
    );
    console.log('✔ Contoh transaksi kas dibuat');
  }

  if (await isEmpty('contacts')) {
    await conn.query(
      'INSERT INTO contacts (nama, keterangan, telepon, aksi, tone, urutan) VALUES ?',
      [[
        ['Bambang Supriyadi', 'Ketua RT 04', '0812-8899-7711', 'telepon', 'primary', 1],
        ['Agus Setiawan', 'Sekretaris (Urusan Surat & KK)', '0813-2244-5566', 'whatsapp', 'default', 2],
        ['Pos Kamling & Babinsa', 'Darurat Kamtibmas', '021-876-0000', 'telepon', 'danger', 3],
      ]]
    );
    console.log('✔ Contoh kontak pengurus dibuat');
  }

  const [[hasStruktur]] = await conn.query("SELECT COUNT(*) AS n FROM settings WHERE `key` = 'struktur'");
  if (hasStruktur.n === 0) {
    await conn.query("INSERT INTO settings (`key`, `value`) VALUES ('struktur', ?)", [JSON.stringify(STRUKTUR_DEFAULTS)]);
    console.log('✔ Pengaturan struktur pengurus dibuat');
  }

  if (await isEmpty('officials')) {
    const sk = '142/SK-SKM/2023';
    await conn.query(
      `INSERT INTO officials
         (nama, jabatan, satuan, label, warna, nik, no_wa, domisili, foto, no_sk, status_label, is_utama, urutan)
       VALUES ?`,
      [[
        ['H. Suryadi Pratama, M.Si.', 'Ketua RW 08 Sukamaju', 'RW', 'Pengurus Induk RW', 'blue', '3276081204680001',
          '+62 812-9844-1100', 'Jl. Cendrawasih No. 01, RT 01 / RW 08', '/images/pengurus/suryadi.jpg', sk, 'Masa Aktif: Th. 2', 1, 1],
        ['Ratna Dewi Astuti, S.Pd.', 'Sekretaris RW 08 Sukamaju', 'RW', 'Pengurus Induk RW', 'blue', '3276085509820004',
          '+62 813-7721-9980', 'Jl. Kenari Raya Blok B-4, RT 02', '/images/pengurus/ratna.jpg', sk, 'Masa Aktif: Th. 2', 1, 2],
        ['Agus Hermawan, S.E.', 'Bendahara RW 08 Sukamaju', 'RW', 'Pengurus Induk RW', 'blue', '3276081403750007',
          '+62 811-2309-4451', 'Jl. Flamboyan No. 12, RT 03', '/images/pengurus/agus.jpg', sk, 'Masa Aktif: Th. 2', 1, 3],
        ['Bambang Supriyadi', 'Ketua RT 04 / RW 08', 'RT 04', 'Ketua RT Terpilih', 'green', '3276082910710003',
          '+62 815-4420-1922', 'Jl. Delima Raya No. 4A, RT 04', '/images/pengurus/bambang.jpg', sk, 'Verifikasi Tuntas', 1, 4],
        ['Suparman Jayadi', 'Koordinator Siskamling RW 08', 'RT 04', 'Seksi Keamanan & Trantib', 'dark', '3276081112770009',
          '+62 857-1900-3342', 'Pos Terpadu RW 08 / RT 04', '/images/pengurus/suparman.jpg', sk, 'Petugas Siaga', 1, 5],
      ]]
    );
    console.log('✔ Contoh struktur pengurus dibuat');
  }

  if (await isEmpty('official_mutations')) {
    const [rows] = await conn.query('SELECT id, jabatan FROM officials');
    const idOf = (jabatan) => rows.find((r) => r.jabatan === jabatan)?.id ?? null;
    await conn.query(
      `INSERT INTO official_mutations
         (official_id, tanggal_efektif, jabatan, pejabat_lama, keterangan_lama, pejabat_baru, keterangan_baru, no_sk, status)
       VALUES ?`,
      [[
        [idOf('Ketua RT 04 / RW 08'), '2023-11-15', 'Ketua RT 04 / RW 08', 'Drs. Mulyono Hadi', 'Demisioner', 'Bambang Supriyadi', null, '142/SK-SKM/2023', 'disahkan'],
        [idOf('Ketua RW 08 Sukamaju'), '2023-11-10', 'Ketua RW 08 Sukamaju', 'H. Suryadi Pratama', 'Periode 1', 'H. Suryadi Pratama', 'Terpilih Kembali', '139/SK-SKM/2023', 'disahkan'],
        [idOf('Koordinator Siskamling RW 08'), '2023-08-01', 'Seksi Keamanan & Trantib', 'Ahmad Junaidi', 'Pindah Domisili', 'Suparman Jayadi', null, '088/SK-SKM/2023', 'disahkan'],
        [null, '2024-10-12', 'Seksi Kebersihan RT 02', 'Dedi Kurniawan', 'Mengundurkan Diri', 'Wahyu Pratomo', 'Usulan Rapat RT', null, 'diproses'],
      ]]
    );
    console.log('✔ Contoh riwayat mutasi pengurus dibuat');
  }
}

const conn = await mysql.createConnection({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  multipleStatements: true,
});

try {
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(`USE \`${DB_NAME}\``);

  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await conn.query(schema);
  console.log(`✔ Skema database "${DB_NAME}" siap`);

  await seedRoles(conn);
  await migrateUsers(conn);
  await seedAdmin(conn);
  await seedContent(conn);
} finally {
  await conn.end();
}
