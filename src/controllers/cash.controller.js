import { pool } from '../config/db.js';
import { crudController } from '../utils/crud.js';

const base = crudController({
  table: 'cash_transactions',
  label: 'Transaksi kas',
  fields: ['tanggal', 'uraian', 'kategori', 'jenis', 'nominal'],
  beforeSave: (data, req, mode) => (mode === 'create' ? { ...data, created_by: req.user.sub } : data),
});

// Saldo berjalan dihitung dari seluruh transaksi berurutan tanggal, lalu baru difilter.
const WITH_SALDO = `
  SELECT t.*,
    SUM(CASE WHEN t.jenis = 'masuk' THEN t.nominal ELSE -t.nominal END)
      OVER (ORDER BY t.tanggal, t.id) AS saldo
  FROM cash_transactions t`;

const toNumbers = (row) => ({ ...row, nominal: Number(row.nominal), saldo: Number(row.saldo) });

export async function list(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const { search, jenis, bulan } = req.query;

  const where = [];
  const params = [];
  if (search) {
    where.push('(uraian LIKE ? OR kategori LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (jenis === 'masuk' || jenis === 'keluar') {
    where.push('jenis = ?');
    params.push(jenis);
  }
  if (/^\d{4}-\d{2}$/.test(bulan || '')) {
    where.push("DATE_FORMAT(tanggal, '%Y-%m') = ?");
    params.push(bulan);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM cash_transactions ${whereSql}`, params);
  const [rows] = await pool.query(
    `SELECT * FROM (${WITH_SALDO}) x ${whereSql} ORDER BY tanggal DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  res.json({
    data: rows.map(toNumbers),
    meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
  });
}

/** Ringkasan kas untuk satu bulan (YYYY-MM); default bulan transaksi terakhir. */
export async function getCashSummary(month) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) {
    const [[row]] = await pool.query("SELECT DATE_FORMAT(MAX(tanggal), '%Y-%m') AS bulan FROM cash_transactions");
    month = row.bulan || new Date().toISOString().slice(0, 7);
  }
  const [[sum]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN jenis = 'masuk' THEN nominal END), 0) AS pemasukan,
       COALESCE(SUM(CASE WHEN jenis = 'keluar' THEN nominal END), 0) AS pengeluaran
     FROM cash_transactions WHERE DATE_FORMAT(tanggal, '%Y-%m') = ?`,
    [month]
  );
  const [[all]] = await pool.query(
    "SELECT COALESCE(SUM(CASE WHEN jenis = 'masuk' THEN nominal ELSE -nominal END), 0) AS saldo FROM cash_transactions"
  );
  return {
    bulan: month,
    pemasukan: Number(sum.pemasukan),
    pengeluaran: Number(sum.pengeluaran),
    saldo: Number(all.saldo),
  };
}

export async function getRecentCash(limit = 5) {
  const [rows] = await pool.query(`SELECT * FROM (${WITH_SALDO}) x ORDER BY tanggal DESC, id DESC LIMIT ?`, [limit]);
  return rows.map(toNumbers);
}

export async function summary(req, res) {
  res.json({ data: await getCashSummary(req.query.bulan) });
}

export async function categories(_req, res) {
  const [rows] = await pool.query('SELECT DISTINCT kategori FROM cash_transactions ORDER BY kategori');
  res.json({ data: rows.map((r) => r.kategori) });
}

export const { create, update, remove } = base;

export async function detail(req, res) {
  const row = await base.find(req.params.id);
  res.json({ data: { ...row, nominal: Number(row.nominal) } });
}
