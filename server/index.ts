import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './utils/database.js';
import { startScheduledReleaseWorker } from './services/releaseScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

const clientDistPath = isProd
  ? path.join(__dirname, '../../client/dist')
  : path.join(__dirname, '../client/dist');

// Import routes after sequelize is exported
import userRoutes from './routes/userRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import releasesRoutes from './routes/releasesRoutes.js';
import revisionRoutes from './routes/revisionRoutes.js';

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({
  limit: '10mb',
}));
app.use(cookieParser());

app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/releases', releasesRoutes);
app.use('/api/revisions', revisionRoutes);

// Serve React static files
app.use(
  '/assets',
  express.static(path.join(clientDistPath, 'assets'), {
    immutable: true,
    maxAge: '1y',
  })
);
app.use(express.static(clientDistPath));
app.get('/{*splat}', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

async function start() {
  try {
    await initializeDatabase();
    startScheduledReleaseWorker();
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();