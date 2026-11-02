// Data dummy untuk semua menu. ID baris yang dibuat dicatat agar `--remove` tidak menyentuh data asli.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const MARKER = '_dummy_seed';
const PASSWORD = 'Dummy@123';
const PIN = '123456';
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Urutan hapus mengikuti foreign key: anak lebih dulu.
const TABLES = ['letters', 'payments', 'official_mutations', 'officials', 'projects', 'activities', 'facilities', 'contacts', 'announcements', 'cash_transactions', 'users', 'roles'];

// [nama, jk, status keluarga, tgl lahir, opsi]; anggota pertama adalah kepala keluarga pemegang no. WA.
const FAMILIES = [
  { blok: 'A', no: '1', hunian: 'tetap', members: [
    ['H. Suryadi Pratama, M.Si.', 'L', 'suami', '1968-04-12', { nik: '3276081204680001', username: 'ketua', role: 'ketua', jabatan: 'Ketua RW 08' }],
    ['Hj. Nurhayati', 'P', 'istri', '1971-08-20'],
    ['Fajar Pratama', 'L', 'anak', '1998-02-03'],
  ] },
  { blok: 'A', no: '7', hunian: 'tetap', members: [
    ['Hendra Wijaya', 'L', 'suami', '1979-11-02'],
    ['Ratna Dewi Astuti, S.Pd.', 'P', 'istri', '1982-09-15', { nik: '3276085509820004', username: 'sekretaris', role: 'sekretaris', jabatan: 'Sekretaris RW 08', wa: true }],
    ['Alya Wijaya', 'P', 'anak', '2010-05-21'],
  ] },
  { blok: 'B', no: '12', hunian: 'tetap', members: [
    ['Agus Hermawan, S.E.', 'L', 'suami', '1975-03-14', { nik: '3276081403750007', username: 'bendahara', role: 'bendahara', jabatan: 'Bendahara RW 08' }],
    ['Siti Aminah', 'P', 'istri', '1978-12-01'],
    ['Rizki Hermawan', 'L', 'anak', '2004-07-30'],
  ] },
  { blok: 'B', no: '18', hunian: 'tetap', members: [
    ['Joko Susilo', 'L', 'suami', '1985-01-25'],
    ['Wulan Sari', 'P', 'istri', '1988-06-11', { username: 'humas', role: 'humas', jabatan: 'Seksi Humas', wa: true }],
    ['Bagas Susilo', 'L', 'anak', '2012-10-09'],
    ['Putri Susilo', 'P', 'anak', '2016-03-17'],
  ] },
  { blok: 'C', no: '3', hunian: 'tetap', members: [
    ['Slamet Riyadi', 'L', 'suami', '1950-07-07', { keberadaan: 'meninggal' }],
    ['Sri Wahyuni', 'P', 'istri', '1955-02-28', { wa: true }],
  ] },
  { blok: 'C', no: '9', hunian: 'kontrak', members: [
    ['Andi Saputra', 'L', 'suami', '1990-09-19', { keberadaan: 'pindah' }],
    ['Maya Anggraini', 'P', 'istri', '1992-04-04', { keberadaan: 'pindah' }],
  ] },
  { blok: 'D', no: '5', hunian: 'kontrak', members: [
    ['Rudi Hartono', 'L', 'suami', '1987-05-13'],
    ['Dewi Lestari', 'P', 'istri', '1989-10-22'],
  ] },
  { blok: 'D', no: '11', hunian: 'kost', members: [
    ['Yusuf Maulana', 'L', 'lainnya', '2000-12-16'],
  ] },
];

const ANNOUNCEMENTS = [
  ['Rapat Warga', 'blue', 'Musyawarah Warga Pembahasan RAB Kas Tahun 2027', 'Seluruh kepala keluarga diundang hadir di Balai Warga pada Sabtu, 14 November 2026 pukul 19.30 WIB untuk membahas rencana anggaran kas.', '2026-11-01', 'Sekretaris RW 08'],
  ['Kesehatan Lingkungan', 'green', 'Posyandu Balita & Lansia Bulan November', 'Posyandu dibuka Selasa, 10 November 2026 pukul 08.00–11.00 WIB di Balai Warga. Harap membawa buku KIA atau kartu berobat.', '2026-10-28', 'Kader Posyandu RT 04'],
  ['Keamanan Wilayah', 'red', 'Jadwal Baru Ronda Malam Mulai November', 'Pembagian regu ronda diperbarui. Warga diminta mengecek jadwal di Pos Kamling dan melapor bila berhalangan.', '2026-10-20', 'Sie Keamanan & Kamtibmas'],
  ['Gotong Royong', 'amber', 'Kerja Bakti Persiapan Musim Hujan', 'Pembersihan saluran air Blok A–D pada Minggu pagi pukul 06.30 WIB. Warga membawa cangkul dan sapu lidi.', '2026-10-05', 'Koordinator Kebersihan'],
  ['Layanan Warga', 'blue', 'Pengajuan Surat Keterangan Kini Lewat Portal', 'Warga dapat mengajukan surat keterangan secara mandiri melalui menu Surat Saya tanpa harus datang ke rumah pengurus.', '2026-09-15', 'Sekretaris RW 08'],
];
const DRAFT_ANNOUNCEMENT = ['Kegiatan', 'green', 'Draf: Lomba Kebersihan Antar Gang', 'Rancangan kegiatan lomba kebersihan menyambut akhir tahun, menunggu keputusan rapat warga.', '2026-11-02', 'Panitia Kegiatan'];

const CASH = [
  ['2026-08-03', 'Penerimaan Iuran Warga Agustus (82 KK)', 'Iuran Warga', 'masuk', 4100000],
  ['2026-08-12', 'Konsumsi & Hadiah Lomba HUT RI ke-81', 'Kegiatan', 'keluar', 1850000],
  ['2026-08-29', 'Honor Petugas Sampah & Kebersihan Agustus', 'Operasional', 'keluar', 1500000],
  ['2026-09-02', 'Penerimaan Iuran Warga September (79 KK)', 'Iuran Warga', 'masuk', 3950000],
  ['2026-09-11', 'Pembelian Lampu Jalan Gang Melati', 'Pemeliharaan', 'keluar', 720000],
  ['2026-09-19', 'Donasi Warga untuk Perbaikan Pos Ronda', 'Donasi', 'masuk', 1250000],
  ['2026-09-29', 'Honor Petugas Sampah & Kebersihan September', 'Operasional', 'keluar', 1500000],
  ['2026-10-02', 'Penerimaan Iuran Warga Oktober (84 KK)', 'Iuran Warga', 'masuk', 4200000],
  ['2026-10-10', 'Konsumsi Kerja Bakti Bulanan', 'Kegiatan', 'keluar', 550000],
  ['2026-10-17', 'Konsumsi Pertemuan Warga Bulanan', 'Konsumsi Rapat', 'keluar', 350000],
  ['2026-10-24', 'Pengecatan Pos Ronda RT 04', 'Pemeliharaan', 'keluar', 980000],
  ['2026-10-30', 'Honor Petugas Sampah & Kebersihan Oktober', 'Operasional', 'keluar', 1500000],
  ['2026-11-01', 'Penerimaan Iuran Warga November (46 KK sementara)', 'Iuran Warga', 'masuk', 2300000],
  ['2026-11-02', 'Pembelian Alat Tulis Sekretariat', 'Operasional', 'keluar', 175000],
];

const CONTACTS = [
  ['Puskesmas Sukamaju', 'Layanan Kesehatan', '021-876-1234', 'telepon', 'default', 4],
  ['Damkar Sektor Sukamaju', 'Darurat Kebakaran', '113', 'telepon', 'danger', 5],
  ['Wulan Sari', 'Seksi Humas & Informasi', '0857-9900-0401', 'whatsapp', 'default', 6],
];

const PROJECTS = [
  ['Betonisasi Jalan Gang Melati', '021/SK-RW08/I/2026', '2026-01-15', '2026-02-02', '2026-03-14', 48500000, 'Dana Kelurahan', '120 m × 3 m'],
  ['Pembangunan Drainase Blok C', '034/SK-RW08/III/2026', '2026-03-09', '2026-04-06', '2026-05-30', 36750000, 'Swadaya Warga', '85 m'],
  ['Perbaikan Atap Balai Warga', '047/SK-RW08/V/2026', '2026-05-18', '2026-06-01', '2026-06-20', 12400000, 'Kas RW 08', '64 m²'],
  ['Pemasangan Lampu Penerangan Jalan', '058/SK-RW08/VII/2026', '2026-07-06', '2026-07-20', '2026-08-15', 18900000, 'CSR PT Sukamaju Sejahtera', '24 titik'],
  ['Pengecatan Gapura & Pos Ronda', '066/SK-RW08/IX/2026', '2026-09-07', '2026-10-05', '2026-10-31', 6250000, 'Kas RT 04', '3 unit'],
  ['Pembuatan Taman Bermain Anak', '072/SK-RW08/X/2026', '2026-10-12', '2026-11-09', '2026-12-19', 27500000, 'Dana Kelurahan', '150 m²'],
];

const OFFICIALS = [
  ['Rudi Hartono', 'Seksi Kebersihan RT 04', 'RT 04', 'Seksi Kebersihan', 'green', '+62 857-9900-0701', 'Blok D No. 5, RT 04', 'Masa Aktif: Th. 1', 6],
  ['Wulan Sari', 'Seksi Humas & Informasi RW 08', 'RW', 'Seksi Humas', 'amber', '+62 857-9900-0401', 'Blok B No. 18, RT 04', 'Masa Aktif: Th. 1', 7],
  ['Joko Susilo', 'Seksi Pemuda & Olahraga RT 04', 'RT 04', 'Seksi Kepemudaan', 'green', '+62 857-9900-0402', 'Blok B No. 18, RT 04', 'Masa Aktif: Th. 1', 8],
];

const JENIS = {
  domisili: 'Surat Keterangan Domisili',
  usaha: 'Surat Keterangan Usaha',
  tidakMampu: 'Surat Keterangan Tidak Mampu',
  pengantar: 'Surat Pengantar KTP/KK',
};

const photos = (name, count) => JSON.stringify(Array.from({ length: count }, (_, i) => `/images/dummy/${name}-${i + 1}.jpg`));

const ACTIVITIES = [
  { judul: 'Musyawarah Warga RAB Kas 2027', kategori: 'Rapat Warga', deskripsi: 'Pembahasan rencana anggaran kas tahun 2027 bersama seluruh kepala keluarga. Warga dipersilakan menyampaikan usulan program lingkungan.', tanggal: '2026-11-14', waktu: '19.30 WIB', lokasi: 'Balai Warga RT 04', penanggung_jawab: 'Sekretaris RW 08', fotos: photos('rapat', 2) },
  { judul: 'Posyandu Balita & Lansia November', kategori: 'Kesehatan', deskripsi: 'Penimbangan balita, imunisasi, dan cek tekanan darah lansia bersama kader posyandu. Harap membawa buku KIA atau kartu berobat.', tanggal: '2026-11-10', waktu: '08.00–11.00 WIB', lokasi: 'Balai Warga RT 04', penanggung_jawab: 'Kader Posyandu RT 04', fotos: photos('posyandu', 2) },
  { judul: 'Kerja Bakti Persiapan Musim Hujan', kategori: 'Gotong Royong', deskripsi: 'Warga Blok A sampai D bersama-sama membersihkan saluran air dan memangkas rumput liar untuk mengantisipasi genangan saat musim hujan.', tanggal: '2026-10-18', waktu: '06.30–10.00 WIB', lokasi: 'Saluran Blok A–D', penanggung_jawab: 'Seksi Kebersihan RT 04', fotos: photos('kerja-bakti', 3) },
  { judul: 'Pengajian Rutin Ibu-Ibu', kategori: 'Keagamaan', deskripsi: 'Pengajian bulanan dan tausiyah yang diikuti ibu-ibu warga, dilanjutkan dengan arisan dan silaturahmi.', tanggal: '2026-10-09', waktu: '15.30 WIB', lokasi: 'Musala Al-Ikhlas', penanggung_jawab: 'Seksi Keagamaan RT 04', fotos: photos('pengajian', 2) },
  { judul: 'Senam Sehat Bersama', kategori: 'Olahraga', deskripsi: 'Senam pagi bersama warga semua usia dipandu instruktur, ditutup dengan pemeriksaan kesehatan ringan.', tanggal: '2026-09-20', waktu: '06.30 WIB', lokasi: 'Lapangan Serbaguna', penanggung_jawab: 'Seksi Pemuda & Olahraga', fotos: photos('senam', 2) },
  { judul: 'Lomba Agustusan HUT RI ke-81', kategori: 'Perayaan', deskripsi: 'Rangkaian lomba kemerdekaan untuk anak-anak dan dewasa, dengan panjat pinang sebagai acara puncak.', tanggal: '2026-08-17', waktu: '07.00–17.00 WIB', lokasi: 'Lapangan Serbaguna', penanggung_jawab: 'Panitia HUT RI RT 04', fotos: photos('hut-ri', 3) },
];
const DRAFT_ACTIVITY = { judul: 'Draf: Lomba Kebersihan Antar Gang', kategori: 'Gotong Royong', deskripsi: 'Rancangan lomba kebersihan menyambut akhir tahun, menunggu keputusan rapat warga.', tanggal: '2026-12-06', lokasi: 'Seluruh gang', fotos: '[]', is_published: 0 };

const FACILITIES = [
  { nama: 'Balai Warga RT 04', kategori: 'Gedung Serbaguna', deskripsi: 'Tempat rapat warga, posyandu, dan acara keluarga. Dapat dipinjam warga dengan menghubungi sekretaris.', lokasi: 'Jl. Kemuning Raya', kondisi: 'baik', jam_operasional: 'Setiap hari, 08.00–21.00 WIB', penanggung_jawab: 'Sekretaris RW 08', fotos: photos('balai', 2) },
  { nama: 'Lapangan Serbaguna', kategori: 'Olahraga', deskripsi: 'Lapangan terbuka untuk olahraga, senam bersama, dan perayaan warga.', lokasi: 'Belakang Blok C', kondisi: 'baik', jam_operasional: 'Setiap hari, 05.00–18.00 WIB', penanggung_jawab: 'Seksi Pemuda & Olahraga', fotos: photos('lapangan', 2) },
  { nama: 'Pos Ronda Utama', kategori: 'Keamanan', deskripsi: 'Pos jaga regu ronda malam dan titik lapor tamu. Sedang dicat ulang dan atapnya diperbaiki.', lokasi: 'Gerbang Gang Melati', kondisi: 'perbaikan', jam_operasional: '24 jam', penanggung_jawab: 'Seksi Keamanan & Trantib', fotos: photos('pos-ronda', 2) },
  { nama: 'Musala Al-Ikhlas', kategori: 'Ibadah', deskripsi: 'Musala lingkungan untuk salat berjamaah dan pengajian rutin warga.', lokasi: 'Blok B', kondisi: 'baik', jam_operasional: 'Setiap waktu salat', penanggung_jawab: 'Seksi Keagamaan RT 04', fotos: photos('musala', 2) },
  { nama: 'Taman Bermain Anak', kategori: 'Ruang Terbuka', deskripsi: 'Area bermain anak dengan perosotan dan ayunan. Anak di bawah 5 tahun wajib didampingi orang tua.', lokasi: 'Samping Balai Warga', kondisi: 'baik', jam_operasional: 'Setiap hari, 06.00–18.00 WIB', penanggung_jawab: 'Seksi Pemuda & Olahraga', fotos: photos('taman', 2) },
  { nama: 'Bank Sampah Harmoni', kategori: 'Kebersihan', deskripsi: 'Tempat warga menyetor sampah terpilah untuk ditabung. Saat ini tutup sementara karena mesin pencacah rusak.', lokasi: 'Ujung Blok D', kondisi: 'rusak', jam_operasional: 'Sabtu, 08.00–11.00 WIB', penanggung_jawab: 'Seksi Kebersihan RT 04', fotos: photos('bank-sampah', 2) },
];

async function seedGallery(conn, ids) {
  ids.activities = [];
  ids.facilities = [];
  for (const row of [...ACTIVITIES, DRAFT_ACTIVITY]) {
    const [result] = await conn.query('INSERT INTO activities SET ?', [row]);
    ids.activities.push(result.insertId);
  }
  for (const [i, row] of FACILITIES.entries()) {
    const [result] = await conn.query('INSERT INTO facilities SET ?', [{ ...row, urutan: i + 1 }]);
    ids.facilities.push(result.insertId);
  }
}

async function readMarker(conn) {
  const [rows] = await conn.query('SELECT `value` FROM settings WHERE `key` = ?', [MARKER]);
  return rows[0] ? JSON.parse(rows[0].value) : null;
}

async function seed(conn) {
  const ids = Object.fromEntries(TABLES.map((t) => [t, []]));
  const insert = async (table, row) => {
    const [result] = await conn.query(`INSERT INTO ${table} SET ?`, [row]);
    ids[table].push(result.insertId);
    return result.insertId;
  };

  const [[admin]] = await conn.query("SELECT id FROM users WHERE username = 'admin'");
  if (!admin) throw new Error('Akun admin tidak ditemukan. Jalankan npm run db:init lebih dulu.');
  const [roleRows] = await conn.query('SELECT id, slug FROM roles');
  const roleId = Object.fromEntries(roleRows.map((r) => [r.slug, r.id]));

  roleId.humas = await insert('roles', {
    nama: 'Seksi Humas',
    slug: 'humas',
    deskripsi: 'Contoh role buatan sendiri: mengelola pengumuman dan kontak',
    permissions: JSON.stringify(['announcements.manage', 'contacts.manage']),
    is_system: 0,
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const pinHash = await bcrypt.hash(PIN, 10);
  const person = {};
  const heads = [];
  let seq = 0;

  for (const [f, family] of FAMILIES.entries()) {
    const noKk = `32760880${String(f + 1).padStart(8, '0')}`;
    for (const [m, [nama, jk, status, lahir, opt = {}]] of family.members.entries()) {
      seq += 1;
      const hasWa = m === 0 || opt.wa;
      const id = await insert('users', {
        username: opt.username ?? null,
        password_hash: opt.username ? passwordHash : null,
        role_id: roleId[opt.role ?? 'warga'],
        nik: opt.nik ?? `32760890${String(seq).padStart(8, '0')}`,
        no_kk: noKk,
        nama,
        no_wa: hasWa ? `085799${String(seq).padStart(6, '0')}` : null,
        email: hasWa ? `warga${seq}@contoh.test` : null,
        jenis_kelamin: jk,
        tanggal_lahir: lahir,
        alamat: `Blok ${family.blok} No. ${family.no}, RT 04 / RW 08, Sukamaju`,
        blok: family.blok,
        no_rumah: family.no,
        status_hunian: family.hunian,
        jabatan: opt.jabatan ?? null,
        status_keluarga: status,
        keberadaan: opt.keberadaan ?? 'netap',
        pin_hash: pinHash,
      });
      person[nama] = id;
      if (m === 0) heads.push({ id, netap: (opt.keberadaan ?? 'netap') === 'netap' });
    }
  }
  const ratna = person['Ratna Dewi Astuti, S.Pd.'];
  const agus = person['Agus Hermawan, S.E.'];
  const suryadi = person['H. Suryadi Pratama, M.Si.'];

  for (const [a, row] of ANNOUNCEMENTS.entries()) {
    const [kategori, warna, judul, isi, tanggal, pj] = row;
    await insert('announcements', { kategori, warna, judul, isi, tanggal, penanggung_jawab: pj, is_published: 1 });
    if (a === ANNOUNCEMENTS.length - 1) {
      const [k, w, j, i, t, p] = DRAFT_ANNOUNCEMENT;
      await insert('announcements', { kategori: k, warna: w, judul: j, isi: i, tanggal: t, penanggung_jawab: p, is_published: 0 });
    }
  }

  for (const [tanggal, uraian, kategori, jenis, nominal] of CASH) {
    await insert('cash_transactions', { tanggal, uraian, kategori, jenis, nominal, created_by: admin.id });
  }

  for (const [nama, keterangan, telepon, aksi, tone, urutan] of CONTACTS) {
    await insert('contacts', { nama, keterangan, telepon, aksi, tone, urutan });
  }

  for (const [nama_kegiatan, no_sk, tgl_sk, tgl_mulai, tgl_selesai, nilai, asal_projek, volume] of PROJECTS) {
    await insert('projects', { nama_kegiatan, no_sk, tgl_sk, tgl_mulai, tgl_selesai, nilai, asal_projek, volume });
  }

  // Bulan lama lunas semua; makin baru makin banyak yang belum bayar, supaya pencarian per bulan terlihat bedanya.
  const payers = [...heads.filter((h) => h.netap).map((h) => h.id), admin.id];
  const periods = [
    { bulan: 8, tanggal: '2026-08-05', count: payers.length },
    { bulan: 9, tanggal: '2026-09-04', count: payers.length },
    { bulan: 10, tanggal: '2026-10-06', count: payers.length - 1 },
    { bulan: 11, tanggal: '2026-11-01', count: 3 },
  ];
  for (const { bulan, tanggal, count } of periods) {
    for (const user_id of payers.slice(-count)) {
      await insert('payments', { user_id, tanggal, keterangan: `Iuran Bulanan ${NAMA_BULAN[bulan - 1]} 2026`, nominal: 50000, bulan, tahun: 2026 });
    }
  }

  const [[{ urutAkhir }]] = await conn.query('SELECT COALESCE(MAX(nomor_urut), 0) AS urutAkhir FROM letters WHERE nomor_tahun = 2026');
  let urut = Number(urutAkhir);
  const nomor = (romawi) => {
    urut += 1;
    return { nomor_tahun: 2026, nomor_urut: urut, nomor_surat: `${String(urut).padStart(3, '0')}/SK/RT04-RW08/${romawi}/2026` };
  };
  const accSekretaris = (at) => ({ acc_sekretaris_by: ratna, acc_sekretaris_at: at });
  const accBendahara = (at) => ({ acc_bendahara_by: agus, acc_bendahara_at: at });
  const accKetua = (at) => ({ acc_ketua_by: suryadi, acc_ketua_at: at });
  const letter = (user_id, tanggal_pengajuan, jenis_surat, keperluan, tanggal_pelaksanaan, extra = {}) =>
    insert('letters', { user_id, tanggal_pengajuan, jenis_surat, keperluan, tanggal_pelaksanaan, ...extra });

  await letter(person['Joko Susilo'], '2026-08-11', JENIS.domisili, 'Persyaratan pembukaan rekening bank', '2026-08-18', {
    ...nomor('VIII'), status: 'disetujui', ...accSekretaris('2026-08-12 09:15:00'), ...accBendahara('2026-08-12 16:40:00'), ...accKetua('2026-08-13 08:05:00'),
  });
  await letter(person['Rudi Hartono'], '2026-09-07', JENIS.usaha, 'Pengajuan pinjaman modal usaha warung', '2026-09-14', {
    ...nomor('IX'), status: 'disetujui', ...accSekretaris('2026-09-08 10:00:00'), ...accBendahara('2026-09-08 19:20:00'), ...accKetua('2026-09-09 07:45:00'),
  });
  await letter(admin.id, '2026-10-05', JENIS.domisili, 'Perpanjangan dokumen kendaraan', '2026-10-12', {
    ...nomor('X'), status: 'disetujui', ...accSekretaris('2026-10-06 08:30:00'), ...accBendahara('2026-10-06 13:10:00'), ...accKetua('2026-10-07 09:00:00'),
  });
  await letter(person['Sri Wahyuni'], '2026-10-19', JENIS.tidakMampu, 'Pengajuan keringanan biaya berobat', '2026-10-26', {
    ...nomor('X'), status: 'diproses', ...accSekretaris('2026-10-20 09:40:00'), ...accBendahara('2026-10-21 15:00:00'),
  });
  await letter(person['Hendra Wijaya'], '2026-10-27', JENIS.pengantar, 'Perubahan data Kartu Keluarga', '2026-11-03', {
    ...nomor('X'), status: 'diproses', ...accSekretaris('2026-10-28 11:25:00'),
  });
  await letter(person['Yusuf Maulana'], '2026-10-14', JENIS.domisili, 'Melamar pekerjaan', '2026-10-20', {
    status: 'ditolak', alasan_tolak: 'Berkas pendukung belum lengkap, harap lampirkan surat keterangan kost',
  });
  await letter(person['Dewi Lestari'], '2026-11-01', JENIS.usaha, 'Pendaftaran izin usaha katering', '2026-11-09');
  await letter(person['Wulan Sari'], '2026-11-02', JENIS.pengantar, 'Pembuatan KTP anak', '2026-11-10');
  await letter(admin.id, '2026-11-02', JENIS.tidakMampu, 'Contoh pengajuan yang masih menunggu ACC sekretaris', '2026-11-12');

  const officialId = {};
  for (const [nama, jabatan, satuan, label, warna, no_wa, domisili, status_label, urutan] of OFFICIALS) {
    officialId[nama] = await insert('officials', {
      nama, jabatan, satuan, label, warna, no_wa, domisili, status_label, urutan, no_sk: '061/SK-RW08/VIII/2026', is_utama: 0,
    });
  }

  const mutations = [
    [officialId['Rudi Hartono'], '2026-08-17', 'Seksi Kebersihan RT 04', 'Dedi Kurniawan', 'Mengundurkan Diri', 'Rudi Hartono', 'Usulan Rapat RT', '061/SK-RW08/VIII/2026', 'disahkan'],
    [officialId['Wulan Sari'], '2026-08-17', 'Seksi Humas & Informasi RW 08', null, 'Jabatan Baru', 'Wulan Sari', 'Penunjukan RW', '061/SK-RW08/VIII/2026', 'disahkan'],
    [officialId['Joko Susilo'], '2026-10-25', 'Seksi Pemuda & Olahraga RT 04', 'Fajar Pratama', 'Masa Bakti Selesai', 'Joko Susilo', 'Usulan Rapat RT', null, 'diproses'],
    [null, '2026-10-30', 'Seksi Keagamaan RT 04', 'Slamet Riyadi', 'Meninggal Dunia', 'Hendra Wijaya', 'Usulan Warga', null, 'ditolak'],
  ];
  for (const [official_id, tanggal_efektif, jabatan, pejabat_lama, keterangan_lama, pejabat_baru, keterangan_baru, no_sk, status] of mutations) {
    await insert('official_mutations', { official_id, tanggal_efektif, jabatan, pejabat_lama, keterangan_lama, pejabat_baru, keterangan_baru, no_sk, status });
  }

  await seedGallery(conn, ids);
  await conn.query('INSERT INTO settings (`key`, `value`) VALUES (?, ?)', [MARKER, JSON.stringify(ids)]);
  for (const table of TABLES) console.log(`✔ ${table}: ${ids[table].length} baris`);
  console.log(`\nLogin pengurus: ketua | sekretaris | bendahara | humas — password ${PASSWORD}`);
  console.log(`Login warga: NIK di Master User — PIN ${PIN}`);
}

async function remove(conn, ids) {
  // Pembayaran/surat yang ditambahkan kemudian untuk warga dummy ikut terhapus; kalau tidak, warganya tidak bisa dihapus.
  if (ids.users.length) {
    await conn.query('DELETE FROM letters WHERE user_id IN (?)', [ids.users]);
    await conn.query('DELETE FROM payments WHERE user_id IN (?)', [ids.users]);
  }
  for (const table of TABLES) {
    if (!ids[table]?.length) continue;
    const [result] = await conn.query(`DELETE FROM ${table} WHERE id IN (?)`, [ids[table]]);
    console.log(`✔ ${table}: ${result.affectedRows} baris dihapus`);
  }
  await conn.query('DELETE FROM settings WHERE `key` = ?', [MARKER]);
}

const removing = process.argv.includes('--remove');
const conn = await pool.getConnection();
try {
  const existing = await readMarker(conn);
  if (removing && !existing) {
    console.log('• Tidak ada data dummy yang tercatat');
  } else if (!removing && existing && !existing.activities) {
    // Seed lama belum punya kegiatan & fasilitas: tambahkan saja tanpa mengganggu data dummy lain.
    await seedGallery(conn, existing);
    await conn.query('UPDATE settings SET `value` = ? WHERE `key` = ?', [JSON.stringify(existing), MARKER]);
    console.log(`✔ activities: ${existing.activities.length} baris\n✔ facilities: ${existing.facilities.length} baris`);
  } else if (!removing && existing) {
    console.log('• Data dummy sudah ada. Jalankan npm run db:dummy:remove untuk menghapusnya.');
  } else {
    await conn.beginTransaction();
    try {
      await (removing ? remove(conn, existing) : seed(conn));
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  }
} finally {
  conn.release();
  await pool.end();
}
