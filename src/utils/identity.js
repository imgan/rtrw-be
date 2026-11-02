// Normalisasi nomor WhatsApp ke format 08xxxxxxxxxx.
export function normalizePhone(value) {
  if (!value) return null;
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('62')) digits = '0' + digits.slice(2);
  else if (digits.startsWith('8')) digits = '0' + digits;
  return digits || null;
}

export const isNik = (value) => /^\d{16}$/.test(String(value || '').trim());

// PIN bawaan = DDMMYY dari tanggal lahir (format YYYY-MM-DD).
export function defaultPinFromBirthdate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
  if (!m) return null;
  return `${m[3]}${m[2]}${m[1].slice(2)}`;
}
