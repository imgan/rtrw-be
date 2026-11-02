import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { parsePermissions } from '../config/permissions.js';
import { HttpError } from '../utils/httpError.js';
import { isNik, normalizePhone } from '../utils/identity.js';
import { USER_SELECT, toPublicUser } from './users.controller.js';

const signToken = (user, remember) =>
  jwt.sign({ sub: user.id, role: user.role_slug }, process.env.JWT_SECRET, {
    expiresIn: remember ? process.env.JWT_REMEMBER_EXPIRES_IN || '30d' : process.env.JWT_EXPIRES_IN || '8h',
  });

async function findForLogin(where, value) {
  const [rows] = await pool.query(`${USER_SELECT} WHERE ${where} = ? LIMIT 1`, [value]);
  return rows[0];
}

/**
 * portal "pengurus": username + password, role wajib punya minimal satu hak akses CMS.
 * portal "warga":    NIK / No. WhatsApp + PIN 6 digit.
 */
export async function login(req, res) {
  const { portal = 'warga', remember = false } = req.body;
  let user;

  if (portal === 'pengurus') {
    user = await findForLogin('u.username', String(req.body.username).trim().toLowerCase());
    const valid = user?.password_hash && (await bcrypt.compare(String(req.body.password), user.password_hash));
    if (!valid) throw new HttpError(401, 'Username atau password salah');
    if (parsePermissions(user.role_permissions).length === 0) {
      throw new HttpError(403, 'Role akun ini tidak memiliki akses ke panel pengurus');
    }
  } else {
    const id = String(req.body.identifier).trim();
    user = isNik(id) ? await findForLogin('u.nik', id) : await findForLogin('u.no_wa', normalizePhone(id));
    const valid = user && (await bcrypt.compare(String(req.body.pin), user.pin_hash));
    if (!valid) throw new HttpError(401, 'NIK / No. WhatsApp atau PIN salah');
  }

  if (!user.is_active || user.keberadaan !== 'netap') {
    throw new HttpError(403, 'Akun Anda dinonaktifkan. Silakan hubungi pengurus RT');
  }

  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
  res.json({
    message: `Selamat datang, ${user.nama}`,
    token: signToken(user, remember),
    token_type: 'Bearer',
    user: toPublicUser(user),
  });
}

export async function me(req, res) {
  const user = await findForLogin('u.id', req.user.sub);
  res.json({ user: toPublicUser(user) });
}

export async function changePin(req, res) {
  const { current_pin, new_pin } = req.body;
  const [rows] = await pool.query('SELECT pin_hash FROM users WHERE id = ?', [req.user.sub]);
  if (!rows[0] || !(await bcrypt.compare(String(current_pin), rows[0].pin_hash))) {
    throw new HttpError(422, 'PIN lama tidak sesuai', { current_pin: 'PIN lama tidak sesuai' });
  }
  const hash = await bcrypt.hash(String(new_pin), 10);
  await pool.query('UPDATE users SET pin_hash = ? WHERE id = ?', [hash, req.user.sub]);
  res.json({ message: 'PIN berhasil diubah' });
}

export async function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.sub]);
  const hash = rows[0]?.password_hash;
  if (!hash || !(await bcrypt.compare(String(current_password), hash))) {
    throw new HttpError(422, 'Password lama tidak sesuai', { current_password: 'Password lama tidak sesuai' });
  }
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(String(new_password), 10), req.user.sub]);
  res.json({ message: 'Password berhasil diubah' });
}
