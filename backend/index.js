require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// uploads folder (local) — for production prefer S3/Spaces
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,9)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // limit 10MB

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'secretkeychange';

// Register endpoint
app.post('/api/register', upload.single('berkas'), async (req, res) => {
  try {
    const { nama, nim, prodi, dosen, judul, tanggal } = req.body;
    if (!nama || !nim || !judul) return res.status(400).json({ error: 'Field wajib: nama, nim, judul' });
    if (!/^\d{8,12}$/.test(nim)) return res.status(400).json({ error: 'Format NIM tidak valid (8-12 digit).' });

    const client = await pool.connect();
    try {
      // cek duplikat nim
      const exists = await client.query('SELECT 1 FROM participants WHERE nim = $1', [nim]);
      if (exists.rowCount > 0) {
        return res.status(409).json({ error: 'NIM sudah terdaftar.' });
      }

      const id = uuidv4();
      const berkas = req.file ? req.file.filename : null;
      const waktuDaftar = new Date().toISOString();

      await client.query(
        `INSERT INTO participants (id,nama,nim,prodi,dosen,judul,tanggal,berkas,waktuDaftar)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, nama, nim, prodi || null, dosen || null, judul, tanggal || null, berkas, waktuDaftar]
      );

      return res.json({ ok: true, id });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin login => returns JWT
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Password salah' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid auth' });
  try {
    const payload = jwt.verify(parts[1], JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch (err) { return res.status(401).json({ error: 'Invalid token' }); }
}

// List participants
app.get('/api/participants', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const rows = (await client.query('SELECT * FROM participants ORDER BY waktuDaftar DESC')).rows;
    res.json(rows);
  } finally {
    client.release();
  }
});

// Delete participant
app.delete('/api/participants/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const client = await pool.connect();
  try {
    const row = (await client.query('SELECT berkas FROM participants WHERE id = $1', [id])).rows[0];
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.berkas) {
      const fp = path.join(UPLOAD_DIR, row.berkas);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await client.query('DELETE FROM participants WHERE id = $1', [id]);
    res.json({ ok: true });
  } finally {
    client.release();
  }
});

// serve uploads
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
