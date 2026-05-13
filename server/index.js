import express from 'express';
import path from 'path';
import cors from 'cors';
import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

import bookRoutes from './routes/bookRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '../.env') });

export const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql'
});

sequelize.authenticate()
  .then(() => console.log('DB connected'))
  .catch(err => console.error('DB error', err));

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/books', bookRoutes);

// Serve React static files
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));