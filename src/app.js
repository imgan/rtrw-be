import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import roleRoutes from './routes/roles.routes.js';
import contentRoutes from './routes/content.routes.js';
import publicRoutes from './routes/public.routes.js';
import serviceRoutes from './routes/services.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { UPLOAD_DIR } from './middleware/upload.js';
import { pool } from './config/db.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// CORS_ORIGIN: daftar domain dipisah koma, atau * untuk semua domain.
const corsOrigin = process.env.CORS_ORIGIN?.trim();
app.use(cors({ origin: !corsOrigin || corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', version: '2.4.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/cms', contentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.use(notFound);
app.use(errorHandler);

export default app;
