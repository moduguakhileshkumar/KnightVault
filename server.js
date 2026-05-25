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
    folder:          'waynelab',
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
  .then(async () => {
    console.log('✓ MongoDB connected');
    
    // MIGRATION: Fix comma-separated categories and tags saved previously
    try {
      const walls = await Wallpaper.find({});
      for (let w of walls) {
        let changed = false;
        let newCats = [];
        if (w.category && Array.isArray(w.category)) {
          w.category.forEach(c => {
            if (c.includes(',')) {
              c.split(',').forEach(sc => {
                const trimmed = sc.trim().toLowerCase();
                if (trimmed && !newCats.includes(trimmed)) newCats.push(trimmed);
              });
              changed = true;
            } else if (!newCats.includes(c)) {
              newCats.push(c);
            }
          });
        }
        let newTags = [];
        if (w.tags && Array.isArray(w.tags)) {
          w.tags.forEach(t => {
            if (t.includes(',')) {
              t.split(',').forEach(st => {
                const trimmed = st.trim().toLowerCase();
                if (trimmed && !newTags.includes(trimmed)) newTags.push(trimmed);
              });
              changed = true;
            } else if (!newTags.includes(t)) {
              newTags.push(t);
            }
          });
        }
        if (changed) {
          w.category = newCats;
          w.tags = newTags;
          await w.save();
          console.log(`Migrated wallpaper: ${w.title}`);
        }
      }
    } catch(e) { console.error('Migration failed', e); }
  })
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
    const pageUrl    = `${BASE_URL}/w/${encodeURIComponent(publicId.replace('waynelab/', ''))}`;

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
    const fullFilename = `waynelab/${req.params.publicId}`;
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

    // Find similar wallpapers
    let categoryArr = Array.isArray(w.category) ? w.category : [w.category];
    categoryArr = categoryArr.filter(Boolean);
    const similar = await Wallpaper.find({
      _id: { $ne: w._id },
      category: { $in: categoryArr }
    }).limit(8).sort({ uploadedAt: -1 });

    const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    let similarHtml = '';
    if (similar.length > 0) {
      similarHtml = `
        <h2 style="font-family:'Orbitron',sans-serif;font-size:1.2rem;color:var(--gold);margin:3rem 0 1.5rem;letter-spacing:.1em;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:.8rem;">Similar Wallpapers</h2>
        <div class="wall-grid">
          ${similar.map(sw => {
            const pageLink = '/w/' + sw.filename.split('/').pop();
            return `
            <div class="wall-card" onclick="window.location.href='${pageLink}'">
              <img src="${esc(sw.directLink)}" alt="${esc(sw.title)}" loading="lazy">
              <div class="card-overlay" style="opacity:1;background:linear-gradient(to top,rgba(5,5,5,0.9) 0%,transparent 60%);">
                <div class="card-title">${esc(sw.title)}</div>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      `;
    }
    const cleanTitle = w.title.replace(/\s+/g, '_');

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${esc(w.title)} — Waynelab</title>
        <link rel="amphtml" href="${BASE_URL}/amp/w/${encodeURIComponent(req.params.publicId)}">
        ${adsenseScript}
        ${gaScript}
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23C9A84C'%3E%3Cpath d='M2 6s2 2 4 1c2-1 3-3 6-3 3 0 4 2 6 3 2 1 4-1 4-1s-1 4-2 6c-1 2-3 4-8 7-5-3-7-5-8-7-1-2-2-6-2-6zm10 2l-1 2h2l-1-2z'/%3E%3C/svg%3E">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="/style.css">
        <style>
          .wp-container { max-width: 1000px; margin: 0 auto; padding: 2rem; display: flex; gap: 2rem; align-items: flex-start; }
          .wp-img-wrap { flex: 1; text-align: center; }
          .wp-img-wrap img { max-width: 100%; max-height: 80vh; border-radius: var(--radius); border: 1px solid rgba(201,168,76,.15); box-shadow: 0 12px 32px rgba(0,0,0,0.5); }
          .wp-info { width: 300px; flex-shrink: 0; background: var(--bg3); border: 1px solid rgba(255,255,255,.07); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px); padding: 1.5rem; }
          .wp-title { font-family: 'Orbitron', sans-serif; font-size: 1.2rem; color: var(--gold); letter-spacing: .08em; margin-bottom: .5rem; }
          .wp-meta { font-size: .75rem; color: var(--dim); margin-bottom: 1.5rem; line-height: 1.6; }
          .wp-meta span { color: var(--mid); }
          .res-label { display: block; font-size: .7rem; color: var(--dim); letter-spacing: .1em; text-transform: uppercase; margin-bottom: .5rem; }
          .res-select { width: 100%; background: var(--bg2); border: 1px solid rgba(255,255,255,.1); border-radius: var(--radius); color: var(--bright); font-size: .85rem; padding: .6rem; outline: none; margin-bottom: 1rem; cursor: pointer; }
          .res-select:focus { border-color: rgba(201,168,76,.4); }
          .wp-btn-dl { clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px); width: 100%; font-family: 'Orbitron', sans-serif; font-size: .72rem; letter-spacing: .18em; text-transform: uppercase; padding: .85rem; background: linear-gradient(135deg, var(--gold-d), var(--gold)); color: var(--bg); border: none; cursor: pointer; font-weight: 600; border-radius: var(--radius); transition: filter .2s; }
          .wp-btn-dl:hover { filter: brightness(1.1); }
          .cat-tag { display: inline-block; font-size: .65rem; padding: .2rem .6rem; background: rgba(201,168,76,.15); border: 1px solid rgba(201,168,76,.3); border-radius: 20px; color: var(--gold); text-transform: capitalize; margin: 0 4px 4px 0; }
          @media (max-width: 768px) {
            .wp-container { flex-direction: column; padding: 1rem; }
            .wp-info { width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="app">
          <header class="topbar">
            <a class="logo" href="/">
              <svg width="32" height="32" viewBox="0 0 34 24" fill="var(--gold)">
                <path d="M34,8.5 c-3.5,0 -7,4.5 -8.5,8.5 c0,-5 -2,-12 -6.5,-16.5 c-0.5,2.5 -1,4 -2,4 c-1,0 -1.5,-1.5 -2,-4 c-4.5,4.5 -6.5,11.5 -6.5,16.5 c-1.5,-4 -5,-8.5 -8.5,-8.5 c3.5,6 8.5,14.5 17,14.5 c8.5,0 13.5,-8.5 17,-14.5 Z" />
              </svg>
              <div>
                <span class="logo-name">Waynelab</span>
                <span class="logo-tag">High Quality Wallpapers</span>
              </div>
            </a>
            <div class="topbar-actions">
              <button class="btn btn-gold" onclick="window.location.href='/'">← Back to Vault</button>
            </div>
          </header>

          <main class="main" style="padding: 0;">
            <div class="wp-container">
              <div class="wp-img-wrap">
                <img src="${esc(w.directLink)}" alt="${esc(w.title)}">
              </div>
              <div class="wp-info">
                <h1 class="wp-title">${esc(w.title)}</h1>
                <div style="margin-bottom: 1rem;">
                  ${categoryArr.map(c => `<span class="cat-tag">${esc(c)}</span>`).join('')}
                </div>
                <div class="wp-meta">
                  ${w.tags && w.tags.length ? `<div><span>Tags:</span> ${(w.tags).map(t=>esc(t)).join(', ')}</div>` : ''}
                  <div><span>Downloads:</span> ${w.downloads}</div>
                  <div><span>Views:</span> ${w.views}</div>
                  <div><span>Size:</span> ${w.size ? (w.size/1024/1024).toFixed(1)+'MB' : '—'}</div>
                </div>

                <label class="res-label">Select Resolution</label>
                <select id="resSelect" class="res-select">
                  <option value="original">Original Size</option>
                  <option value="tv">4K TV (3840x2160)</option>
                  <option value="laptop">Laptop (1920x1080)</option>
                  <option value="mobile">Mobile (1080x1920)</option>
                </select>

                ${w.isPaid 
                  ? `<button class="wp-btn-dl" onclick="alert('Payment gateway not integrated yet!')">👑 Premium $${w.price}</button>` 
                  : `<button class="wp-btn-dl" onclick="downloadImage()">⬇ Download</button>`
                }
              </div>
            </div>
            
            <div style="max-width: 1000px; margin: 0 auto; padding: 0 2rem 3rem;">
              ${similarHtml}
            </div>
          </main>
        </div>

        <script>
          async function downloadImage() {
            const btn = document.querySelector('.wp-btn-dl');
            btn.textContent = 'Downloading...';
            
            // Record download stat via API
            try { await fetch('/api/wallpapers/${w._id}/download', { method:'POST' }); } catch(e) {}
            
            const res = document.getElementById('resSelect').value;
            let url = "${w.directLink}";
            let proxyFilename = "${esc(cleanTitle)}";

            if (res === 'tv') {
              url = url.replace('/upload/', '/upload/w_3840,h_2160,c_fill,g_auto/');
              proxyFilename += "_4K";
            } else if (res === 'laptop') {
              url = url.replace('/upload/', '/upload/w_1920,h_1080,c_fill,g_auto/');
              proxyFilename += "_FHD";
            } else if (res === 'mobile') {
              url = url.replace('/upload/', '/upload/w_1080,h_1920,c_fill,g_auto/');
              proxyFilename += "_Mobile";
            }

            // Using download-proxy to trigger actual file download instead of browser view
            const dlUrl = '/api/download-proxy?url=' + encodeURIComponent(url) + '&filename=' + encodeURIComponent(proxyFilename);
            window.location.href = dlUrl;
            
            setTimeout(() => { btn.textContent = '⬇ Download'; }, 2000);
          }
        </script>
      </body>
      </html>
    `);
  } catch (err) { 
    res.status(500).send('Error loading wallpaper page.'); 
  }
});
// ─── AMP WALLPAPER PAGE ───────────────────────────────────
app.get('/amp/w/:publicId', async (req, res) => {
  try {
    const fullFilename = `waynelab/${req.params.publicId}`;
    const w = await Wallpaper.findOne({ filename: fullFilename });
    if (!w) return res.status(404).send('Not found');

    const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    
    // Using 1080x1920 as a portrait placeholder layout ratio for mobile devices
    res.send(`
      <!doctype html>
      <html ⚡ lang="en">
      <head>
        <meta charset="utf-8">
        <title>${esc(w.title)} — Waynelab</title>
        <link rel="canonical" href="${BASE_URL}/w/${encodeURIComponent(req.params.publicId)}">
        <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
        <script async src="https://cdn.ampproject.org/v0.js"></script>
        <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
        <style amp-custom>
          body { background: #0A0A0F; color: #E5E7EB; font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
          header { background: #111116; padding: 1rem; text-align: center; border-bottom: 1px solid rgba(201,168,76,0.2); }
          .logo { color: #C9A84C; text-decoration: none; font-weight: 900; font-size: 1.2rem; text-transform: uppercase; letter-spacing: 0.1em; }
          main { padding: 1rem; max-width: 600px; margin: 0 auto; text-align: center; }
          h1 { color: #C9A84C; font-size: 1.5rem; margin-top: 0.5rem; margin-bottom: 1rem; }
          .img-wrap { border-radius: 8px; overflow: hidden; border: 1px solid rgba(201,168,76,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin-bottom: 1rem; }
          .btn { display: block; background: linear-gradient(135deg, #A8862F, #C9A84C); color: #0A0A0F; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; }
          .meta { font-size: 0.85rem; color: #7A7A9A; margin: 1rem 0; line-height: 1.6; display: flex; flex-direction: column; gap: 0.3rem; }
          .cat-tag { display: inline-block; font-size: .75rem; padding: .2rem .6rem; background: rgba(201,168,76,.15); border: 1px solid rgba(201,168,76,.3); border-radius: 20px; color: #C9A84C; text-transform: capitalize; margin: 0.2rem; }
        </style>
      </head>
      <body>
        <header>
          <a href="${BASE_URL}/" class="logo">Waynelab</a>
        </header>
        <main>
          <h1>${esc(w.title)}</h1>
          <div class="img-wrap">
            <amp-img src="${esc(w.directLink)}" width="1080" height="1920" layout="responsive" alt="${esc(w.title)}"></amp-img>
          </div>
          <div>
            ${(Array.isArray(w.category) ? w.category : [w.category]).filter(Boolean).map(c => `<span class="cat-tag">${esc(c)}</span>`).join('')}
          </div>
          <div class="meta">
            <div><strong>Downloads:</strong> ${w.downloads}</div>
            <div><strong>Size:</strong> ${w.size ? (w.size/1024/1024).toFixed(1)+'MB' : '—'}</div>
          </div>
          ${w.isPaid 
            ? `<a href="${BASE_URL}/w/${encodeURIComponent(req.params.publicId)}" class="btn">👑 Premium $${w.price}</a>`
            : `<a href="${BASE_URL}/api/download-direct/${encodeURIComponent(req.params.publicId)}" class="btn">⬇ Download Now</a>`
          }
        </main>
      </body>
      </html>
    `);
  } catch (err) { res.status(500).send('Error loading AMP page.'); }
});

// ─── FORCE DOWNLOAD ENDPOINT ──────────────────────────────
app.get('/api/download-direct/:publicId', async (req, res) => {
  try {
    const fullFilename = `waynelab/${req.params.publicId}`;
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

// ─── ROBOTS.TXT (Crawler Config) ────────────────────────
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml`);
});

// ─── SITEMAP.XML ──────────────────────────────────────────
app.get('/sitemap.xml', async (req, res) => {
  try {
    const walls = await Wallpaper.find({}, 'filename uploadedAt').sort({ uploadedAt: -1 });
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Static routes
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}/</loc>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';
    
    // Dynamic wallpaper routes
    walls.forEach(w => {
      const publicId = w.filename.replace('waynelab/', '');
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/w/${encodeURIComponent(publicId)}</loc>\n`;
      if (w.uploadedAt) {
        xml += `    <lastmod>${w.uploadedAt.toISOString().split('T')[0]}</lastmod>\n`;
      }
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });
    
    xml += '</urlset>';
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// ─── SECRET ADMIN ROUTE ───────────────────────────────────
app.get('/vault-access/:secret', (req, res) => {
  if (process.env.ADMIN_PASSWORD && req.params.secret === process.env.ADMIN_PASSWORD) {
    return res.sendFile(path.join(__dirname, 'admin_panel.html'));
  }
  return res.redirect('/');
});

// ─── CATCH-ALL → frontend ────────────────────────────────
app.get('/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`⚔  Waynelab → ${BASE_URL}`));
