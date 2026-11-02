import { pool } from '../config/db.js';
import { HOME_DEFAULTS } from '../config/homeDefaults.js';
import { STRUKTUR_DEFAULTS } from '../config/strukturDefaults.js';
import { HttpError } from '../utils/httpError.js';

// Setiap key settings punya nilai bawaan; nilai tersimpan digabung di atasnya per section.
const REGISTRY = {
  home: { defaults: HOME_DEFAULTS, message: 'Konten beranda berhasil disimpan' },
  struktur: { defaults: STRUKTUR_DEFAULTS, message: 'Pengaturan struktur berhasil disimpan' },
};

function entry(key) {
  const found = REGISTRY[key];
  if (!found) throw new HttpError(404, 'Pengaturan tidak ditemukan');
  return found;
}

export async function getSettings(key) {
  const { defaults } = entry(key);
  const [rows] = await pool.query('SELECT `value` FROM settings WHERE `key` = ?', [key]);
  let stored = {};
  try {
    stored = rows[0] ? JSON.parse(rows[0].value) : {};
  } catch {
    stored = {};
  }
  const result = {};
  for (const [section, values] of Object.entries(defaults)) {
    result[section] = { ...values, ...(stored[section] || {}) };
  }
  return result;
}

export const getHomeSettings = () => getSettings('home');

// Hanya menyimpan section & field yang dikenal; tipe angka mengikuti nilai bawaan.
function sanitize(defaults, body) {
  const clean = {};
  for (const [section, values] of Object.entries(defaults)) {
    clean[section] = {};
    for (const [key, def] of Object.entries(values)) {
      const value = body?.[section]?.[key];
      if (value === undefined || value === null) continue;
      clean[section][key] = typeof def === 'number' ? Number(value) || 0 : String(value).trim().slice(0, 2000);
    }
  }
  return clean;
}

export async function show(req, res) {
  res.json({ data: await getSettings(req.params.key) });
}

export async function update(req, res) {
  const { defaults, message } = entry(req.params.key);
  await pool.query(
    'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    [req.params.key, JSON.stringify(sanitize(defaults, req.body))]
  );
  res.json({ message, data: await getSettings(req.params.key) });
}
