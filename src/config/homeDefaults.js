// Konten bawaan beranda (settings key "home"). Nilai tersimpan digabung di atas ini,
// sehingga field baru otomatis punya nilai awal.
export const HOME_DEFAULTS = {
  site: {
    nama: 'RT 04 / RW 08 Sukamaju',
    wilayah: 'Kelurahan Sukamaju, Kec. Cilodong, Kota Depok',
    alamat: 'Jl. Kemuning Raya RT 04 RW 08 Sukamaju',
    telepon: '0812-3456-7890',
  },
  hero: {
    badge: 'Portal Komunikasi & Administrasi Terpadu Rukun Tetangga',
    judul: 'Selamat Datang di Lingkungan Harmoni, Aman & Transparan',
    kutipan:
      'Kami mendedikasikan portal digital ini demi mempermudah urusan administrasi surat menyurat warga, menyajikan keterbukaan mutlak laporan kas RT, serta mempererat tali gotong royong antarwarga RT 04 / RW 08 Sukamaju.',
    nama_ketua: 'Bambang Supriyadi',
    jabatan_ketua: 'Ketua RT 04 / RW 08 • Masa Bakti 2023–2026',
  },
  siaga: {
    tag: 'Kegiatan Rutin Warga',
    label: 'Siaga Lingkungan',
    judul: 'Jadwal Ronda & Keamanan Mandiri',
    deskripsi:
      'Pos Ronda terpadu aktif 24 jam dengan sistem portal tertutup mulai pukul 23.00 WIB. Tamu wajib lapor 1x24 jam.',
    piket: 'Piket Malam ini: Regu Melati 2',
    personel: '6 Personel',
    gambar: '/images/kegiatan-ronda.jpg',
  },
  statistik: {
    total_kk: 124,
    catatan_kk: '100% Terdata di Dasbor RT',
    total_warga: 418,
    laki_laki: 212,
    perempuan: 206,
    keamanan: '24 Jam',
    keamanan_sub: 'Pos Ronda Aktif',
    keamanan_catatan: '4 Titik CCTV Pantau Siaga',
  },
  kas: {
    audit_terakhir: '2024-09-30',
    status_bendahara: 'Lunas & Terverifikasi',
  },
  wilayah: {
    judul: 'Cakupan Wilayah RT 04 / RW 08',
    deskripsi:
      'Wilayah mencakup Gang Mawar, Gang Melati, Gang Anggrek, dan Kompleks Perumahan Sukamaju Asri Blok C-D.',
    gambar_denah: '/images/denah-wilayah.jpg',
    posko: 'Pos Ronda RT 04 (Depan Lapangan)',
    batas_utara: 'RT 03 / RW 08',
    batas_selatan: 'Saluran Irigasi Sukamaju',
    batas_barat: 'Jalan Raya Cilodong',
  },
  kontak: {
    deskripsi: 'Hubungi penanggung jawab bidang jika membutuhkan tindakan cepat atau bantuan darurat di lingkungan warga.',
    darurat: 'Pusat Bantuan Darurat Medis & Damkar: 112 (Bebas Pulsa)',
  },
  footer: {
    deskripsi:
      'Sistem Portal Administrasi dan Transparansi Lingkungan Warga Sukamaju. Mewujudkan tata kelola akar rumput yang akuntabel, rukun, guyub, dan berkeadaban.',
    sekretariat:
      'Balai Pertemuan RT 04, Jl. Mawar Indah No. 12, Kelurahan Sukamaju, Kota Depok, Jawa Barat 16415.',
    jam_senin_jumat: '19.30 – 21.30 WIB',
    jam_sabtu: '09.00 – 12.00 WIB',
    jam_minggu: 'Khusus Keperluan Mendesak',
  },
};
