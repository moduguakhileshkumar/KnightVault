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
const fs         = require('fs');

async function getUniqueSlug(title, WallpaperModel, excludeId = null) {
  let slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  if (!slug) slug = 'wallpaper';
  
  let uniqueSlug = slug;
  let counter = 1;
  while (true) {
    const query = { slug: uniqueSlug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await WallpaperModel.findOne(query);
    if (!existing) {
      break;
    }
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  return uniqueSlug;
}


const app      = express();
const PORT     = process.env.PORT || 3000;
let BASE_URL = process.env.BASE_URL || 'https://waynelab.studio';
// Normalize BASE_URL by stripping any trailing slashes
BASE_URL = BASE_URL.replace(/\/+$/, '');

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
  const pw = req.headers['x-admin-password'] || req.query.password;
  if (!process.env.ADMIN_PASSWORD) return next(); // no password set = dev mode
  if (pw && pw === process.env.ADMIN_PASSWORD) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

async function updateAdminIp(req) {
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (clientIp) {
    try {
      await Settings.findOneAndUpdate({}, { adminIp: clientIp }, { upsert: true, new: true });
      console.log('Updated adminIp in settings: ' + clientIp);
    } catch (e) {
      console.error('Failed to update adminIp:', e);
    }
  }
}

async function isRequestAdmin(req) {
  const pw = req.headers['x-admin-password'] || req.query.password;
  if (process.env.ADMIN_PASSWORD && pw === process.env.ADMIN_PASSWORD) {
    return true;
  }
  const cookies = req.headers.cookie || '';
  const adminPwCookie = cookies.split(';').find(c => c.trim().startsWith('adminPw='));
  if (adminPwCookie) {
    const cookieVal = decodeURIComponent(adminPwCookie.split('=')[1] || '').trim();
    if (process.env.ADMIN_PASSWORD && cookieVal === process.env.ADMIN_PASSWORD) {
      return true;
    }
  }
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  try {
    const settings = await Settings.findOne();
    if (settings && settings.adminIp && clientIp === settings.adminIp) {
      return true;
    }
  } catch (e) {}
  if (!process.env.ADMIN_PASSWORD) {
    return true;
  }
  return false;
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

    // MIGRATION: Fix duplicate slashes in wallpaper urls
    try {
      const wallsWithDoubleSlash = await Wallpaper.find({ url: /\/\// });
      if (wallsWithDoubleSlash.length > 0) {
        console.log(`Fixing double slashes in ${wallsWithDoubleSlash.length} wallpaper urls...`);
        for (let w of wallsWithDoubleSlash) {
          const cleanUrl = w.url.replace(/([^:])\/\/+/g, '$1/');
          w.url = cleanUrl;
          await w.save();
        }
      }
    } catch(e) { console.error('Double slash migration failed', e); }

    // MIGRATION: Generate slugs for wallpapers that don't have them
    try {
      const wallsWithoutSlug = await Wallpaper.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
      if (wallsWithoutSlug.length > 0) {
        console.log(`Migrating ${wallsWithoutSlug.length} wallpapers to add slugs...`);
        for (let w of wallsWithoutSlug) {
          const slug = await getUniqueSlug(w.title, Wallpaper);
          w.slug = slug;
          w.url = `${BASE_URL}/w/${slug}`;
          await w.save();
          console.log(`Generated slug for: ${w.title} -> ${slug}`);
        }
      }
    } catch(e) { console.error('Slug migration failed', e); }

    // MIGRATION: One-time reset of views and downloads to 0
    try {
      let s = await Settings.findOne();
      if (!s) {
        s = await Settings.create({});
      }
      if (!s.statsResetCompleted) {
        console.log('Resetting views/downloads stats for all wallpapers to 0...');
        const res = await Wallpaper.updateMany({}, {
          $set: {
            views: 0,
            downloads: 0,
            adminViews: 0,
            adminDownloads: 0
          }
        });
        console.log('Reset stats successfully. Modified ' + res.modifiedCount + ' wallpapers.');
        s.statsResetCompleted = true;
        await s.save();
      }
    } catch(e) { console.error('One-time stats reset migration failed:', e); }
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
    const isAdmin = await isRequestAdmin(req);
    const update = isAdmin ? { $inc: { adminViews: 1 } } : { $inc: { views: 1 } };
    const w = await Wallpaper.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!w) return res.status(404).json({ error: 'Not found' });
    res.json(w);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/wallpapers/:id/download', async (req, res) => {
  try {
    const isAdmin = await isRequestAdmin(req);
    const update = isAdmin ? { $inc: { adminDownloads: 1 } } : { $inc: { downloads: 1 } };
    await Wallpaper.findByIdAndUpdate(req.params.id, update);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats', async (req, res) => {
  try {
    const [total, dl, vw, adl, avw] = await Promise.all([
      Wallpaper.countDocuments(),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$downloads' } } }]),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$views'     } } }]),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$adminDownloads' } } }]),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$adminViews'     } } }]),
    ]);
    const isAdmin = await isRequestAdmin(req);
    res.json({
      total,
      downloads: dl[0]?.sum || 0,
      views: vw[0]?.sum || 0,
      adminDownloads: adl[0]?.sum || 0,
      adminViews: avw[0]?.sum || 0,
      isAdmin
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/check-admin', (req, res) => {
  res.json({ passwordRequired: !!process.env.ADMIN_PASSWORD });
});

app.post('/api/verify-admin', async (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD || password === process.env.ADMIN_PASSWORD) {
    await updateAdminIp(req);
    res.setHeader('Set-Cookie', 'adminPw=' + encodeURIComponent(password || '') + '; Path=/; Max-Age=31536000; SameSite=Strict');
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: 'Wrong password' });
});

// ─── SETTINGS API ─────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  try {
    let s = await Settings.findOne();
    if (!s) s = await Settings.create({
      adsensePublisherId: '',
      googleAnalyticsId: '',
      predefinedTags: [],
      predefinedCategories: [],
      pinterestAccessToken: '',
      pinterestBoardId: '',
      pinterestClientId: '',
      pinterestClientSecret: '',
      pinterestRefreshToken: '',
      pinterestSandbox: false
    });

    let pinterestStatus = 'Not Connected';
    if (s.pinterestRefreshToken) {
      pinterestStatus = 'Connected (Auto-refresh enabled)';
    } else if (s.pinterestAccessToken) {
      pinterestStatus = 'Temporary Token Active (Expires in 24h)';
    }

    const data = s.toObject();
    data.pinterestStatus = pinterestStatus;
    res.json(data);
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
    if (req.body.pinterestAccessToken !== undefined) s.pinterestAccessToken = req.body.pinterestAccessToken;
    if (req.body.pinterestBoardId !== undefined) s.pinterestBoardId = req.body.pinterestBoardId;
    if (req.body.pinterestClientId !== undefined) s.pinterestClientId = req.body.pinterestClientId;
    if (req.body.pinterestClientSecret !== undefined) s.pinterestClientSecret = req.body.pinterestClientSecret;
    if (req.body.pinterestSandbox !== undefined) s.pinterestSandbox = req.body.pinterestSandbox;
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
    const slug       = await getUniqueSlug(title, Wallpaper);
    const pageUrl    = `${BASE_URL}/w/${slug}`;

    const wall = await Wallpaper.create({
      title:        title.trim(),
      slug:         slug,
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
    // Pinterest Auto-Post hook
    try {
      const settings = await Settings.findOne();
      if (settings) postToPinterest(wall, settings);
    } catch(e) { console.error('Pinterest upload trigger error:', e.message); }
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
    
    if (req.body.title !== undefined) {
      const newSlug = await getUniqueSlug(req.body.title, Wallpaper, req.params.id);
      update.slug = newSlug;
      update.url = `${BASE_URL}/w/${newSlug}`;
    }

    const w = await Wallpaper.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!w) return res.status(404).json({ error: 'Not found' });
    res.json(w);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SERVE INDIVIDUAL WALLPAPER PAGE ──────────────────────
app.get('/w/:slugOrId', async (req, res) => {
  try {
    const slugOrId = req.params.slugOrId;
    const w = await Wallpaper.findOne({
      $or: [
        { slug: slugOrId },
        { filename: `waynelab/${slugOrId}` }
      ]
    });
    
    if (!w) {
      return res.status(404).send(`
        <body style="background:#0A0A0F;color:#7A7A9A;font-family:sans-serif;text-align:center;padding-top:100px;">
          <h1 style="color:#C9A84C;">Vault Error</h1>
          <p>Wallpaper not found in our database records.</p>
          <a href="/" style="color:#C9A84C;text-decoration:none;">⚙️ Return to Vault</a>
        </body>
      `);
    }

    if (w.slug && slugOrId !== w.slug) {
      return res.redirect(301, `/w/${encodeURIComponent(w.slug)}`);
    }

    const settings = await Settings.findOne();
    let clientAdsenseId = '';
    if (settings && settings.adsensePublisherId) {
      const rawAdsenseId = settings.adsensePublisherId.trim();
      if (rawAdsenseId.startsWith('ca-pub-')) {
        clientAdsenseId = rawAdsenseId;
      } else if (rawAdsenseId.startsWith('pub-')) {
        clientAdsenseId = `ca-${rawAdsenseId}`;
      } else {
        clientAdsenseId = `ca-pub-${rawAdsenseId}`;
      }
    }
    const adsenseScript = clientAdsenseId 
      ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientAdsenseId}" crossorigin="anonymous"></script>` 
      : '';
    const gaScript = settings && settings.googleAnalyticsId
      ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.googleAnalyticsId}');</script>`
      : '';

    // Increment view counter
    const isAdminReq = await isRequestAdmin(req);
    if (isAdminReq) {
      await Wallpaper.findByIdAndUpdate(w._id, { $inc: { adminViews: 1 } });
    } else {
      await Wallpaper.findByIdAndUpdate(w._id, { $inc: { views: 1 } });
    }

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
            const pageLink = '/w/' + (sw.slug || sw.filename.split('/').pop());
            const thumbUrl = sw.directLink.includes('/upload/')
              ? sw.directLink.replace('/upload/', '/upload/w_400,q_auto,f_auto/')
              : sw.directLink;
            return `
            <div class="wall-card" onclick="window.location.href='${pageLink}'">
              <img src="${esc(thumbUrl)}" alt="${esc(sw.title)} High Quality Wallpaper" loading="lazy"
                onerror="this.style.opacity='0.3'" class="loading"
                onload="this.classList.remove('loading')">
              <div class="card-overlay">
                <h3 class="card-title">${esc(sw.title)}</h3>
                <div class="card-cats">
                  ${(Array.isArray(sw.category) ? sw.category : [sw.category]).filter(Boolean).map(c=>`<span class="card-cat-chip">${esc(c)}</span>`).join('')}
                </div>
                <div class="card-actions">
                  <button class="card-btn card-btn-dl"
                    onclick="event.stopPropagation();window.location.href='${pageLink}'">
                    VIEW DETAILS
                  </button>
                </div>
              </div>
              <div class="card-info-footer">
                <span class="card-info-title">${esc(sw.title)}</span>
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
        <link rel="canonical" href="${BASE_URL}/w/${encodeURIComponent(w.slug || slugOrId)}">
        <link rel="amphtml" href="${BASE_URL}/amp/w/${encodeURIComponent(w.slug || slugOrId)}">
        <meta name="robots" content="index, follow">
        <meta name="description" content="Download ${esc(w.title)} wallpaper in high quality (4K, HD, mobile sizes) on Waynelab's KnightVault. Find dark themed hero backgrounds and premium artwork.">
        <meta property="og:title" content="${esc(w.title)} — Waynelab">
        <meta property="og:description" content="Download ${esc(w.title)} wallpaper in high quality (4K, HD, mobile sizes) on Waynelab's KnightVault. Find dark themed hero backgrounds and premium artwork.">
        <meta property="og:image" content="${esc(w.directLink)}">
        <meta property="og:url" content="${BASE_URL}/w/${encodeURIComponent(w.slug || slugOrId)}">
        <meta property="og:type" content="website">
        <meta name="twitter:card" content="summary_large_image">
        ${adsenseScript}
        ${gaScript}
        
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
        <link rel="shortcut icon" href="/favicon.ico">
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
        <link rel="manifest" href="/manifest.json">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="/style.css">
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "ImageObject",
          "name": "${esc(w.title)}",
          "caption": "${esc(w.title)} High Quality Wallpaper",
          "contentUrl": "${esc(w.directLink)}",
          "thumbnailUrl": "${esc(w.directLink)}",
          "url": "${BASE_URL}/w/${encodeURIComponent(w.slug || slugOrId)}"
        }
        </script>
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
              <svg width="40" height="21" viewBox="0 0 128.7 68.138" fill="var(--gold)">
              <path d="M 64.18,55.126 C 64.18,55.126 62.87,49.196 61.38,46.606 59.99,44.187 57.99,42.117 55.81,40.377 53.91,38.867 51.73,37.667 49.44,36.847 47.6,36.187 45.62,35.897 43.67,35.787 41.83,35.677 39.95,35.757 38.14,36.147 35.82,36.647 31.49,38.657 31.49,38.657 31.49,38.657 31.85,37.027 31.53,36.307 31.24,35.647 30.54,35.237 29.91,34.887 28.86,34.297 27.67,33.877 26.47,33.817 25.01,33.747 23.53,34.147 22.19,34.717 20.33,35.507 18.63,36.707 17.16,38.097 15.42,39.737 12.81,43.817 12.81,43.817 12.81,43.817 16.03,36.487 18.29,33.207 20.38,30.177 22.99,27.507 25.66,24.977 28.16,22.607 30.85,20.391 33.73,18.5 36.71,16.546 43.19,13.522 43.19,13.522 43.19,13.522 43.45,14.575 43.59,15.1 43.76,15.755 43.94,16.408 44.11,17.063 44.28,17.731 44.62,19.068 44.62,19.068 44.62,19.068 47.08,19.451 48.3,19.682 50.21,20.043 52.11,20.459 54.01,20.887 55.6,21.247 58.76,22.027 58.76,22.027 58.76,22.027 59.27,20.102 59.52,19.138 59.78,18.157 60.29,16.192 60.29,16.192 60.87,17.151 61.45,18.109 62.03,19.068 62.03,19.068 63.48,18.99 64.2,18.99 64.92,18.99 66.37,19.068 66.37,19.068 66.96,18.123 67.54,17.177 68.13,16.232 68.13,16.232 68.57,18.119 68.84,19.051 69.12,20.052 69.78,22.027 69.78,22.027 69.78,22.027 73.01,21.427 74.61,21.067 76.37,20.667 78.09,20.121 79.86,19.746 81.15,19.472 83.75,19.068 83.75,19.068 83.75,19.068 84.15,17.675 84.34,16.975 84.53,16.287 84.7,15.597 84.88,14.906 85,14.446 85.22,13.522 85.22,13.522 85.22,13.522 92.54,16.867 95.86,19.113 98.95,21.207 101.77,23.697 104.37,26.377 107,29.087 109.45,32.027 111.47,35.227 113.28,38.087 115.89,44.377 115.89,44.377 115.89,44.377 113.55,40.277 111.9,38.627 110.51,37.237 108.81,36.127 107.05,35.247 105.84,34.647 104.55,34.127 103.21,33.997 101.94,33.877 100.61,33.997 99.42,34.457 98.47,34.817 97.39,35.307 96.92,36.217 96.56,36.907 96.92,38.557 96.92,38.557 96.92,38.557 92.83,36.737 90.66,36.237 88.86,35.817 86.98,35.577 85.13,35.697 82.68,35.857 80.23,36.467 77.95,37.377 75.89,38.197 73.91,39.317 72.2,40.727 70.23,42.357 68.44,44.307 67.16,46.516 65.64,49.146 64.18,55.126 64.18,55.126 Z" />
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
                <img src="${esc(w.directLink.includes('/upload/') ? w.directLink.replace('/upload/', '/upload/w_1200,q_auto,f_auto/') : w.directLink)}" alt="${esc(w.title)} High Quality Wallpaper">
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

          <footer class="main-footer">
            <div class="main-footer-links">
              <a href="/about.html">About Us</a>
              <a href="/contact.html">Contact</a>
              <a href="/privacy.html">Privacy Policy</a>
              <a href="/terms.html">Terms of Service</a>
            </div>
            <p class="main-footer-copy">© 2026 Waynelab. All rights reserved. High Quality Wallpapers.</p>
          </footer>
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
app.get('/amp/w/:slugOrId', async (req, res) => {
  try {
    const slugOrId = req.params.slugOrId;
    const w = await Wallpaper.findOne({
      $or: [
        { slug: slugOrId },
        { filename: `waynelab/${slugOrId}` }
      ]
    });
    if (!w) return res.status(404).send('Not found');

    if (w.slug && slugOrId !== w.slug) {
      return res.redirect(301, `/amp/w/${encodeURIComponent(w.slug)}`);
    }

    const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    
    // Using 1080x1920 as a portrait placeholder layout ratio for mobile devices
    res.send(`
      <!doctype html>
      <html amp lang="en">
      <head>
        <meta charset="utf-8">
        <title>${esc(w.title)} — Waynelab</title>
        <link rel="canonical" href="${BASE_URL}/w/${encodeURIComponent(w.slug || slugOrId)}">
        <meta name="robots" content="index, follow">
        <meta name="description" content="Download ${esc(w.title)} wallpaper in high quality (4K, HD, mobile sizes) on Waynelab's KnightVault. Find dark themed hero backgrounds and premium artwork.">
        <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
        <script async src="https://cdn.ampproject.org/v0.js"></script>
        <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
        <style amp-custom>
          body { background: #0A0A0F; color: #E5E7EB; font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
          header { background: #111116; padding: 1rem; text-align: center; border-bottom: 1px solid rgba(201,168,76,0.2); }
          .logo { color: #C9A84C; text-decoration: none; font-weight: 900; font-size: 1.2rem; text-transform: uppercase; letter-spacing: 0.1em; }
          main { padding: 1rem; max-width: 600px; margin: 0 auto; text-align: center; }
          h1 { color: #C9A84C; font-size: 1.5rem; margin-top: 0.5rem; margin-bottom: 1rem; }
          .img-wrap { position: relative; width: 100%; height: 480px; max-height: 70vh; background: #0A0A0F; border-radius: 8px; overflow: hidden; border: 1px solid rgba(201,168,76,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin-bottom: 1rem; }
          .img-wrap amp-img img { object-fit: contain; }
          .btn { display: block; background: linear-gradient(135deg, #A8862F, #C9A84C); color: #0A0A0F; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; }
          .meta { font-size: 0.85rem; color: #7A7A9A; margin: 1rem 0; line-height: 1.6; display: flex; flex-direction: column; gap: 0.3rem; }
          .cat-tag { display: inline-block; font-size: .75rem; padding: .2rem .6rem; background: rgba(201,168,76,.15); border: 1px solid rgba(201,168,76,.3); border-radius: 20px; color: #C9A84C; text-transform: capitalize; margin: 0.2rem; }
          .main-footer { margin-top: 2rem; padding: 2rem 1rem; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; font-size: 0.75rem; color: #7A7A9A; }
          .main-footer-links { display: flex; justify-content: center; gap: 1rem; margin-bottom: 0.8rem; }
          .main-footer-links a { color: #C9A84C; text-decoration: none; font-weight: 700; }
        </style>
      </head>
      <body>
        <header>
          <a href="${BASE_URL}/" class="logo">Waynelab</a>
        </header>
        <main>
          <h1>${esc(w.title)}</h1>
          <div class="img-wrap">
            <amp-img src="${esc(w.directLink)}" layout="fill" alt="${esc(w.title)}"></amp-img>
          </div>
          <div>
            ${(Array.isArray(w.category) ? w.category : [w.category]).filter(Boolean).map(c => `<span class="cat-tag">${esc(c)}</span>`).join('')}
          </div>
          <div class="meta">
            <div><strong>Downloads:</strong> ${w.downloads}</div>
            <div><strong>Size:</strong> ${w.size ? (w.size/1024/1024).toFixed(1)+'MB' : '—'}</div>
          </div>
          ${w.isPaid 
            ? `<a href="${BASE_URL}/w/${encodeURIComponent(w.slug)}" class="btn">👑 Premium ${w.price}</a>`
            : `<a href="${BASE_URL}/api/download-direct/${encodeURIComponent(w.slug)}" class="btn">⬇ Download Now</a>`
          }
        </main>
        <footer class="main-footer">
          <div class="main-footer-links">
            <a href="${BASE_URL}/about.html">About Us</a>
            <a href="${BASE_URL}/contact.html">Contact</a>
            <a href="${BASE_URL}/privacy.html">Privacy</a>
            <a href="${BASE_URL}/terms.html">Terms</a>
          </div>
          <p>© 2026 Waynelab. All rights reserved.</p>
        </footer>
      </body>
      </html>
    `);
  } catch (err) { res.status(500).send('Error loading AMP page.'); }
});

// Pinterest Auto-Post Helper
async function postToPinterest(wall, settings) {
  if (!settings.pinterestAccessToken || !settings.pinterestBoardId) return;
  try {
    // If token has expired or is expiring soon, attempt auto-refresh
    if (settings.pinterestTokenExpiresAt && new Date() >= new Date(settings.pinterestTokenExpiresAt)) {
      console.log('Pinterest token is expired/expiring. Refreshing...');
      const refreshed = await refreshPinterestToken(settings);
      if (!refreshed) {
        console.error('Skipping Pinterest upload: Failed to refresh token.');
        return;
      }
    }

    // Generate watermarked preview link for Pinterest using Cloudinary transformation
    let previewLink = wall.directLink;
    if (previewLink && previewLink.includes('/upload/')) {
      // co_rgb:000000 -> text color black
      // b_rgb:f0d83a -> background color gold (#f0d83a matches site theme)
      // l_text:Arial_40_bold -> Arial font, size 40, bold
      // g_south -> aligned to bottom
      // y_60 -> offset 60px from bottom edge
      const overlayText = 'co_rgb:000000,l_text:Arial_40_bold:DOWNLOAD%204K%20AT%20WAYNELAB.STUDIO,g_south,y_60,b_rgb:f0d83a';
      previewLink = previewLink.replace('/upload/', `/upload/${overlayText}/`);
    }

    const pinData = {
      board_id: settings.pinterestBoardId,
      link: wall.url,
      title: wall.title,
      description: `👇 CLICK the link to download the uncompressed 4K resolution version of this anime wallpaper on my website for free! 📲 Beautiful lockscreen and homescreen setups at waynelab.studio. Direct Page: ${wall.url}`,
      media_source: {
        source_type: 'image_url',
        url: previewLink
      }
    };
    
    const baseUrl = settings.pinterestSandbox ? 'https://api-sandbox.pinterest.com' : 'https://api.pinterest.com';
    const response = await fetch(baseUrl + '/v5/pins', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + settings.pinterestAccessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pinData)
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`Pinterest API failed with status ${response.status}:`, errText);
    } else {
      console.log(`Successfully posted pin to Pinterest for wallpaper: ${wall.title} (Sandbox: ${!!settings.pinterestSandbox})`);
    }
  } catch (err) {
    console.error('Failed to post to Pinterest:', err.message);
  }
}

// Helper to auto-refresh access token using refresh token
async function refreshPinterestToken(settings) {
  if (!settings.pinterestRefreshToken || !settings.pinterestClientId || !settings.pinterestClientSecret) return false;
  try {
    const authHeader = Buffer.from(`${settings.pinterestClientId}:${settings.pinterestClientSecret}`).toString('base64');
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', settings.pinterestRefreshToken);

    const oauthUrl = settings.pinterestSandbox ? 'https://api-sandbox.pinterest.com/v5/oauth/token' : 'https://api.pinterest.com/v5/oauth/token';
    const tokenResponse = await fetch(oauthUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Failed to refresh Pinterest token: ${errorText}`);
      return false;
    }

    const tokenData = await tokenResponse.json();
    settings.pinterestAccessToken = tokenData.access_token;
    if (tokenData.refresh_token) {
      settings.pinterestRefreshToken = tokenData.refresh_token;
    }
    const expiresIn = tokenData.expires_in || 86400;
    settings.pinterestTokenExpiresAt = new Date(Date.now() + (expiresIn - 300) * 1000); // 5 min buffer
    await settings.save();
    console.log('Successfully refreshed Pinterest Access Token.');
    return true;
  } catch(e) {
    console.error('Error refreshing Pinterest token:', e.message);
    return false;
  }
}

// OAuth start route
app.get('/api/pinterest/auth', adminOnly, async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings || !settings.pinterestClientId) {
      return res.status(400).send('Please configure your Pinterest App ID in Settings first.');
    }
    const redirectUri = `${BASE_URL}/api/pinterest/callback`;
    // Pinterest uses the same authorization URL for both Sandbox and Production
    const authUrl = `https://www.pinterest.com/oauth/?client_id=${settings.pinterestClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=boards:read,boards:write,pins:read,pins:write`;
    res.redirect(authUrl);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// OAuth callback route
app.get('/api/pinterest/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Authorization code missing');

    const settings = await Settings.findOne();
    if (!settings || !settings.pinterestClientId || !settings.pinterestClientSecret) {
      return res.status(400).send('App configurations missing in Settings');
    }

    const redirectUri = `${BASE_URL}/api/pinterest/callback`;
    const authHeader = Buffer.from(`${settings.pinterestClientId}:${settings.pinterestClientSecret}`).toString('base64');
    
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const oauthUrl = settings.pinterestSandbox ? 'https://api-sandbox.pinterest.com/v5/oauth/token' : 'https://api.pinterest.com/v5/oauth/token';
    const tokenResponse = await fetch(oauthUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return res.status(tokenResponse.status).send(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    settings.pinterestAccessToken = tokenData.access_token;
    if (tokenData.refresh_token) {
      settings.pinterestRefreshToken = tokenData.refresh_token;
    }
    const expiresIn = tokenData.expires_in || 86400;
    settings.pinterestTokenExpiresAt = new Date(Date.now() + (expiresIn - 300) * 1000); // 5 min buffer
    await settings.save();

    res.send(`
      <html>
        <body style="font-family:sans-serif; text-align:center; background:#121212; color:#fff; padding-top:5rem;">
          <h2 style="color:#f0d83a;">Pinterest Connected Successfully!</h2>
          <p>This window will close automatically in 3 seconds...</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`OAuth Error: ${err.message}`);
  }
});

// Pinterest proxy endpoint to list boards
app.get('/api/pinterest/boards', adminOnly, async (req, res) => {
  try {
    const settings = await Settings.findOne();
    const token = req.headers['x-pinterest-token'] || settings.pinterestAccessToken;
    if (!token) return res.status(400).send('Pinterest Token required');
    
    const isSandbox = req.query.sandbox === 'true' || settings.pinterestSandbox;
    const baseUrl = isSandbox ? 'https://api-sandbox.pinterest.com' : 'https://api.pinterest.com';
    const response = await fetch(baseUrl + '/v5/boards', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }
    const data = await response.json();
    res.json(data);
  } catch(err) {
    res.status(500).send(err.message);
  }
});

// ─── FORCE DOWNLOAD ENDPOINT ──────────────────────────────
app.get('/api/download-direct/:slugOrId', async (req, res) => {
  try {
    const slugOrId = req.params.slugOrId;
    const w = await Wallpaper.findOne({
      $or: [
        { slug: slugOrId },
        { filename: `waynelab/${slugOrId}` }
      ]
    });
    
    if (!w) return res.status(404).send('Wallpaper record not found.');

    // 1. Increment the download count in MongoDB
    const isAdmin = await isRequestAdmin(req);
    const update = isAdmin ? { $inc: { adminDownloads: 1 } } : { $inc: { downloads: 1 } };
    await Wallpaper.findByIdAndUpdate(w._id, update);

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
      let pubId = s.adsensePublisherId.trim();
      if (pubId.startsWith('ca-')) {
        pubId = pubId.substring(3);
      }
      if (!pubId.startsWith('pub-')) {
        pubId = `pub-${pubId}`;
      }
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
    const walls = await Wallpaper.find({}, 'filename uploadedAt slug').sort({ uploadedAt: -1 });
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Static routes
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}/</loc>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    const staticRoutes = ['/about.html', '/contact.html', '/privacy.html', '/terms.html'];
    staticRoutes.forEach(route => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}${route}</loc>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.5</priority>\n';
      xml += '  </url>\n';
    });
    
    // Dynamic wallpaper routes
    walls.forEach(w => {
      const publicId = w.filename.replace('waynelab/', '');
      xml += '  <url>\n';
      const slug = w.slug || w.filename.replace('waynelab/', '');
      xml += `    <loc>${BASE_URL}/w/${encodeURIComponent(slug)}</loc>\n`;
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
app.get('/vault-access/:secret', async (req, res) => {
  if (process.env.ADMIN_PASSWORD && req.params.secret === process.env.ADMIN_PASSWORD) {
    await updateAdminIp(req);
    res.setHeader('Set-Cookie', 'adminPw=' + encodeURIComponent(req.params.secret) + '; Path=/; Max-Age=31536000; SameSite=Strict');
    return res.sendFile(path.join(__dirname, 'admin_panel.html'));
  }
  return res.redirect('/');
});

// ─── CATCH-ALL → frontend ────────────────────────────────
// ─── HOMEPAGE SEO DYNAMIC INJECTION ───────────────────────
app.get(['/', '/index.html'], async (req, res) => {
  try {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (!fs.existsSync(indexPath)) {
      return res.status(404).send('index.html not found');
    }
    
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Fetch up to 100 wallpapers to pre-render as links for search engines
    const walls = await Wallpaper.find({}).sort({ uploadedAt: -1 }).limit(100);
    
    let seoHtml = '\n<div style="display:none;" class="seo-catalog">\n';
    seoHtml += '  <h2>Waynelab Wallpapers Catalog</h2>\n';
    seoHtml += '  <ul>\n';
    walls.forEach(w => {
      const slug = w.slug || w.filename.replace('waynelab/', '');
      seoHtml += `    <li><a href="/w/${encodeURIComponent(slug)}">${w.title} Wallpaper</a></li>\n`;
    });
    seoHtml += '  </ul>\n';
    seoHtml += '</div>';

    // Inject the SEO block before the footer (if it exists) or before the end of the body
    if (html.includes('<footer class="main-footer" data-nosnippet>')) {
      html = html.replace('<footer class="main-footer" data-nosnippet>', seoHtml + '\n<footer class="main-footer" data-nosnippet>');
    } else {
      html = html.replace('</body>', seoHtml + '\n</body>');
    }
    
    res.send(html);
  } catch (err) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// 404 NOT FOUND FALLBACK (Prevents Soft 404s for invalid pages)
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 Not Found - Waynelab</title>
      <style>
        body { background: #0A0A0F; color: #7A7A9A; font-family: sans-serif; text-align: center; padding-top: 100px; }
        h1 { color: #C9A84C; font-family: sans-serif; }
        a { color: #C9A84C; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>Page Not Found</h1>
      <p>The requested page does not exist on our server.</p>
      <p><a href="/">Return to Vault</a></p>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`⚔  Waynelab → ${BASE_URL}`));