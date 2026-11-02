import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { hasPermission, parsePermissions } from '../config/permissions.js';
import { HttpError } from '../utils/httpError.js';

// Verifikasi JWT lalu muat role & hak akses terbaru dari database,
// sehingga perubahan role / penonaktifan akun berlaku tanpa menunggu token kedaluwarsa.
export async function authenticate(req, _res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Sesi tidak ditemukan, silakan masuk kembali'));
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new HttpError(401, 'Sesi telah berakhir, silakan masuk kembali'));
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.nama, u.is_active, u.keberadaan, r.slug AS role, r.permissions
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
    [payload.sub]
  );
  const user = rows[0];
  if (!user || !user.is_active || user.keberadaan !== 'netap') return next(new HttpError(401, 'Akun tidak ditemukan atau dinonaktifkan'));

  req.user = { sub: user.id, nama: user.nama, role: user.role, permissions: parsePermissions(user.permissions) };
  next();
}

/** Lolos bila pengguna memiliki salah satu hak akses yang disebut (atau '*'). */
export const authorize = (...keys) => (req, _res, next) => {
  if (!req.user || !keys.some((k) => hasPermission(req.user.permissions, k))) {
    return next(new HttpError(403, 'Anda tidak memiliki akses ke fitur ini'));
  }
  next();
};
