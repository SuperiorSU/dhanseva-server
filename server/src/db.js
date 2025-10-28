import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

// Prefer DATABASE_URL, otherwise build from components
const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  NODE_ENV
} = process.env;

let sequelize;

if (DATABASE_URL) {
  sequelize = new Sequelize(DATABASE_URL, {
    logging: NODE_ENV === 'development' ? console.log : false,
  });
} else {
  sequelize = new Sequelize(DB_NAME || 'dhanseva', DB_USER || 'postgres', DB_PASSWORD || '', {
    host: DB_HOST || 'localhost',
    port: DB_PORT ? Number(DB_PORT) : 5432,
    dialect: 'postgres',
    logging: NODE_ENV === 'development' ? console.log : false,
  });
}

export default sequelize;
