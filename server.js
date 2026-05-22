require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const multer     = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const cors       = require('cors');
const path       = require('path');
const Wallpaper  = require('./model');
const Settings   = require('./settingsModel');

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
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $match: { category: { $ne: null, $ne: '' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const s = await Settings.findOne();
    const result = cats.map(c => ({ name: c._id, count: c.count }));
    if (s && s.predefinedCategories) {
      s.predefinedCategories.forEach(pc => {
        if (!result.find(r => r.name === pc)) {
          result.push({ name: pc, count: 0 });
        }
      });
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tags', async (req, res) => {
  try {
    const tags = await Wallpaper.distinct('tags');
    const s = await Settings.findOne();
    let allTags = tags.filter(Boolean);
    if (s && s.predefinedTags) {
      allTags = allTags.concat(s.predefinedTags);
    }
    res.json([...new Set(allTags)].sort());
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

app.get('/api/check-admin', (req, res) => {
  res.json({ passwordRequired: !!process.env.ADMIN_PASSWORD });
});

app.post('/api/verify-admin', (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD || password === process.env.ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: 'Wrong password' });
});

// ─── SETTINGS API ─────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  try {
    let s = await Settings.findOne();
    if (!s) s = await Settings.create({ adsensePublisherId: '', googleAnalyticsId: '', predefinedTags: [], predefinedCategories: [] });
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/settings', adminOnly, async (req, res) => {
  try {
    let s = await Settings.findOne();
    if (!s) s = new Settings();
    if (req.body.adsensePublisherId !== undefined) s.adsensePublisherId = req.body.adsensePublisherId;
    if (req.body.googleAnalyticsId !== undefined) s.googleAnalyticsId = req.body.googleAnalyticsId;
    if (req.body.predefinedTags !== undefined) s.predefinedTags = req.body.predefinedTags;
    if (req.body.predefinedCategories !== undefined) s.predefinedCategories = req.body.predefinedCategories;
    await s.save();
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── BINARY DOWNLOAD PROXY ────────────────────────────────
// This bypasses browser cross-origin limits and forces files to download directly 
app.get('/api/download-proxy', async (req, res) => {
  try {
    const { url, filename } = req.query;
    if (!url) return res.status(400).send('URL required');
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch asset');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'wallpaper')}.jpg"`);
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (err) {
    res.status(500).send('Download processing failed');
  }
});

// ═══════════════════════════════════════
// ADMIN-ONLY ROUTES
// ═══════════════════════════════════════

app.post('/api/upload', adminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { title, category, tags, isPaid, price } = req.body;
    if (!title || !category) return res.status(400).json({ error: 'title and category required' });

    const directLink = req.file.path;
    const publicId   = req.file.filename;
    const pageUrl    = `${BASE_URL}/w/${encodeURIComponent(publicId.replace('knight-vault/', ''))}`;

    const wall = await Wallpaper.create({
      title:        title.trim(),
      filename:     publicId,
      originalName: req.file.originalname,
      url:          pageUrl,
      directLink:   directLink,
      category:     category ? category.split(',').map(c => c.trim().toLowerCase()).filter(Boolean) : [],
      tags:         tags ? tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
      size:         req.file.size || 0,
      mimeType:     req.file.mimetype,
      isPaid:       isPaid === 'true' || isPaid === true,
      price:        parseFloat(price) || 0,
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
    const allowed = ['title', 'category', 'tags', 'isPaid', 'price'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const w = await Wallpaper.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!w) return res.status(404).json({ error: 'Not found' });
    res.json(w);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SERVE INDIVIDUAL WALLPAPER PAGE ──────────────────────
app.get('/w/:publicId', async (req, res) => {
  try {
    const fullFilename = `knight-vault/${req.params.publicId}`;
    const w = await Wallpaper.findOne({ filename: fullFilename });
    
    if (!w) {
      return res.status(404).send(`
        <body style="background:#0A0A0F;color:#7A7A9A;font-family:sans-serif;text-align:center;padding-top:100px;">
          <h1 style="color:#C9A84C;">Vault Error</h1>
          <p>Wallpaper not found in our database records.</p>
          <a href="/" style="color:#C9A84C;text-decoration:none;">← Return to Vault</a>
        </body>
      `);
    }

    const settings = await Settings.findOne();
    const adsenseScript = settings && settings.adsensePublisherId 
      ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.adsensePublisherId}" crossorigin="anonymous"></script>` 
      : '';
    const gaScript = settings && settings.googleAnalyticsId
      ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.googleAnalyticsId}');</script>`
      : '';

    // Increment view counter
    await Wallpaper.findByIdAndUpdate(w._id, { $inc: { views: 1 } });

    // CREATE THE FL_ATTACHMENT DOWNLOAD LINK
    // This tells Cloudinary's servers to force the browser to download the file instead of opening it
    const downloadLink = w.directLink.replace('/upload/', '/upload/fl_attachment/');

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${w.title} — Knight Vault</title>
        ${adsenseScript}
        ${gaScript}
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23C9A84C'%3E%3Cpath d='M2 6s2 2 4 1c2-1 3-3 6-3 3 0 4 2 6 3 2 1 4-1 4-1s-1 4-2 6c-1 2-3 4-8 7-5-3-7-5-8-7-1-2-2-6-2-6zm10 2l-1 2h2l-1-2z'/%3E%3C/svg%3E">
        
        <style>
          body { margin: 0; background: #0A0A0F; color: #E8E8F0; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
          .container { text-align: center; max-width: 600px; }
          img { max-width: 100%; max-height: 75vh; border-radius: 6px; border: 1px solid rgba(201,168,76,0.3); box-shadow: 0 12px 32px rgba(0,0,0,0.5); }
          h1 { font-size: 1.4rem; color: #C9A84C; margin: 20px 0 5px; }
          p { margin: 0 0 20px; color: #7A7A9A; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; }
          .chip { display: inline-block; font-size: 0.7rem; padding: 0.2rem 0.6rem; background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3); border-radius: 20px; color: #C9A84C; margin: 0 2px; text-transform: capitalize; }
          .btn { display: inline-block; background: #C9A84C; color: #0A0A0F; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; font-size: 0.9rem; transition: filter 0.2s; text-transform: uppercase; letter-spacing: 0.05em; }
          .btn:hover { filter: brightness(1.1); }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${w.directLink}" alt="${w.title}">
          <h1>${w.title}</h1>
          <div style="margin-bottom: 20px;">
            ${(Array.isArray(w.category) ? w.category : [w.category]).filter(Boolean).map(c => `<span class="chip">${c}</span>`).join('')}
          </div>
          
          <a href="${downloadLink}" class="btn">Explicit Download</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) { 
    res.status(500).send('Error loading wallpaper page.'); 
  }
});
// ─── FORCE DOWNLOAD ENDPOINT ──────────────────────────────
app.get('/api/download-direct/:publicId', async (req, res) => {
  try {
    const fullFilename = `knight-vault/${req.params.publicId}`;
    const w = await Wallpaper.findOne({ filename: fullFilename });
    
    if (!w) return res.status(404).send('Wallpaper record not found.');

    // 1. Increment the download count in MongoDB
    await Wallpaper.findByIdAndUpdate(w._id, { $inc: { downloads: 1 } });

    // 2. Format a clean filename for their device saving
    const safeName = w.title.trim().replace(/\s+/g, '_') + '.jpg';
    
    // 3. Set standard download headers to bypass browser view triggers
    res.attachment(safeName); // Sets Content-Disposition and Content-Type automatically

    // 4. Use a robust, non-crashing cross-platform stream pipeline
    const https = require('https');
    https.get(w.directLink, (cloudinaryResponse) => {
      if (cloudinaryResponse.statusCode === 200) {
        // Stream the data directly from Cloudinary straight to the user's device
        cloudinaryResponse.pipe(res);
      } else {
        res.status(500).send('Cloudinary resource streaming failed.');
      }
    }).on('error', (e) => {
      res.status(500).send('Download connection lost.');
    });

  } catch (err) {
    res.status(500).send('Direct download pipeline encountered an error.');
  }
});
// ─── KEEP-ALIVE ───────────────────────────────────────────
app.get('/healthz', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ─── ADS.TXT (AdSense Verification) ─────────────────────
app.get('/ads.txt', async (req, res) => {
  try {
    const s = await Settings.findOne();
    if (s && s.adsensePublisherId) {
      // Ensure the ID starts with 'pub-'
      const pubId = s.adsensePublisherId.startsWith('pub-') ? s.adsensePublisherId : `pub-${s.adsensePublisherId}`;
      res.type('text/plain');
      res.send(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0`);
    } else {
      res.status(404).send('AdSense ID not configured');
    }
  } catch (err) {
    res.status(500).send('Error');
  }
});

// ─── CATCH-ALL → frontend ────────────────────────────────
app.get('/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`⚔  Knight Vault → ${BASE_URL}`));
