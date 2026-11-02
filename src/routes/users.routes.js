import { Router } from 'express';
import { body, param } from 'express-validator';
import * as users from '../controllers/users.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate, authorize('users.manage'));

const idParam = param('id').isInt({ min: 1 }).withMessage('ID tidak valid');

// `required` = true untuk create, false untuk update (semua field opsional).
const userRules = (required) => {
  const field = (name) => (required ? body(name) : body(name).optional());
  const optional = (name) => body(name).optional({ values: 'falsy' });
  return [
    field('nik').matches(/^\d{16}$/).withMessage('NIK harus 16 digit angka'),
    field('nama').trim().isLength({ min: 3, max: 120 }).withMessage('Nama minimal 3 karakter'),
    optional('no_kk').matches(/^\d{16}$/).withMessage('No. KK harus 16 digit angka'),
    optional('no_wa').customSanitizer((v) => String(v).replace(/[\s-]/g, '')).matches(/^(\+?62|0)8\d{7,12}$/).withMessage('Format No. WhatsApp tidak valid'),
    optional('email').isEmail().withMessage('Format email tidak valid'),
    optional('jenis_kelamin').isIn(['L', 'P']).withMessage('Jenis kelamin tidak valid'),
    optional('tanggal_lahir').isISO8601().withMessage('Tanggal lahir tidak valid'),
    optional('alamat').isLength({ max: 255 }),
    optional('blok').isLength({ max: 10 }),
    optional('no_rumah').isLength({ max: 10 }),
    body('status_hunian').optional().isIn(['tetap', 'kontrak', 'kost']).withMessage('Status hunian tidak valid'),
    body('role_id').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Role tidak valid').toInt(),
    optional('status_keluarga').isIn(['suami', 'istri', 'anak', 'lainnya']).withMessage('Status keluarga tidak valid'),
    body('keberadaan').optional().isIn(['netap', 'pindah', 'meninggal']).withMessage('Keberadaan tidak valid'),
    optional('username')
      .trim()
      .matches(/^[a-zA-Z0-9._]{4,50}$/)
      .withMessage('Username 4–50 karakter: huruf, angka, titik, atau garis bawah'),
    optional('password').isLength({ min: 8, max: 72 }).withMessage('Password minimal 8 karakter'),
    optional('jabatan').isLength({ max: 60 }),
    body('is_active').optional().isBoolean().toBoolean(),
    optional('pin').matches(/^\d{6}$/).withMessage('PIN harus 6 digit angka'),
  ];
};

router.get('/', users.list);
router.get('/:id', idParam, validate, users.detail);
router.post('/', userRules(true), validate, users.create);
router.put('/:id', idParam, userRules(false), validate, users.update);
router.delete('/:id', idParam, validate, users.remove);
router.patch('/:id/reset-pin', idParam, validate, users.resetPin);

export default router;
