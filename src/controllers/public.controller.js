import { pool } from '../config/db.js';
import { parseArray } from '../utils/crud.js';
import { getHomeSettings } from './settings.controller.js';
import { getCashSummary, getRecentCash } from './cash.controller.js';

const withPhotos = (rows) => rows.map((row) => ({ ...row, fotos: parseArray(row.fotos) }));

export async function home(_req, res) {
  const [settings, kas, mutasi, [announcements], [contacts], [activities], [facilities]] = await Promise.all([
    getHomeSettings(),
    getCashSummary(),
    getRecentCash(5),
    pool.query(
      'SELECT id, kategori, warna, judul, isi, tanggal, penanggung_jawab FROM announcements WHERE is_published = 1 ORDER BY tanggal DESC, id DESC LIMIT 3'
    ),
    pool.query(
      'SELECT id, nama, keterangan, telepon, aksi, tone FROM contacts WHERE is_active = 1 ORDER BY urutan ASC, id ASC'
    ),
    pool.query(
      'SELECT id, judul, kategori, deskripsi, tanggal, waktu, lokasi, penanggung_jawab, fotos FROM activities WHERE is_published = 1 ORDER BY tanggal DESC, id DESC LIMIT 6'
    ),
    pool.query(
      'SELECT id, nama, kategori, deskripsi, lokasi, kondisi, jam_operasional, penanggung_jawab, fotos FROM facilities WHERE is_active = 1 ORDER BY urutan ASC, id ASC'
    ),
  ]);

  res.json({
    data: {
      settings,
      kas: { ...kas, mutasi },
      announcements,
      contacts,
      activities: withPhotos(activities),
      facilities: withPhotos(facilities),
    },
  });
}
