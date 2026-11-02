import { pool } from '../config/db.js';
import { HttpError } from './httpError.js';

export function parseArray(value) {
  try {
    const list = JSON.parse(value);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Controller CRUD sederhana untuk tabel konten CMS.
 * - fields:     kolom yang boleh diisi dari body
 * - booleans:   kolom TINYINT(1) yang dikirim sebagai boolean
 * - arrays:     kolom teks yang menyimpan array sebagai JSON
 * - searchable: kolom yang dicari dengan ?search=
 * - filters:    { queryParam: kolom } untuk filter persis
 * - orderBy:    klausa ORDER BY bawaan
 * - beforeSave: (data, req) => data, untuk melengkapi data sebelum disimpan
 */
export function crudController({
  table, label, fields, booleans = [], arrays = [], searchable = [], filters = {}, orderBy = 'id DESC', beforeSave,
}) {
  const normalize = (row) => {
    for (const key of booleans) if (key in row) row[key] = Boolean(row[key]);
    for (const key of arrays) if (key in row) row[key] = parseArray(row[key]);
    return row;
  };

  function pick(body) {
    const data = {};
    for (const key of fields) {
      if (body[key] === undefined) continue;
      data[key] = body[key] === '' ? null : body[key];
    }
    for (const key of booleans) if (key in data) data[key] = data[key] ? 1 : 0;
    for (const key of arrays) if (key in data) data[key] = JSON.stringify(data[key] || []);
    return data;
  }

  async function find(id) {
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!rows[0]) throw new HttpError(404, `${label} tidak ditemukan`);
    return normalize(rows[0]);
  }

  function buildWhere(query) {
    const where = [];
    const params = [];
    if (query.search && searchable.length) {
      where.push(`(${searchable.map((c) => `${c} LIKE ?`).join(' OR ')})`);
      params.push(...searchable.map(() => `%${query.search}%`));
    }
    for (const [param, column] of Object.entries(filters)) {
      if (query[param] === undefined || query[param] === '') continue;
      where.push(`${column} = ?`);
      params.push(query[param]);
    }
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
  }

  return {
    find,
    pick,
    buildWhere,

    async list(req, res) {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
      const where = buildWhere(req.query);

      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${table} ${where.sql}`, where.params);
      const [rows] = await pool.query(
        `SELECT * FROM ${table} ${where.sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
        [...where.params, limit, (page - 1) * limit]
      );
      res.json({
        data: rows.map(normalize),
        meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
      });
    },

    async detail(req, res) {
      res.json({ data: await find(req.params.id) });
    },

    async create(req, res) {
      let data = pick(req.body);
      if (beforeSave) data = await beforeSave(data, req, 'create');
      const [result] = await pool.query(`INSERT INTO ${table} SET ?`, [data]);
      res.status(201).json({ message: `${label} berhasil ditambahkan`, data: await find(result.insertId) });
    },

    async update(req, res) {
      await find(req.params.id);
      let data = pick(req.body);
      if (beforeSave) data = await beforeSave(data, req, 'update');
      if (Object.keys(data).length) {
        await pool.query(`UPDATE ${table} SET ? WHERE id = ?`, [data, req.params.id]);
      }
      res.json({ message: `${label} berhasil diperbarui`, data: await find(req.params.id) });
    },

    async remove(req, res) {
      await find(req.params.id);
      await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      res.json({ message: `${label} berhasil dihapus` });
    },
  };
}
