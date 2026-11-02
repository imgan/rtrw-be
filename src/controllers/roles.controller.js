import { pool } from '../config/db.js';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, canGrant, parsePermissions } from '../config/permissions.js';
import { HttpError } from '../utils/httpError.js';

const toRole = (row) => ({
  ...row,
  is_system: Boolean(row.is_system),
  permissions: parsePermissions(row.permissions),
  user_count: row.user_count === undefined ? undefined : Number(row.user_count),
});

const slugify = (text) =>
  String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

async function findRole(id) {
  const [rows] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
  if (!rows[0]) throw new HttpError(404, 'Role tidak ditemukan');
  return toRole(rows[0]);
}

function cleanPermissions(list) {
  return [...new Set((Array.isArray(list) ? list : []).filter((p) => ALL_PERMISSIONS.includes(p)))];
}

function assertCanGrant(actor, permissions) {
  if (!canGrant(actor.permissions, permissions)) {
    throw new HttpError(403, 'Anda tidak dapat memberikan hak akses yang tidak Anda miliki');
  }
}

export function permissionCatalog(_req, res) {
  res.json({ data: PERMISSION_GROUPS });
}

export async function list(_req, res) {
  const [rows] = await pool.query(
    `SELECT r.*, COUNT(u.id) AS user_count
     FROM roles r LEFT JOIN users u ON u.role_id = r.id
     GROUP BY r.id ORDER BY r.is_system DESC, r.nama ASC`
  );
  res.json({ data: rows.map(toRole) });
}

export async function detail(req, res) {
  res.json({ data: await findRole(req.params.id) });
}

export async function create(req, res) {
  const permissions = cleanPermissions(req.body.permissions);
  assertCanGrant(req.user, permissions);
  const slug = slugify(req.body.slug || req.body.nama);
  if (!slug) throw new HttpError(422, 'Slug tidak valid', { slug: 'Slug tidak valid' });

  const [result] = await pool.query(
    'INSERT INTO roles (nama, slug, deskripsi, permissions, is_system) VALUES (?, ?, ?, ?, 0)',
    [req.body.nama.trim(), slug, req.body.deskripsi || null, JSON.stringify(permissions)]
  );
  res.status(201).json({ message: 'Role berhasil ditambahkan', data: await findRole(result.insertId) });
}

export async function update(req, res) {
  const role = await findRole(req.params.id);
  assertCanGrant(req.user, role.permissions);

  const data = {};
  if (req.body.nama) data.nama = req.body.nama.trim();
  if (req.body.deskripsi !== undefined) data.deskripsi = req.body.deskripsi || null;
  // Slug role sistem dipakai kode (mis. role default "warga"), jadi tidak boleh diubah.
  if (req.body.slug && !role.is_system) data.slug = slugify(req.body.slug);
  // Administrator selalu memiliki akses penuh.
  if (req.body.permissions !== undefined && role.slug !== 'admin') {
    const permissions = cleanPermissions(req.body.permissions);
    assertCanGrant(req.user, permissions);
    if (role.id === (await currentRoleId(req.user.sub))) {
      throw new HttpError(422, 'Anda tidak dapat mengubah hak akses role yang sedang Anda pakai');
    }
    data.permissions = JSON.stringify(permissions);
  }

  if (Object.keys(data).length) await pool.query('UPDATE roles SET ? WHERE id = ?', [data, role.id]);
  res.json({ message: 'Role berhasil diperbarui', data: await findRole(role.id) });
}

export async function remove(req, res) {
  const role = await findRole(req.params.id);
  if (role.is_system) throw new HttpError(422, 'Role bawaan sistem tidak dapat dihapus');
  assertCanGrant(req.user, role.permissions);

  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM users WHERE role_id = ?', [role.id]);
  if (n > 0) throw new HttpError(422, `Role masih dipakai oleh ${n} pengguna. Pindahkan pengguna terlebih dahulu`);

  await pool.query('DELETE FROM roles WHERE id = ?', [role.id]);
  res.json({ message: 'Role berhasil dihapus' });
}

async function currentRoleId(userId) {
  const [[row]] = await pool.query('SELECT role_id FROM users WHERE id = ?', [userId]);
  return row?.role_id;
}
