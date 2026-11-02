import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' },
});

const isStaffLogin = (_v, { req }) => req.body.portal === 'pengurus';
const isWargaLogin = (_v, { req }) => req.body.portal !== 'pengurus';

router.post(
  '/login',
  loginLimiter,
  body('portal').optional().isIn(['warga', 'pengurus']),
  body('username').if(isStaffLogin).trim().notEmpty().withMessage('Username wajib diisi'),
  body('password').if(isStaffLogin).notEmpty().withMessage('Password wajib diisi'),
  body('identifier').if(isWargaLogin).trim().notEmpty().withMessage('NIK atau No. WhatsApp wajib diisi'),
  body('pin').if(isWargaLogin).matches(/^\d{6}$/).withMessage('PIN harus 6 digit angka'),
  body('remember').optional().isBoolean().toBoolean(),
  validate,
  auth.login
);

router.get('/me', authenticate, auth.me);

router.put(
  '/change-pin',
  authenticate,
  body('current_pin').notEmpty().withMessage('PIN lama wajib diisi'),
  body('new_pin').matches(/^\d{6}$/).withMessage('PIN baru harus 6 digit angka'),
  validate,
  auth.changePin
);

router.put(
  '/change-password',
  authenticate,
  body('current_password').notEmpty().withMessage('Password lama wajib diisi'),
  body('new_password').isLength({ min: 8, max: 72 }).withMessage('Password baru minimal 8 karakter'),
  validate,
  auth.changePassword
);

export default router;
