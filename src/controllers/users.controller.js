import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { canGrant, parsePermissions } from '../config/permissions.js';
import { HttpError } from '../utils/httpError.js';
import { defaultPinFromBirthdate, normalizePhone } from '../utils/identity.js';

export const USER_SELECT = `
  SELECT u.*, r.nama AS role_nama, r.slug AS role_slug, r.permissions AS role_permissions
  FROM users u JOIN roles r ON r.id = u.role_id`;

const FIELDS = [
  'username', 'role_id', 'nik', 'no_kk', 'nama', 'no_wa', 'email', 'jenis_kelamin', 'tanggal_lahir',
  'alamat', 'blok', 'no_rumah', 'status_hunian', 'jabatan', 'status_keluarga', 'keberadaan', 'is_active',
];

export function toPublicUser(row) {
  const { pin_hash, password_hash, role_nama, role_slug, role_permissions, ...user } = row;
  return {
    ...user,
    is_active: Boolean(user.is_active),
    has_password: Boolean(password_hash),
    role: { id: user.role_id, nama: role_nama, slug: role_slug },
    permissions: parsePermissions(role_permissions),
  };
}

function pickFields(body) {
  const data = {};
  for (const key of FIELDS) {
    if (body[key] === undefined) continue;
    data[key] = body[key] === '' ? null : body[key];
  }
  if ('no_wa' in data) data.no_wa = normalizePhone(data.no_wa);
  if (data.username) data.username = String(data.username).trim().toLowerCase();
  if ('is_active' in data) data.is_active = data.is_active ? 1 : 0;
  return data;
}

async function findRole(id) {
  const [rows] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
  if (!rows[0]) throw new HttpError(422, 'Role tidak ditemukan', { role_id: 'Role tidak ditemukan' });
  return { ...rows[0], permissions: parsePermissions(rows[0].permissions) };
}

// Aktor tidak boleh mengelola / memberikan role yang hak aksesnya melebihi miliknya.
function assertCanGrant(actor, permissions) {
  if (!canGrant(actor.permissions, permissions)) {
    throw new HttpError(403, 'Anda tidak dapat mengelola akun dengan hak akses lebih tinggi dari milik Anda');
  }
}

async function findUser(id) {
  const [rows] = await pool.query(`${USER_SELECT} WHERE u.id = ?`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Data pengguna tidak ditemukan');
  return rows[0];
}

export async function list(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const { search, role_id, status, akun, keberadaan, status_keluarga } = req.query;

  const where = [];
  const params = [];
  if (search) {
    where.push('(u.nama LIKE ? OR u.nik LIKE ? OR u.no_kk LIKE ? OR u.no_wa LIKE ? OR u.username LIKE ? OR CONCAT(u.blok, u.no_rumah) LIKE ?)');
    params.push(...Array(6).fill(`%${search}%`));
  }
  if (keberadaan) {
    where.push('u.keberadaan = ?');
    params.push(keberadaan);
  }
  if (status_keluarga) {
    where.push('u.status_keluarga = ?');
    params.push(status_keluarga);
  }
  if (role_id) {
    where.push('u.role_id = ?');
    params.push(role_id);
  }
  if (status === 'active' || status === 'inactive') {
    where.push('u.is_active = ?');
    params.push(status === 'active' ? 1 : 0);
  }
  if (akun === 'staff') where.push('u.username IS NOT NULL');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);
  const [rows] = await pool.query(`${USER_SELECT} ${whereSql} ORDER BY u.nama ASC LIMIT ? OFFSET ?`, [
    ...params, limit, (page - 1) * limit,
  ]);

  res.json({
    data: rows.map(toPublicUser),
    meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function detail(req, res) {
  res.json({ data: toPublicUser(await findUser(req.params.id)) });
}

export async function create(req, res) {
  const data = pickFields(req.body);
  if (!data.role_id) {
    const [[warga]] = await pool.query("SELECT id FROM roles WHERE slug = 'warga'");
    data.role_id = warga.id;
  }
  assertCanGrant(req.user, (await findRole(data.role_id)).permissions);

  // Anggota keluarga tanpa PIN & tanggal lahir tetap bisa didata; PIN acak berarti belum bisa login sampai direset.
  const pin = req.body.pin || defaultPinFromBirthdate(data.tanggal_lahir) || String(randomInt(100000, 1000000));
  data.pin_hash = await bcrypt.hash(String(pin), 10);
  if (req.body.password) {
    if (!data.username) throw new HttpError(422, 'Username wajib diisi bila password diatur', { username: 'Username wajib diisi' });
    data.password_hash = await bcrypt.hash(String(req.body.password), 10);
  }

  const [result] = await pool.query('INSERT INTO users SET ?', [data]);
  res.status(201).json({
    message: 'Data pengguna berhasil ditambahkan',
    data: toPublicUser(await findUser(result.insertId)),
  });
}

export async function update(req, res) {
  const target = await findUser(req.params.id);
  const data = pickFields(req.body);
  assertCanGrant(req.user, parsePermissions(target.role_permissions));
  if (data.role_id && data.role_id !== target.role_id) assertCanGrant(req.user, (await findRole(data.role_id)).permissions);

  const isSelf = target.id === req.user.sub;
  const leaving = data.keberadaan && data.keberadaan !== 'netap';
  if (isSelf && (data.is_active === 0 || leaving || (data.role_id && Number(data.role_id) !== target.role_id))) {
    throw new HttpError(422, 'Anda tidak dapat menonaktifkan, mengubah role, atau mengubah keberadaan akun sendiri');
  }
  if (req.body.pin) data.pin_hash = await bcrypt.hash(String(req.body.pin), 10);
  if (req.body.password) {
    if (!(data.username ?? target.username)) {
      throw new HttpError(422, 'Username wajib diisi bila password diatur', { username: 'Username wajib diisi' });
    }
    data.password_hash = await bcrypt.hash(String(req.body.password), 10);
  }
  // Username dikosongkan = akses login pengurus dicabut.
  if ('username' in data && !data.username) data.password_hash = null;

  if (Object.keys(data).length) {
    await pool.query('UPDATE users SET ? WHERE id = ?', [data, target.id]);
  }
  res.json({ message: 'Data pengguna berhasil diperbarui', data: toPublicUser(await findUser(target.id)) });
}

export async function remove(req, res) {
  const target = await findUser(req.params.id);
  assertCanGrant(req.user, parsePermissions(target.role_permissions));
  if (target.id === req.user.sub) throw new HttpError(422, 'Anda tidak dapat menghapus akun sendiri');

  await pool.query('DELETE FROM users WHERE id = ?', [target.id]);
  res.json({ message: 'Data pengguna berhasil dihapus' });
}

export async function resetPin(req, res) {
  const target = await findUser(req.params.id);
  assertCanGrant(req.user, parsePermissions(target.role_permissions));

  const pin = defaultPinFromBirthdate(target.tanggal_lahir) || '123456';
  await pool.query('UPDATE users SET pin_hash = ? WHERE id = ?', [await bcrypt.hash(pin, 10), target.id]);
  res.json({
    message: target.tanggal_lahir
      ? 'PIN direset ke tanggal lahir (DDMMYY)'
      : 'PIN direset ke 123456 (tanggal lahir belum diisi)',
  });
}
