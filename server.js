require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const multer     = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const cors       = require('cors');
const path       = require('path');
const Wallpaper  = require('./model');

const app      = express();
const PORT     = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── CLOUDINARY CONFIG ────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── MULTER → CLOUDINARY STORAGE ─────────────────────────
// Files go directly to Cloudinary — never stored on Render disk
// This means images survive redeploys and links NEVER break
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'knight-vault',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation:  [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── ADMIN AUTH MIDDLEWARE ────────────────────────────────
function adminOnly(req, res, next) {
  const pw = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD) return next(); // no password set = dev mode
  if (pw && pw === process.env.ADMIN_PASSWORD) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// ─── MONGODB ──────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('✗ MongoDB:', err.message));

// ═══════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════

app.get('/api/wallpapers', async (req, res) => {
  try {
    const { q, category, page = 1, limit = 24, sort = 'new' } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category.toLowerCase();
    if (q && q.trim()) filter.$text = { $search: q.trim() };
    const sortMap = { new: { uploadedAt: -1 }, popular: { downloads: -1 }, views: { views: -1 } };
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Wallpaper.countDocuments(filter);
    const walls = await Wallpaper.find(filter).sort(sortMap[sort] || sortMap.new).skip(skip).limit(parseInt(limit));
    res.json({ wallpapers: walls, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/categories', async (req, res) => {
  try {
    const cats = await Wallpaper.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json(cats.map(c => ({ name: c._id, count: c.count })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/wallpapers/:id', async (req, res) => {
  try {
    const w = await Wallpaper.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    if (!w) return res.status(404).json({ error: 'Not found' });
    res.json(w);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/wallpapers/:id/download', async (req, res) => {
  try {
    await Wallpaper.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats', async (req, res) => {
  try {
    const [total, dl, vw] = await Promise.all([
      Wallpaper.countDocuments(),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$downloads' } } }]),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$views'     } } }]),
    ]);
    res.json({ total, downloads: dl[0]?.sum || 0, views: vw[0]?.sum || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Frontend checks this to know if it should show admin login
app.get('/api/check-admin', (req, res) => {
  res.json({ passwordRequired: !!process.env.ADMIN_PASSWORD });
});

// Verify admin password — frontend sends password, gets ok:true back
app.post('/api/verify-admin', (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD || password === process.env.ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: 'Wrong password' });
});

// ═══════════════════════════════════════
// ADMIN-ONLY ROUTES
// ═══════════════════════════════════════

app.post('/api/upload', adminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { title, category, tags } = req.body;
    if (!title || !category) return res.status(400).json({ error: 'title and category required' });

    // req.file.path = permanent Cloudinary URL (https://res.cloudinary.com/...)
    // req.file.filename = cloudinary public_id
    const directLink = req.file.path;
    const publicId   = req.file.filename;
    const pageUrl    = `${BASE_URL}/w/${encodeURIComponent(publicId.replace('knight-vault/', ''))}`;

    const wall = await Wallpaper.create({
      title:        title.trim(),
      filename:     publicId,
      originalName: req.file.originalname,
      url:          pageUrl,
      directLink:   directLink,
      category:     category.toLowerCase().trim(),
      tags:         tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      size:         req.file.size || 0,
      mimeType:     req.file.mimetype,
    });
    res.status(201).json(wall);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/wallpapers/:id', adminOnly, async (req, res) => {
  try {
    const w = await Wallpaper.findByIdAndDelete(req.params.id);
    if (!w) return res.status(404).json({ error: 'Not found' });
    try { await cloudinary.uploader.destroy(w.filename); } catch(e) {}
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/wallpapers/:id', adminOnly, async (req, res) => {
  try {
    const allowed = ['title', 'category', 'tags'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const w = await Wallpaper.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!w) return res.status(404).json({ error: 'Not found' });
    res.json(w);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── KEEP-ALIVE ───────────────────────────────────────────
app.get('/healthz', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ─── CATCH-ALL → frontend ────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`⚔  Knight Vault → ${BASE_URL}`));
