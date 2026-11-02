export function notFound(req, res) {
  res.status(404).json({ message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err.code === 'ER_DUP_ENTRY') {
    const field = /uq_[a-z]+?_(\w+)'/.exec(err.sqlMessage)?.[1];
    return res.status(409).json({
      message: 'Data sudah terdaftar',
      errors: field ? { [field]: 'Sudah digunakan oleh data lain' } : undefined,
    });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ message: 'Data masih dipakai oleh data lain (surat atau pembayaran), sehingga tidak dapat dihapus' });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? 'Terjadi kesalahan pada server' : err.message,
    errors: err.details,
  });
}
