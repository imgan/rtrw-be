import { Router } from 'express';
import { body, param } from 'express-validator';
import { activities, announcements, contacts, facilities } from '../controllers/content.controller.js';
import * as cash from '../controllers/cash.controller.js';
import * as settings from '../controllers/settings.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadFile } from '../middleware/upload.js';
import * as officials from '../controllers/officials.controller.js';

const router = Router();

// Hak akses per modul (lihat src/config/permissions.js).
router.use(authenticate);
router.use('/settings/home', authorize('home.manage'));
router.use('/settings/struktur', authorize('struktur.manage'));
router.use('/uploads', authorize('home.manage', 'struktur.manage', 'activities.manage', 'facilities.manage'));
router.use('/announcements', authorize('announcements.manage'));
router.use('/activities', authorize('activities.manage'));
router.use('/facilities', authorize('facilities.manage'));
router.use('/cash', authorize('cash.manage'));
router.use('/contacts', authorize('contacts.manage'));
router.use(['/officials', '/official-mutations'], authorize('struktur.manage'));

const idParam = param('id').isInt({ min: 1 }).withMessage('ID tidak valid');
const field = (required) => (name) => (required ? body(name) : body(name).optional());

/** Daftarkan GET/POST/PUT/DELETE standar untuk satu resource. */
function resource(path, ctrl, rules) {
  router.get(path, ctrl.list);
  router.get(`${path}/:id`, idParam, validate, ctrl.detail);
  router.post(path, rules(true), validate, ctrl.create);
  router.put(`${path}/:id`, idParam, rules(false), validate, ctrl.update);
  router.delete(`${path}/:id`, idParam, validate, ctrl.remove);
}

// Pengaturan (key: home | struktur)
router.get('/settings/:key', settings.show);
router.put('/settings/:key', settings.update);
router.post('/uploads', uploadFile, (req, res) => {
  res.status(201).json({ message: 'Berkas berhasil diunggah', url: `/uploads/${req.file.filename}` });
});

// Struktur pengurus — overview & riwayat didaftarkan sebelum /officials/:id
const officialRules = (required) => {
  const f = field(required);
  return [
    f('nama').trim().isLength({ min: 3, max: 120 }).withMessage('Nama minimal 3 karakter'),
    f('jabatan').trim().isLength({ min: 3, max: 120 }).withMessage('Jabatan wajib diisi'),
    f('satuan').trim().isLength({ min: 2, max: 20 }).withMessage('Satuan wajib diisi'),
    body('warna').optional().isIn(['blue', 'green', 'dark', 'amber']).withMessage('Warna tidak valid'),
    body('nik').optional({ values: 'falsy' }).matches(/^\d{16}$/).withMessage('NIK harus 16 digit angka'),
    body('no_wa').optional({ values: 'falsy' }).matches(/^[\d+()\s-]{8,20}$/).withMessage('Nomor WhatsApp tidak valid'),
    body('urutan').optional().isInt().toInt(),
    body('is_utama').optional().isBoolean().toBoolean(),
    body('is_active').optional().isBoolean().toBoolean(),
  ];
};
router.get('/officials/overview', officials.overview);
resource('/official-mutations', officials.mutations, (required) => {
  const f = field(required);
  return [
    f('tanggal_efektif').isISO8601().withMessage('Tanggal tidak valid'),
    f('jabatan').trim().isLength({ min: 3, max: 120 }).withMessage('Jabatan wajib diisi'),
    f('pejabat_baru').trim().isLength({ min: 3, max: 120 }).withMessage('Nama pejabat baru wajib diisi'),
    body('status').optional().isIn(['disahkan', 'diproses', 'ditolak']).withMessage('Status tidak valid'),
  ];
});
resource('/officials', officials, officialRules);
router.post(
  '/officials/:id/replace',
  idParam,
  body('nama').trim().isLength({ min: 3, max: 120 }).withMessage('Nama pejabat baru minimal 3 karakter'),
  body('nik').optional({ values: 'falsy' }).matches(/^\d{16}$/).withMessage('NIK harus 16 digit angka'),
  body('no_wa').optional({ values: 'falsy' }).matches(/^[\d+()\s-]{8,20}$/).withMessage('Nomor WhatsApp tidak valid'),
  body('tanggal_efektif').isISO8601().withMessage('Tanggal efektif wajib diisi'),
  body('status').optional().isIn(['disahkan', 'diproses']),
  validate,
  officials.replace
);

// Kas — summary & categories didaftarkan sebelum /:id
router.get('/cash/summary', cash.summary);
router.get('/cash/categories', cash.categories);
resource('/cash', cash, (required) => {
  const f = field(required);
  return [
    f('tanggal').isISO8601().withMessage('Tanggal tidak valid'),
    f('uraian').trim().isLength({ min: 3, max: 200 }).withMessage('Uraian minimal 3 karakter'),
    f('kategori').trim().isLength({ min: 2, max: 50 }).withMessage('Kategori wajib diisi'),
    f('jenis').isIn(['masuk', 'keluar']).withMessage('Jenis harus masuk atau keluar'),
    f('nominal').isInt({ min: 1 }).withMessage('Nominal harus lebih dari 0').toInt(),
  ];
});

resource('/announcements', announcements, (required) => {
  const f = field(required);
  return [
    f('kategori').trim().isLength({ min: 2, max: 50 }).withMessage('Kategori wajib diisi'),
    body('warna').optional().isIn(['green', 'blue', 'red', 'amber']).withMessage('Warna tidak valid'),
    f('judul').trim().isLength({ min: 5, max: 160 }).withMessage('Judul minimal 5 karakter'),
    f('isi').trim().isLength({ min: 10 }).withMessage('Isi minimal 10 karakter'),
    f('tanggal').isISO8601().withMessage('Tanggal tidak valid'),
    body('penanggung_jawab').optional({ values: 'falsy' }).isLength({ max: 120 }),
    body('is_published').optional().isBoolean().toBoolean(),
  ];
});

// Foto hanya boleh menunjuk berkas di server sendiri.
const photoRules = [
  body('fotos').optional().isArray({ max: 8 }).withMessage('Maksimal 8 foto'),
  body('fotos.*').matches(/^\/(uploads|images)\/[\w/-]+\.\w+$/).withMessage('Alamat foto tidak valid'),
];

resource('/activities', activities, (required) => {
  const f = field(required);
  return [
    f('judul').trim().isLength({ min: 5, max: 160 }).withMessage('Judul minimal 5 karakter'),
    f('kategori').trim().isLength({ min: 2, max: 50 }).withMessage('Kategori wajib diisi'),
    f('deskripsi').trim().isLength({ min: 10 }).withMessage('Deskripsi minimal 10 karakter'),
    f('tanggal').isISO8601().withMessage('Tanggal tidak valid'),
    body('waktu').optional({ values: 'falsy' }).isLength({ max: 40 }),
    body('lokasi').optional({ values: 'falsy' }).isLength({ max: 120 }),
    body('penanggung_jawab').optional({ values: 'falsy' }).isLength({ max: 120 }),
    body('is_published').optional().isBoolean().toBoolean(),
    ...photoRules,
  ];
});

resource('/facilities', facilities, (required) => {
  const f = field(required);
  return [
    f('nama').trim().isLength({ min: 3, max: 120 }).withMessage('Nama minimal 3 karakter'),
    f('kategori').trim().isLength({ min: 2, max: 50 }).withMessage('Kategori wajib diisi'),
    body('kondisi').optional().isIn(['baik', 'perbaikan', 'rusak']).withMessage('Kondisi tidak valid'),
    body('lokasi').optional({ values: 'falsy' }).isLength({ max: 120 }),
    body('jam_operasional').optional({ values: 'falsy' }).isLength({ max: 80 }),
    body('penanggung_jawab').optional({ values: 'falsy' }).isLength({ max: 120 }),
    body('urutan').optional().isInt().toInt(),
    body('is_active').optional().isBoolean().toBoolean(),
    ...photoRules,
  ];
});

resource('/contacts', contacts, (required) => {
  const f = field(required);
  return [
    f('nama').trim().isLength({ min: 2, max: 100 }).withMessage('Nama wajib diisi'),
    body('keterangan').optional({ values: 'falsy' }).isLength({ max: 150 }),
    body('telepon').optional({ values: 'falsy' }).matches(/^[\d+()\s-]{3,30}$/).withMessage('Nomor telepon tidak valid'),
    body('aksi').optional().isIn(['telepon', 'whatsapp']).withMessage('Aksi tidak valid'),
    body('tone').optional().isIn(['primary', 'default', 'danger']).withMessage('Gaya tidak valid'),
    body('urutan').optional().isInt().toInt(),
    body('is_active').optional().isBoolean().toBoolean(),
  ];
});

export default router;
