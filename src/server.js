import 'dotenv/config';
import app from './app.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET belum diatur. Salin .env.example menjadi .env lalu isi nilainya.');
  process.exit(1);
}

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`API Warga Harmoni berjalan di http://localhost:${port}`);
});
