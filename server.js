require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const multer     = require('multer');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const { v4: uuidv4 } = require('uuid');
const Wallpaper  = require('./model');

const app  = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('public'));           // serves index.html
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // serves images

// ─── MULTER (file upload storage) ────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, WEBP, GIF allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max
});

// ─── MONGODB CONNECTION ───────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('✗ MongoDB error:', err.message));

// ─── API ROUTES ───────────────────────────────────────────

// GET /api/wallpapers — list with search + category filter + pagination
app.get('/api/wallpapers', async (req, res) => {
  try {
    const { q, category, page = 1, limit = 24, sort = 'new' } = req.query;
    const filter = {};

    if (category && category !== 'all') filter.category = category.toLowerCase();

    if (q && q.trim()) {
      filter.$text = { $search: q.trim() };
    }

    const sortMap = {
      new:       { uploadedAt: -1 },
      popular:   { downloads: -1 },
      views:     { views: -1 },
    };
    const sortObj = sortMap[sort] || sortMap.new;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Wallpaper.countDocuments(filter);
    const walls = await Wallpaper.find(filter).sort(sortObj).skip(skip).limit(parseInt(limit));

    res.json({ wallpapers: walls, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories — distinct category list with counts
app.get('/api/categories', async (req, res) => {
  try {
    const cats = await Wallpaper.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort:  { count: -1 } }
    ]);
    res.json(cats.map(c => ({ name: c._id, count: c.count })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallpapers/:id — single wallpaper (also increments view count)
app.get('/api/wallpapers/:id', async (req, res) => {
  try {
    const w = await Wallpaper.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!w) return res.status(404).json({ error: 'Not found' });
    res.json(w);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload — upload a new wallpaper
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { title, category, tags, isPaid, price } = req.body;
    if (!title || !category) return res.status(400).json({ error: 'title and category are required' });

    const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const directLink = `${BASE_URL}/uploads/${req.file.filename}`;
    const pageUrl    = `${BASE_URL}/w/${req.file.filename.replace(/\.[^.]+$/, '')}`;

    const wall = await Wallpaper.create({
      title:        title.trim(),
      filename:     req.file.filename,
      originalName: req.file.originalname,
      url:          pageUrl,
      directLink:   directLink,
      category:     category.toLowerCase().trim(),
      tags:         tagList,
      size:         req.file.size,
      mimeType:     req.file.mimetype,
      isPaid:       isPaid === 'true',
      price:        isPaid === 'true' ? parseFloat(price) || 0 : 0,
    });

    res.status(201).json(wall);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/wallpapers/:id — update title, category, tags, price
app.patch('/api/wallpapers/:id', async (req, res) => {
  try {
    const allowed = ['title', 'category', 'tags', 'isPaid', 'price'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const w = await Wallpaper.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!w) return res.status(404).json({ error: 'Not found' });
    res.json(w);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/wallpapers/:id — delete wallpaper + file
app.delete('/api/wallpapers/:id', async (req, res) => {
  try {
    const w = await Wallpaper.findByIdAndDelete(req.params.id);
    if (!w) return res.status(404).json({ error: 'Not found' });

    // Remove file from disk
    const filePath = path.join(__dirname, 'uploads', w.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallpapers/:id/download — increment download counter
app.post('/api/wallpapers/:id/download', async (req, res) => {
  try {
    await Wallpaper.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats — overall stats for admin
app.get('/api/stats', async (req, res) => {
  try {
    const [total, totalDownloads, totalViews] = await Promise.all([
      Wallpaper.countDocuments(),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$downloads' } } }]),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$views' } } }]),
    ]);
    res.json({
      total,
      downloads: totalDownloads[0]?.sum || 0,
      views:     totalViews[0]?.sum || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── HEALTH CHECK (keeps free tier alive via UptimeRobot) ─
app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

// ─── CATCH-ALL → serve frontend ──────────────────────────
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⚔  Knight Vault running at ${BASE_URL}\n`);
});
