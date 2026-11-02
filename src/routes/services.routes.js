import { Router } from 'express';
import { body, param } from 'express-validator';
import { LETTER_STAFF, letters, payments, projects, wargaOptions } from '../controllers/services.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const idParam = param('id').isInt({ min: 1 }).withMessage('ID tidak valid');
const field = (required) => (name) => (required ? body(name) : body(name).optional());
const optionalDate = (name) => body(name).optional({ values: 'falsy' }).isISO8601().withMessage('Tanggal tidak valid');

router.get('/warga-options', authorize('payments.manage', 'letters.manage'), wargaOptions);

/* Pembangunan lingkungan */
const canProjects = authorize('projects.manage');
const projectRules = (required) => [
  field(required)('nama_kegiatan').trim().isLength({ min: 3, max: 160 }).withMessage('Nama kegiatan minimal 3 karakter'),
  optionalDate('tgl_sk'),
  optionalDate('tgl_mulai'),
  optionalDate('tgl_selesai'),
  body('tgl_selesai')
    .optional({ values: 'falsy' })
    .custom((value, { req }) => !req.body.tgl_mulai || value >= req.body.tgl_mulai)
    .withMessage('Tanggal akhir tidak boleh sebelum tanggal awal'),
  field(required)('nilai').isInt({ min: 0 }).withMessage('Nilai projek harus berupa angka').toInt(),
  body('no_sk').optional({ values: 'falsy' }).isLength({ max: 60 }),
  body('asal_projek').optional({ values: 'falsy' }).isLength({ max: 120 }),
  body('volume').optional({ values: 'falsy' }).isLength({ max: 60 }),
];
router.get('/projects', canProjects, projects.list);
router.get('/projects/:id', canProjects, idParam, validate, projects.detail);
router.post('/projects', canProjects, projectRules(true), validate, projects.create);
router.put('/projects/:id', canProjects, idParam, projectRules(false), validate, projects.update);
router.delete('/projects/:id', canProjects, idParam, validate, projects.remove);

/* Pembayaran warga */
const canPayments = authorize('payments.manage');
const paymentRules = (required) => {
  const f = field(required);
  return [
    f('user_id').isInt({ min: 1 }).withMessage('Pilih warga').toInt(),
    f('tanggal').isISO8601().withMessage('Tanggal tidak valid'),
    f('keterangan').trim().isLength({ min: 3, max: 200 }).withMessage('Keterangan minimal 3 karakter'),
    f('nominal').isInt({ min: 1 }).withMessage('Nominal harus lebih dari 0').toInt(),
    f('bulan').isInt({ min: 1, max: 12 }).withMessage('Bulan tidak valid').toInt(),
    f('tahun').isInt({ min: 2000, max: 2100 }).withMessage('Tahun tidak valid').toInt(),
  ];
};
router.get('/payments/mine', payments.mine);
router.get('/payments', canPayments, payments.list);
router.get('/payments/:id', canPayments, idParam, validate, payments.detail);
router.post('/payments', canPayments, paymentRules(true), validate, payments.create);
router.put('/payments/:id', canPayments, idParam, paymentRules(false), validate, payments.update);
router.delete('/payments/:id', canPayments, idParam, validate, payments.remove);

/* Surat keterangan */
const letterRules = (required) => {
  const f = field(required);
  return [
    f('jenis_surat').trim().isLength({ min: 3, max: 100 }).withMessage('Jenis surat wajib diisi'),
    f('keperluan').trim().isLength({ min: 3, max: 255 }).withMessage('Keperluan wajib diisi'),
    optionalDate('tanggal_pengajuan'),
    optionalDate('tanggal_pelaksanaan'),
    body('user_id').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Warga tidak valid').toInt(),
  ];
};
router.get('/letters/mine', letters.mine);
router.get('/letters', authorize(...LETTER_STAFF), letters.list);
router.get('/letters/:id', idParam, validate, letters.detail);
router.post('/letters', letterRules(true), validate, letters.create);
router.put('/letters/:id', idParam, letterRules(false), validate, letters.update);
router.delete('/letters/:id', idParam, validate, letters.remove);
router.post(
  '/letters/:id/acc',
  idParam,
  body('tahap').isIn(['sekretaris', 'bendahara', 'ketua']).withMessage('Tahap ACC tidak valid'),
  validate,
  letters.acc
);
router.post(
  '/letters/:id/reject',
  authorize(...LETTER_STAFF),
  idParam,
  body('alasan').trim().isLength({ min: 3, max: 255 }).withMessage('Alasan penolakan wajib diisi'),
  validate,
  letters.reject
);

export default router;
