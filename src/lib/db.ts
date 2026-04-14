import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined in the environment variables.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ DATABASE CONNECTION FAILED:', err.message);
    console.error('Check if your PostgreSQL server is running and the credentials in .env are correct.');
  } else {
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY at:', res.rows[0].now);
  }
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
