import { pool } from '../config/db.js';
import { hasPermission } from '../config/permissions.js';
import { crudController } from '../utils/crud.js';
import { HttpError } from '../utils/httpError.js';

const pageParams = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  return { page, limit, offset: (page - 1) * limit };
};
const metaOf = ({ page, limit }, total) => ({ page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) });
const whereSql = (where) => (where.length ? `WHERE ${where.join(' AND ')}` : '');

/* ---------- Pembangunan lingkungan ---------- */
const projectBase = crudController({
  table: 'projects',
  label: 'Data pembangunan',
  fields: ['nama_kegiatan', 'no_sk', 'tgl_sk', 'tgl_mulai', 'tgl_selesai', 'nilai', 'asal_projek', 'volume'],
  searchable: ['nama_kegiatan', 'no_sk', 'asal_projek'],
  orderBy: 'tgl_mulai DESC, id DESC',
});
export const projects = projectBase;

/* ---------- Pilihan warga untuk form pembayaran & surat ---------- */
export async function wargaOptions(req, res) {
  const like = `%${req.query.search || ''}%`;
  const [rows] = await pool.query(
    `SELECT id, nama, nik, no_kk, blok, no_rumah FROM users
     WHERE keberadaan = 'netap' AND (nama LIKE ? OR nik LIKE ? OR no_kk LIKE ?)
     ORDER BY nama LIMIT 20`,
    [like, like, like]
  );
  res.json({ data: rows });
}

/* ---------- Pembayaran warga ---------- */
const PAYMENT_SELECT = `
  SELECT p.*, u.nama, u.nik, u.no_kk, u.blok, u.no_rumah
  FROM payments p JOIN users u ON u.id = p.user_id`;
const PAYMENT_FIELDS = ['user_id', 'tanggal', 'keterangan', 'nominal', 'bulan', 'tahun'];
const toPayment = (row) => ({ ...row, nominal: Number(row.nominal) });

function pickPayment(body) {
  const data = {};
  for (const key of PAYMENT_FIELDS) if (body[key] !== undefined) data[key] = body[key];
  return data;
}

async function findPayment(id) {
  const [rows] = await pool.query(`${PAYMENT_SELECT} WHERE p.id = ?`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Data pembayaran tidak ditemukan');
  return toPayment(rows[0]);
}

async function assertUserExists(id) {
  const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
  if (!rows[0]) throw new HttpError(422, 'Warga tidak ditemukan', { user_id: 'Warga tidak ditemukan' });
}

async function listPayments(query, forUserId) {
  const paging = pageParams(query);
  const where = [];
  const params = [];
  if (forUserId) {
    where.push('p.user_id = ?');
    params.push(forUserId);
  }
  if (query.search) {
    where.push('(u.nama LIKE ? OR u.nik LIKE ? OR u.no_kk LIKE ? OR p.keterangan LIKE ?)');
    params.push(...Array(4).fill(`%${query.search}%`));
  }
  if (query.bulan) {
    where.push('p.bulan = ?');
    params.push(query.bulan);
  }
  if (query.tahun) {
    where.push('p.tahun = ?');
    params.push(query.tahun);
  }
  const sql = whereSql(where);
  const from = 'FROM payments p JOIN users u ON u.id = p.user_id';
  const [[{ total, jumlah }]] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(p.nominal), 0) AS jumlah ${from} ${sql}`,
    params
  );
  const [rows] = await pool.query(`${PAYMENT_SELECT} ${sql} ORDER BY p.tanggal DESC, p.id DESC LIMIT ? OFFSET ?`, [
    ...params, paging.limit, paging.offset,
  ]);
  return { data: rows.map(toPayment), meta: { ...metaOf(paging, total), jumlah: Number(jumlah) } };
}

export const payments = {
  list: async (req, res) => res.json(await listPayments(req.query)),
  mine: async (req, res) => res.json(await listPayments(req.query, req.user.sub)),
  detail: async (req, res) => res.json({ data: await findPayment(req.params.id) }),
  async create(req, res) {
    const data = pickPayment(req.body);
    await assertUserExists(data.user_id);
    const [result] = await pool.query('INSERT INTO payments SET ?', [data]);
    res.status(201).json({ message: 'Pembayaran berhasil dicatat', data: await findPayment(result.insertId) });
  },
  async update(req, res) {
    await findPayment(req.params.id);
    const data = pickPayment(req.body);
    if (data.user_id) await assertUserExists(data.user_id);
    if (Object.keys(data).length) await pool.query('UPDATE payments SET ? WHERE id = ?', [data, req.params.id]);
    res.json({ message: 'Pembayaran berhasil diperbarui', data: await findPayment(req.params.id) });
  },
  async remove(req, res) {
    await findPayment(req.params.id);
    await pool.query('DELETE FROM payments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Pembayaran berhasil dihapus' });
  },
};

/* ---------- Surat keterangan ---------- */
const LETTER_SELECT = `
  SELECT l.*, u.nama, u.nik, u.no_kk, u.alamat, u.blok, u.no_rumah, u.tanggal_lahir, u.jenis_kelamin,
    s.nama AS acc_sekretaris_nama, b.nama AS acc_bendahara_nama, k.nama AS acc_ketua_nama
  FROM letters l
  JOIN users u ON u.id = l.user_id
  LEFT JOIN users s ON s.id = l.acc_sekretaris_by
  LEFT JOIN users b ON b.id = l.acc_bendahara_by
  LEFT JOIN users k ON k.id = l.acc_ketua_by`;

// Urutan ACC; tahap berikutnya hanya bisa dilakukan setelah tahap sebelumnya.
const ACC_STEPS = ['sekretaris', 'bendahara', 'ketua'];
const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const LETTER_STAFF = ['letters.manage', ...ACC_STEPS.map((s) => `letters.acc_${s}`)];

const isLetterStaff = (user) => LETTER_STAFF.some((k) => hasPermission(user.permissions, k));

async function findLetter(id) {
  const [rows] = await pool.query(`${LETTER_SELECT} WHERE l.id = ?`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Surat tidak ditemukan');
  return rows[0];
}

async function listLetters(query, forUserId) {
  const paging = pageParams(query);
  const where = [];
  const params = [];
  if (forUserId) {
    where.push('l.user_id = ?');
    params.push(forUserId);
  }
  if (query.search) {
    where.push('(u.nama LIKE ? OR u.nik LIKE ? OR l.nomor_surat LIKE ? OR l.jenis_surat LIKE ? OR l.keperluan LIKE ?)');
    params.push(...Array(5).fill(`%${query.search}%`));
  }
  if (query.status) {
    where.push('l.status = ?');
    params.push(query.status);
  }
  const sql = whereSql(where);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM letters l JOIN users u ON u.id = l.user_id ${sql}`,
    params
  );
  const [rows] = await pool.query(`${LETTER_SELECT} ${sql} ORDER BY l.tanggal_pengajuan DESC, l.id DESC LIMIT ? OFFSET ?`, [
    ...params, paging.limit, paging.offset,
  ]);
  return { data: rows, meta: metaOf(paging, total) };
}

// Nomor diberikan saat ACC sekretaris; unique key mencegah nomor ganda, jadi cukup coba ulang bila bentrok.
async function acceptSekretaris(letterId, userId) {
  const now = new Date();
  const tahun = now.getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const [[{ urut }]] = await pool.query(
      'SELECT COALESCE(MAX(nomor_urut), 0) + 1 AS urut FROM letters WHERE nomor_tahun = ?',
      [tahun]
    );
    const nomor = `${String(urut).padStart(3, '0')}/SK/RT04-RW08/${ROMAN_MONTHS[now.getMonth()]}/${tahun}`;
    try {
      const [result] = await pool.query(
        `UPDATE letters SET nomor_surat = ?, nomor_tahun = ?, nomor_urut = ?, status = 'diproses',
           acc_sekretaris_by = ?, acc_sekretaris_at = NOW()
         WHERE id = ? AND status = 'diajukan' AND acc_sekretaris_at IS NULL`,
        [nomor, tahun, urut, userId, letterId]
      );
      return result.affectedRows === 1;
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY' || attempt === 4) throw err;
    }
  }
  return false;
}

export const letters = {
  list: async (req, res) => res.json(await listLetters(req.query)),
  mine: async (req, res) => res.json(await listLetters(req.query, req.user.sub)),

  async detail(req, res) {
    const letter = await findLetter(req.params.id);
    if (letter.user_id !== req.user.sub && !isLetterStaff(req.user)) {
      throw new HttpError(403, 'Anda tidak memiliki akses ke surat ini');
    }
    res.json({ data: letter });
  },

  // Warga mengajukan untuk diri sendiri; pengelola surat boleh mengajukan atas nama warga lain.
  async create(req, res) {
    const manage = hasPermission(req.user.permissions, 'letters.manage');
    const userId = manage && req.body.user_id ? req.body.user_id : req.user.sub;
    await assertUserExists(userId);
    const [result] = await pool.query('INSERT INTO letters SET ?', [{
      user_id: userId,
      tanggal_pengajuan: req.body.tanggal_pengajuan || new Date().toISOString().slice(0, 10),
      jenis_surat: req.body.jenis_surat,
      keperluan: req.body.keperluan,
      tanggal_pelaksanaan: req.body.tanggal_pelaksanaan || null,
    }]);
    res.status(201).json({ message: 'Permohonan surat berhasil diajukan', data: await findLetter(result.insertId) });
  },

  // Hanya bisa diubah sebelum ada ACC, agar isi surat yang sudah diperiksa tidak berubah.
  async update(req, res) {
    const letter = await findLetter(req.params.id);
    const own = letter.user_id === req.user.sub;
    if (!own && !hasPermission(req.user.permissions, 'letters.manage')) {
      throw new HttpError(403, 'Anda tidak memiliki akses ke surat ini');
    }
    if (letter.status !== 'diajukan') throw new HttpError(422, 'Surat yang sudah diproses tidak dapat diubah');
    const data = {};
    for (const key of ['jenis_surat', 'keperluan']) if (req.body[key]) data[key] = req.body[key];
    if (req.body.tanggal_pelaksanaan !== undefined) data.tanggal_pelaksanaan = req.body.tanggal_pelaksanaan || null;
    if (Object.keys(data).length) await pool.query('UPDATE letters SET ? WHERE id = ?', [data, letter.id]);
    res.json({ message: 'Permohonan surat berhasil diperbarui', data: await findLetter(letter.id) });
  },

  async remove(req, res) {
    const letter = await findLetter(req.params.id);
    const own = letter.user_id === req.user.sub;
    if (!own && !hasPermission(req.user.permissions, 'letters.manage')) {
      throw new HttpError(403, 'Anda tidak memiliki akses ke surat ini');
    }
    if (!['diajukan', 'ditolak'].includes(letter.status)) {
      throw new HttpError(422, 'Surat yang sudah mendapat ACC tidak dapat dihapus');
    }
    await pool.query('DELETE FROM letters WHERE id = ?', [letter.id]);
    res.json({ message: 'Permohonan surat berhasil dihapus' });
  },

  async acc(req, res) {
    const { tahap } = req.body;
    if (!hasPermission(req.user.permissions, `letters.acc_${tahap}`)) {
      throw new HttpError(403, `Anda tidak memiliki hak ACC ${tahap}`);
    }
    const letter = await findLetter(req.params.id);
    const index = ACC_STEPS.indexOf(tahap);
    if (index > 0 && !letter[`acc_${ACC_STEPS[index - 1]}_at`]) {
      throw new HttpError(422, `Surat harus mendapat ACC ${ACC_STEPS[index - 1]} terlebih dahulu`);
    }

    let done;
    if (tahap === 'sekretaris') {
      done = await acceptSekretaris(letter.id, req.user.sub);
    } else {
      const finalStatus = tahap === 'ketua' ? 'disetujui' : 'diproses';
      const [result] = await pool.query(
        `UPDATE letters SET status = ?, acc_${tahap}_by = ?, acc_${tahap}_at = NOW()
         WHERE id = ? AND status = 'diproses' AND acc_${tahap}_at IS NULL`,
        [finalStatus, req.user.sub, letter.id]
      );
      done = result.affectedRows === 1;
    }
    if (!done) throw new HttpError(422, 'Surat sudah di-ACC atau sudah tidak dapat diproses');
    res.json({ message: `ACC ${tahap} berhasil`, data: await findLetter(letter.id) });
  },

  async reject(req, res) {
    const [result] = await pool.query(
      `UPDATE letters SET status = 'ditolak', alasan_tolak = ? WHERE id = ? AND status IN ('diajukan', 'diproses')`,
      [req.body.alasan, req.params.id]
    );
    if (result.affectedRows !== 1) throw new HttpError(422, 'Surat ini sudah tidak dapat ditolak');
    res.json({ message: 'Permohonan surat ditolak', data: await findLetter(req.params.id) });
  },
};

export { LETTER_STAFF };
