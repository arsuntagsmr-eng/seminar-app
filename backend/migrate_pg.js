require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate(){
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS participants (
        id UUID PRIMARY KEY,
        nama TEXT NOT NULL,
        nim TEXT NOT NULL UNIQUE,
        prodi TEXT,
        dosen TEXT,
        judul TEXT NOT NULL,
        tanggal DATE,
        berkas TEXT,
        waktuDaftar TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('Migration to Postgres complete.');
  } catch (err) {
    console.error('Migration error', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
