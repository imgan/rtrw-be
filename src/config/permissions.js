// Katalog hak akses. Role menyimpan daftar key di bawah; '*' berarti semua akses (Administrator).
export const PERMISSION_GROUPS = [
  {
    group: 'Konten Beranda',
    items: [
      { key: 'home.manage', label: 'Pengaturan beranda' },
      { key: 'announcements.manage', label: 'Pengumuman & woro-woro' },
      { key: 'activities.manage', label: 'Kegiatan warga' },
      { key: 'facilities.manage', label: 'Fasilitas umum' },
      { key: 'cash.manage', label: 'Transaksi kas RT' },
      { key: 'contacts.manage', label: 'Kontak pengurus & darurat' },
    ],
  },
  {
    group: 'Layanan Warga',
    items: [
      { key: 'projects.manage', label: 'Pembangunan lingkungan' },
      { key: 'payments.manage', label: 'Pembayaran warga' },
      { key: 'letters.manage', label: 'Kelola surat keterangan' },
      { key: 'letters.acc_sekretaris', label: 'ACC surat: Sekretaris' },
      { key: 'letters.acc_bendahara', label: 'ACC surat: Bendahara' },
      { key: 'letters.acc_ketua', label: 'ACC surat: Ketua RW/RT' },
    ],
  },
  {
    group: 'Master Data',
    items: [
      { key: 'struktur.manage', label: 'Struktur pengurus & riwayat mutasi' },
      { key: 'users.manage', label: 'Data warga & akun pengguna' },
      { key: 'roles.manage', label: 'Role & hak akses' },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const SYSTEM_ROLES = [
  { slug: 'admin', nama: 'Administrator', deskripsi: 'Akses penuh ke seluruh fitur CMS', permissions: ['*'] },
  {
    slug: 'pengurus',
    nama: 'Pengurus RT/RW',
    deskripsi: 'Mengelola konten beranda, kas, struktur, dan data warga',
    permissions: ['home.manage', 'announcements.manage', 'activities.manage', 'facilities.manage', 'cash.manage', 'contacts.manage', 'struktur.manage', 'users.manage', 'projects.manage', 'payments.manage', 'letters.manage'],
  },
  { slug: 'sekretaris', nama: 'Sekretaris', deskripsi: 'Mengelola dan memberi ACC pertama surat keterangan', permissions: ['letters.manage', 'letters.acc_sekretaris'] },
  { slug: 'bendahara', nama: 'Bendahara', deskripsi: 'Mengelola kas, pembayaran warga, dan ACC kedua surat', permissions: ['cash.manage', 'payments.manage', 'letters.acc_bendahara'] },
  { slug: 'ketua', nama: 'Ketua RW/RT', deskripsi: 'Memberi ACC akhir surat keterangan', permissions: ['letters.acc_ketua'] },
  { slug: 'warga', nama: 'Warga', deskripsi: 'Akses portal warga tanpa hak kelola CMS', permissions: [] },
];

export const hasPermission = (perms, key) => perms.includes('*') || perms.includes(key);

/** Aktor hanya boleh memberikan role yang seluruh hak aksesnya juga ia miliki. */
export const canGrant = (actorPerms, rolePerms) =>
  actorPerms.includes('*') || (!rolePerms.includes('*') && rolePerms.every((p) => actorPerms.includes(p)));

export function parsePermissions(value) {
  try {
    const list = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
