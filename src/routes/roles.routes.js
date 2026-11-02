import { Router } from 'express';
import { body, param } from 'express-validator';
import * as roles from '../controllers/roles.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const idParam = param('id').isInt({ min: 1 }).withMessage('ID tidak valid');
const rules = (required) => [
  (required ? body('nama') : body('nama').optional()).trim().isLength({ min: 3, max: 60 }).withMessage('Nama role minimal 3 karakter'),
  body('slug').optional({ values: 'falsy' }).matches(/^[a-zA-Z0-9-_ ]{2,40}$/).withMessage('Slug hanya huruf, angka, dan tanda hubung'),
  body('deskripsi').optional({ values: 'falsy' }).isLength({ max: 255 }),
  body('permissions').optional().isArray().withMessage('Hak akses harus berupa daftar'),
];

// Daftar role juga dibutuhkan form pengguna, jadi cukup users.manage atau roles.manage.
router.get('/', authorize('roles.manage', 'users.manage'), roles.list);
router.get('/permissions', authorize('roles.manage'), roles.permissionCatalog);
router.get('/:id', authorize('roles.manage'), idParam, validate, roles.detail);
router.post('/', authorize('roles.manage'), rules(true), validate, roles.create);
router.put('/:id', authorize('roles.manage'), idParam, rules(false), validate, roles.update);
router.delete('/:id', authorize('roles.manage'), idParam, validate, roles.remove);

export default router;
