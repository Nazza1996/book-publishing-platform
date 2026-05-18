import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '../../.env'), quiet: true });

export const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
  }
);

export async function initializeDatabase() {
  try {
    // Load models and their associations
    await import('../models/index');
    
    await sequelize.authenticate();
    console.log('DB connected');
  } catch (err) {
    console.error('DB error', err);
    throw err;
  }
}
