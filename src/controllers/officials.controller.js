import { pool } from '../config/db.js';
import { crudController } from '../utils/crud.js';
import { getSettings } from './settings.controller.js';

const FIELDS = [
  'nama', 'jabatan', 'satuan', 'label', 'warna', 'nik', 'no_wa', 'domisili', 'foto', 'no_sk',
  'status_label', 'is_utama', 'urutan', 'is_active',
];
// Field identitas orang yang berganti saat mutasi pejabat.
const PERSON_FIELDS = ['nama', 'nik', 'no_wa', 'domisili', 'foto', 'no_sk', 'status_label'];

const base = crudController({
  table: 'officials',
  label: 'Data pengurus',
  fields: FIELDS,
  booleans: ['is_utama', 'is_active'],
});

export const mutations = crudController({
  table: 'official_mutations',
  label: 'Riwayat mutasi',
  fields: ['official_id', 'tanggal_efektif', 'jabatan', 'pejabat_lama', 'keterangan_lama', 'pejabat_baru', 'keterangan_baru', 'no_sk', 'status'],
  searchable: ['jabatan', 'pejabat_lama', 'pejabat_baru', 'no_sk'],
  filters: { status: 'status', official_id: 'official_id' },
  orderBy: 'tanggal_efektif DESC, id DESC',
});

export const { detail, update, remove } = base;

// Filter satuan RT juga menampilkan pengurus inti RW, sesuai tampilan struktur.
export async function list(req, res) {
  const { satuan, search } = req.query;
  const where = [];
  const params = [];
  if (satuan === 'RW') {
    where.push("satuan = 'RW'");
  } else if (satuan) {
    where.push("(satuan = ? OR satuan = 'RW')");
    params.push(satuan);
  }
  if (search) {
    where.push('(nama LIKE ? OR nik LIKE ? OR jabatan LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM officials ${whereSql} ORDER BY urutan ASC, id ASC`, params);
  res.json({ data: rows.map((r) => ({ ...r, is_utama: Boolean(r.is_utama), is_active: Boolean(r.is_active) })) });
}

export async function overview(_req, res) {
  const settings = await getSettings('struktur');
  const [[counts]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM officials WHERE is_active = 1) AS total_aktif,
       (SELECT COUNT(*) FROM officials WHERE is_active = 1 AND is_utama = 1) AS total_utama,
       (SELECT COUNT(*) FROM official_mutations WHERE status = 'diproses') AS mutasi_diproses`
  );
  const [[latest]] = await pool.query(
    "SELECT jabatan FROM official_mutations WHERE status = 'diproses' ORDER BY tanggal_efektif DESC, id DESC LIMIT 1"
  );
  const rtList = settings.wilayah.daftar_rt.split(',').map((s) => s.trim()).filter(Boolean);

  res.json({
    data: {
      settings,
      rt_list: rtList,
      stats: { ...counts, mutasi_terbaru: latest?.jabatan || null },
    },
  });
}

/** Tambah pengurus; opsional langsung dicatat sebagai pengangkatan di riwayat mutasi. */
export async function create(req, res) {
  const data = base.pick(req.body);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query('INSERT INTO officials SET ?', [data]);
    if (req.body.catat_mutasi) {
      await conn.query('INSERT INTO official_mutations SET ?', [{
        official_id: result.insertId,
        tanggal_efektif: req.body.tanggal_efektif || new Date().toISOString().slice(0, 10),
        jabatan: data.jabatan,
        keterangan_lama: 'Posisi Baru',
        pejabat_baru: data.nama,
        keterangan_baru: 'Pengangkatan',
        no_sk: data.no_sk,
        status: 'disahkan',
      }]);
    }
    await conn.commit();
    res.status(201).json({ message: 'Data pengurus berhasil ditambahkan', data: await base.find(result.insertId) });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Ganti pejabat pada satu posisi. Status "disahkan" langsung mengganti data pejabat;
 * status "diproses" hanya mencatat usulan mutasi tanpa mengubah pejabat aktif.
 */
export async function replace(req, res) {
  const current = await base.find(req.params.id);
  const status = req.body.status === 'diproses' ? 'diproses' : 'disahkan';

  const person = {};
  for (const key of PERSON_FIELDS) person[key] = req.body[key] === '' ? null : req.body[key] ?? null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('INSERT INTO official_mutations SET ?', [{
      official_id: current.id,
      tanggal_efektif: req.body.tanggal_efektif,
      jabatan: current.jabatan,
      pejabat_lama: current.nama,
      keterangan_lama: req.body.keterangan_lama || null,
      pejabat_baru: person.nama,
      keterangan_baru: req.body.keterangan_baru || null,
      no_sk: person.no_sk,
      status,
    }]);
    if (status === 'disahkan') {
      await conn.query('UPDATE officials SET ? WHERE id = ?', [person, current.id]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  res.json({
    message: status === 'disahkan'
      ? `${current.jabatan} kini dijabat ${person.nama}`
      : 'Usulan mutasi dicatat dan menunggu pengesahan',
    data: await base.find(current.id),
  });
}
