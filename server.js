require('dotenv').config();
const express    = require('express');
const compression = require('compression');
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
app.use(compression());
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

function syncAdsTxt(pubId) {
  try {
    const fs = require('fs');
    const path = require('path');
    const p = path.join(__dirname, 'public', 'ads.txt');
    if (!pubId) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return;
    }
    let cleanId = pubId.trim();
    if (cleanId.startsWith('ca-')) {
      cleanId = cleanId.substring(3);
    }
    if (!cleanId.startsWith('pub-')) {
      cleanId = `pub-${cleanId}`;
    }
    const fileContent = `google.com, ${cleanId}, DIRECT, f08c47fec0942fa0`;
    fs.writeFileSync(p, fileContent, 'utf8');
    console.log('Successfully synchronized public/ads.txt with publisher ID: ' + cleanId);
  } catch (e) {
    console.error('Failed to sync ads.txt:', e.message);
  }
}

function isRequestBot(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (!ua) return true;
  const botKeywords = [
    'bot', 'spider', 'crawl', 'scraper', 'lighthouse', 'pagespeed',
    'googlebot', 'bingbot', 'yandex', 'baidu', 'duckduck', 'yahoo',
    'pinterest', 'facebookexternalhit', 'twitterbot', 'slackbot',
    'discordbot', 'applebot', 'ia_archiver', 'archive.org'
  ];
  return botKeywords.some(keyword => ua.includes(keyword));
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
    
    // Synchronize ads.txt file on startup
    try {
      const s = await Settings.findOne();
      if (s) {
        syncAdsTxt(s.adsensePublisherId);
      }
    } catch (e) {
      console.error('Failed to run startup ads.txt sync:', e.message);
    }
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
    
    // Check if requester is admin. If not, strip views/adminViews from JSON response.
    const isAdmin = await isRequestAdmin(req);
    let processedWalls = walls;
    if (!isAdmin) {
      processedWalls = walls.map(w => {
        const obj = w.toObject();
        delete obj.views;
        delete obj.adminViews;
        return obj;
      });
    }
    
    res.json({ wallpapers: processedWalls, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
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
    const isBot = isRequestBot(req);
    let w;
    if (isBot) {
      w = await Wallpaper.findById(req.params.id);
    } else {
      const isAdmin = await isRequestAdmin(req);
      const update = isAdmin ? { $inc: { adminViews: 1 } } : { $inc: { views: 1 } };
      w = await Wallpaper.findByIdAndUpdate(req.params.id, update, { new: true });
    }
    if (!w) return res.status(404).json({ error: 'Not found' });
    
    // Check if requester is admin. If not, strip views/adminViews from JSON response.
    const isAdmin = await isRequestAdmin(req);
    if (!isAdmin) {
      const obj = w.toObject();
      delete obj.views;
      delete obj.adminViews;
      return res.json(obj);
    }
    
    res.json(w);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/wallpapers/:id/download', async (req, res) => {
  try {
    const isBot = isRequestBot(req);
    if (!isBot) {
      const isAdmin = await isRequestAdmin(req);
      const update = isAdmin ? { $inc: { adminDownloads: 1 } } : { $inc: { downloads: 1 } };
      await Wallpaper.findByIdAndUpdate(req.params.id, update);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats', async (req, res) => {
  try {
    const isAdmin = await isRequestAdmin(req);
    if (!isAdmin) {
      return res.json({ isAdmin: false });
    }
    
    const promises = [
      Wallpaper.countDocuments(),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$downloads' } } }]),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$views'     } } }]),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$adminDownloads' } } }]),
      Wallpaper.aggregate([{ $group: { _id: null, sum: { $sum: '$adminViews'     } } }])
    ];
    
    const results = await Promise.all(promises);
    const total = results[0];
    const dl = results[1];
    const vw = results[2];
    const adl = results[3];
    const avw = results[4];
    
    res.json({
      total,
      downloads: dl[0]?.sum || 0,
      views: vw[0]?.sum || 0,
      adminDownloads: adl[0]?.sum || 0,
      adminViews: avw[0]?.sum || 0,
      isAdmin: true
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/check-admin', async (req, res) => {
  const isAdmin = await isRequestAdmin(req);
  res.json({ 
    passwordRequired: !!process.env.ADMIN_PASSWORD,
    alreadyAuthenticated: isAdmin 
  });
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
    if (req.body.adsensePublisherId !== undefined) {
      s.adsensePublisherId = req.body.adsensePublisherId;
      syncAdsTxt(s.adsensePublisherId);
    }
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
    // IndexNow Auto-Submit hook
    try {
      submitToIndexNow(slug);
    } catch(e) { console.error('IndexNow trigger error:', e.message); }
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
    // Lazy load GA & AdSense on user interaction (scroll, touch, move) to score 100 on PageSpeed
    const lazyThirdPartyScript = `
      <script>
        let loadedThirdParty = false;
        function loadThirdParty() {
          if (loadedThirdParty) return;
          loadedThirdParty = true;
          
          ${settings && settings.googleAnalyticsId ? `
            const s1 = document.createElement('script');
            s1.async = true;
            s1.src = 'https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}';
            document.head.appendChild(s1);
            const s2 = document.createElement('script');
            s2.innerHTML = "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.googleAnalyticsId}');";
            document.head.appendChild(s2);
          ` : ''}
          
          ${clientAdsenseId ? `
            const s3 = document.createElement('script');
            s3.async = true;
            s3.crossOrigin = 'anonymous';
            s3.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientAdsenseId}';
            document.head.appendChild(s3);
          ` : ''}
        }
        ['touchstart', 'scroll', 'mousemove', 'keydown'].forEach(ev => {
          window.addEventListener(ev, loadThirdParty, { passive: true, once: true });
        });
      </script>
    `;

    const isAdminReq = await isRequestAdmin(req);
    // Increment view counter (only for non-bot users)
    if (!isRequestBot(req)) {
      if (isAdminReq) {
        await Wallpaper.findByIdAndUpdate(w._id, { $inc: { adminViews: 1 } });
      } else {
        await Wallpaper.findByIdAndUpdate(w._id, { $inc: { views: 1 } });
      }
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
            const thumbUrl = (sw.directLink && sw.directLink.includes('/upload/'))
              ? sw.directLink.replace('/upload/', '/upload/w_400,q_auto,f_auto/')
              : (sw.directLink || '');
            
            // Clean extensions, duplicates, and formatting from similar wallpaper titles
            let coreTitle = sw.title.split('|')[0].split(' - ')[0].split(':')[0].trim();
            let cleanTitle = coreTitle.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '')
                                      .replace(/HD(png|jpg|jpeg|webp)$/i, ' HD')
                                      .replace(/_/g, ' ')
                                      .replace(/Wallpaper/gi, '')
                                      .replace(/4K/gi, '')
                                      .trim();
            let words = cleanTitle.split(/\s+/)
                                   .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                   .filter(Boolean);
            if (words.length > 4) {
              words = words.slice(0, 4);
            }
            cleanTitle = words.join(' ') + ' Wallpaper';

            return `
            <div class="wall-card" onclick="window.location.href='${pageLink}'">
              <img src="${esc(thumbUrl)}" alt="${esc(sw.title)} High Quality Wallpaper" loading="lazy"
                style="${sw.resolution && sw.resolution.includes('x') && !isNaN(sw.resolution.split('x')[0]) && !isNaN(sw.resolution.split('x')[1]) ? 'aspect-ratio: ' + sw.resolution.split('x')[0] + ' / ' + sw.resolution.split('x')[1] + ';' : ''} width: 100%; height: auto;"
                onerror="this.style.opacity='0.3'" class="loading"
                onload="this.classList.remove('loading')">
              <div class="card-overlay">
                <h3 class="card-title">${esc(cleanTitle)}</h3>
                <div class="card-cats">
                  ${(Array.isArray(sw.category) ? sw.category : [sw.category]).filter(Boolean).map(c=>`<span class="card-cat-chip">${esc(c)}</span>`).join('')}
                </div>
                <div class="card-actions">
                  <button class="card-btn card-btn-dl"
                    onclick="event.stopPropagation();window.location.href='${pageLink}'">
                    Download 4K <span class="arrow">→</span>
                  </button>
                </div>
              </div>
              <div class="card-info-footer">
                <span class="card-info-title">${esc(cleanTitle)}</span>
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
        ${lazyThirdPartyScript}
        
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
        <link rel="shortcut icon" href="/favicon.ico">
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
        <link rel="manifest" href="/manifest.json">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
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
          .wp-container { max-width: 1200px; margin: 0 auto; padding: 2.5rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 2.5rem; }
          .wp-img-wrap { width: 100%; max-width: 900px; text-align: center; }
          .wp-img-wrap img { width: 100%; max-height: 85vh; object-fit: contain; border-radius: var(--radius); border: 1px solid rgba(201,168,76,.2); box-shadow: 0 20px 50px rgba(0,0,0,0.7); }
          .wp-card-details { width: 100%; max-width: 650px; background: linear-gradient(180deg, var(--bg3) 0%, rgba(17,17,22,0.95) 100%); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; padding: 2rem; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
          .wp-title { font-family: 'Orbitron', sans-serif; font-size: 1.5rem; color: var(--gold); letter-spacing: .08em; margin-bottom: .8rem; text-transform: uppercase; }
          .wp-meta { font-size: .8rem; color: var(--dim); margin: 1.2rem 0; display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; }
          .wp-meta span { color: var(--mid); }
          .wp-cta-section { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; align-items: center; width: 100%; }
          .wp-btn-main { width: 100%; max-width: 450px; font-family: 'Orbitron', sans-serif; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; padding: 1.1rem; background: linear-gradient(135deg, var(--gold-d) 0%, var(--gold) 100%); color: var(--bg); border: none; border-radius: 30px; cursor: pointer; box-shadow: 0 5px 20px rgba(201, 168, 76, 0.3); transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
          .wp-btn-main:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(201, 168, 76, 0.45); filter: brightness(1.05); }
          .wp-btn-main:active { transform: translateY(0); }
          .wp-res-row { width: 100%; max-width: 450px; display: flex; align-items: center; justify-content: center; gap: 0.8rem; margin-top: 0.5rem; }
          .wp-res-label { font-size: 0.75rem; color: var(--dim); white-space: nowrap; text-transform: uppercase; letter-spacing: 0.08em; }
          .wp-res-select { flex: 1; max-width: 280px; background: var(--bg2); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: var(--bright); font-size: 0.85rem; padding: 0.5rem; outline: none; cursor: pointer; }
          .wp-res-select:focus { border-color: rgba(201,168,76,.4); }
          .cat-tag { display: inline-block; font-size: .7rem; padding: .3rem .8rem; background: rgba(201,168,76,.15); border: 1px solid rgba(201,168,76,.3); border-radius: 20px; color: var(--gold); text-transform: capitalize; margin: 0 4px 4px 0; }
          @media (max-width: 768px) {
            .wp-container { padding: 1.5rem 0.5rem; gap: 1.5rem; }
            .wp-card-details { padding: 1.5rem 1rem; }
            .wp-btn-main { font-size: 0.8rem; padding: 0.95rem; }
            .wp-res-row { flex-direction: column; gap: 0.5rem; }
            .wp-res-select { max-width: 100%; width: 100%; }
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
              <!-- Wallpaper Image occupies the main top space -->
              <div class="wp-img-wrap">
                <img src="${esc((w.directLink && w.directLink.includes('/upload/')) ? w.directLink.replace('/upload/', '/upload/w_1200,q_auto,f_auto/') : (w.directLink || ''))}" 
                  style="${w.resolution && w.resolution.includes('x') && !isNaN(w.resolution.split('x')[0]) && !isNaN(w.resolution.split('x')[1]) ? 'aspect-ratio: ' + w.resolution.split('x')[0] + ' / ' + w.resolution.split('x')[1] + ';' : ''} width: 100%; height: auto;" 
                  fetchpriority="high" 
                  alt="${esc(w.title)} High Quality Wallpaper">
              </div>
              
              <!-- Centered Details Card directly underneath -->
              <div class="wp-card-details">
                <h1 class="wp-title">${esc(w.title)}</h1>
                
                <div style="margin-bottom: 1.2rem;">
                  ${categoryArr.map(c => `<span class="cat-tag">${esc(c)}</span>`).join('')}
                </div>
                
                <div class="wp-meta">
                  ${w.tags && w.tags.length ? `<div><span>Tags:</span> ${(w.tags).map(t=>esc(t)).join(', ')}</div>` : ''}
                  <div><span>Size:</span> ${w.size ? (w.size/1024/1024).toFixed(1)+'MB' : '—'}</div>

                  ${isAdminReq ? `<div><span>Views:</span> ${w.views} (${w.adminViews || 0} by you)</div>` : ''}
                </div>
                
                <!-- Unique Dynamic Editorial Description -->
                <div class="wp-desc-section" style="margin-top: 1.8rem; text-align: left; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 1.5rem; font-size: 0.88rem; line-height: 1.65; color: var(--mid);">
                  ${generateWallpaperDescription(w)}
                </div>

                <div class="wp-cta-section">
                  ${w.isPaid 
                    ? `<button class="wp-btn-main" onclick="alert('Payment gateway not integrated yet!')">👑 Premium ${w.price}</button>` 
                    : `<button class="wp-btn-main" onclick="downloadImage()">⬇ Download Original (${w.resolution || '4K'})</button>`
                  }
                  
                  <div class="wp-res-row">
                    <label class="wp-res-label">Or select size:</label>
                    <select id="resSelect" class="wp-res-select">
                      <option value="original">Original resolution (${w.resolution || '4K'})</option>
                      <option value="tv">4K TV (3840x2160)</option>
                      <option value="laptop">Laptop (1920x1080)</option>
                      <option value="mobile">Mobile (1080x1920)</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Recommendation section moved directly below the card -->
              <div style="width: 100%; padding: 0 1rem;">
                ${similarHtml}
              </div>
            </div>
          </main>

          <footer class="main-footer">
            <div class="main-footer-links">
              <a href="/about.html">About Us</a>
              <a href="/contact.html">Contact</a>
              <a href="/privacy.html">Privacy Policy</a>
              <a href="/terms.html">Terms of Service</a>
              <a href="/blog.html">Blog</a>
              <a href="/dmca.html">DMCA Policy</a>
            </div>
            <p class="main-footer-copy">© 2026 Waynelab. All rights reserved. High Quality Wallpapers.</p>
          </footer>
        </div>

        <script>
          async function downloadImage() {
            const btn = document.querySelector('.wp-btn-main');
            const originalText = btn.textContent;
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
            
            setTimeout(() => { btn.textContent = originalText; }, 2000);
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
    const isAdminReq = await isRequestAdmin(req);
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
            <amp-img src="${esc((w.directLink && w.directLink.includes('/upload/')) ? w.directLink.replace('/upload/', '/upload/w_600,q_auto,f_auto/') : (w.directLink || ''))}" layout="fill" alt="${esc(w.title)}"></amp-img>
          </div>
          <div>
            ${(Array.isArray(w.category) ? w.category : [w.category]).filter(Boolean).map(c => `<span class="cat-tag">${esc(c)}</span>`).join('')}
          </div>
          <div class="meta">

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
            <a href="${BASE_URL}/blog.html">Blog</a>
            <a href="${BASE_URL}/dmca.html">DMCA Policy</a>
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
      // 1. Mild blur to protect the uncompressed master and drive CTR
      const blurEffect = 'e_blur:250';
      // 2. Elegant small corner watermark
      const cornerWatermark = 'co_rgb:ffffff,l_text:Arial_30:WAYNELAB.STUDIO,g_north_west,x_30,y_30,o_30';
      // 3. Sleek CTA banner at the bottom
      const bottomBanner = 'co_rgb:000000,l_text:Arial_40_bold:4K%20DOWNLOAD%20%E2%86%92,g_south,y_60,b_rgb:f0d83a,o_90';
      
      previewLink = previewLink.replace('/upload/', `/upload/${blurEffect}/${cornerWatermark}/${bottomBanner}/`);
    }

    // Pinterest Search Keyword Booster
    let keywordSuffix = ' | Aesthetic Background HD';
    if (wall.category && wall.category.length > 0) {
      const mainCat = wall.category[0].toLowerCase();
      if (mainCat === 'anime') {
        keywordSuffix = ' | Anime Wallpaper HD & Lockscreen';
      } else if (mainCat === 'gaming') {
        keywordSuffix = ' | Gaming Wallpaper 4K & Background';
      } else if (mainCat === 'minimalist') {
        keywordSuffix = ' | Minimalist Wallpaper & Desktop Background';
      } else if (mainCat === 'dark') {
        keywordSuffix = ' | Dark Aesthetic Wallpaper & Lockscreen';
      } else if (mainCat === 'car' || mainCat === 'cars') {
        keywordSuffix = ' | Cool Car Wallpaper 4K & Background';
      } else if (mainCat === 'nature' || mainCat === 'scenery') {
        keywordSuffix = ' | Aesthetic Nature Wallpaper HD';
      }
    }
    
    let pinTitle = wall.title;
    // Strip extensions and clean up title
    pinTitle = pinTitle.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '')
                       .replace(/HD(png|jpg|jpeg|webp)$/i, ' HD')
                       .replace(/_/g, ' ')
                       .trim();
    
    let categoryLabel = '';
    if (wall.category && wall.category.length > 0) {
      const cat = wall.category[0];
      categoryLabel = ` ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
    }
    
    pinTitle = `${pinTitle} - Free 4K${categoryLabel} Wallpaper${keywordSuffix}`;
    if (pinTitle.length > 100) {
      pinTitle = pinTitle.substring(0, 97) + '...';
    }

    // Pinterest Description Optimization
    const emojiDown = '\uD83D\uDC47';
    const cleanTitle = wall.title.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '').replace(/_/g, ' ').trim();
    let pinDescription = `Download clean, unblurred 4K ${cleanTitle} Wallpaper ${emojiDown} Tap Visit Site to get the uncompressed full resolution download for free!\n\n`;
    
    let hashtags = ['#4kwallpaper', '#wallpaper', '#backgrounds', '#aesthetic'];
    if (wall.category) {
      wall.category.forEach(c => {
        const clean = c.replace(/[^a-zA-Z0-9]/g, '');
        if (clean) hashtags.push(`#${clean}`);
      });
    }
    if (wall.tags) {
      wall.tags.forEach(t => {
        const clean = t.replace(/[^a-zA-Z0-9]/g, '');
        if (clean && hashtags.length < 12) hashtags.push(`#${clean}`);
      });
    }
    hashtags = [...new Set(hashtags)];
    pinDescription += `Direct Link to Download: ${wall.url}\n\n` + hashtags.join(' ');
    if (pinDescription.length > 500) {
      pinDescription = pinDescription.substring(0, 497) + '...';
    }

    const pinData = {
      board_id: settings.pinterestBoardId,
      link: wall.url,
      title: pinTitle,
      description: pinDescription,
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

    // 1. Increment the download count in MongoDB (only for non-bot users)
    const isBot = isRequestBot(req);
    if (!isBot) {
      const isAdmin = await isRequestAdmin(req);
      const update = isAdmin ? { $inc: { adminDownloads: 1 } } : { $inc: { downloads: 1 } };
      await Wallpaper.findByIdAndUpdate(w._id, update);
    }

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
// 🛠 SITEMAP.XML (With Google Image Extensions) 🛠
app.get('/sitemap.xml', async (req, res) => {
  try {
    const walls = await Wallpaper.find({}, 'filename uploadedAt slug directLink title').sort({ uploadedAt: -1 });
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
    
    // Static routes
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}/</loc>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    const staticRoutes = [
      '/about.html', 
      '/contact.html', 
      '/privacy.html', 
      '/terms.html',
      '/dmca.html',
      '/top-gear-5-wallpapers',
      '/best-black-clover-wallpapers',
      '/demon-slayer-4k-collection'
    ];
    staticRoutes.forEach(route => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}${route}</loc>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.5</priority>\n';
      xml += '  </url>\n';
    });
    
    const xmlEsc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    // Dynamic wallpaper routes
    walls.forEach(w => {
      xml += '  <url>\n';
      const slug = w.slug || w.filename.replace('waynelab/', '');
      xml += `    <loc>${BASE_URL}/w/${encodeURIComponent(slug)}</loc>\n`;
      if (w.uploadedAt) {
        xml += `    <lastmod>${w.uploadedAt.toISOString().split('T')[0]}</lastmod>
`;
      }
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      
      if (w.directLink) {
        const escTitle = xmlEsc(w.title || 'Wallpaper');
        xml += '    <image:image>\n';
        xml += `      <image:loc>${xmlEsc(w.directLink)}</image:loc>\n`;
        xml += `      <image:title>${escTitle}</image:title>\n`;
        xml += `      <image:caption>Download ${escTitle} high quality wallpaper on Waynelab KnightVault</image:caption>\n`;
        xml += '    </image:image>\n';
      }
      
      xml += '  </url>\n';
    });
    
    xml += '</urlset>';
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// 🛠 INDEXNOW VERIFICATION KEYS 🛠
const INDEXNOW_KEY = '74bd3c02d8f94e91a0b5c7d8e9f2a3b4';
app.get('/74bd3c02d8f94e91a0b5c7d8e9f2a3b4.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send(INDEXNOW_KEY);
});
app.get('/indexnow-key.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send(INDEXNOW_KEY);
});

// 🛠 INDEXNOW AUTO-NOTIFICATION HELPER 🛠
async function submitToIndexNow(slug) {
  try {
    const pageUrl = `${BASE_URL}/w/${slug}`;
    console.log(`[IndexNow] Submitting URL: ${pageUrl}`);
    const hostname = new URL(BASE_URL).hostname;
    
    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        host: hostname,
        key: INDEXNOW_KEY,
        keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: [pageUrl]
      })
    });
    
    if (response.ok) {
      console.log(`[IndexNow] Successfully submitted URL for ${slug}`);
    } else {
      const txt = await response.text();
      console.error(`[IndexNow] Submission failed (status ${response.status}): ${txt}`);
    }
  } catch (err) {
    console.error('[IndexNow] Error submitting to IndexNow:', err.message);
  }
}

// 🛠 RSS FEED (FEED.XML) 🛠
app.get('/feed.xml', async (req, res) => {
  try {
    const walls = await Wallpaper.find({}).sort({ uploadedAt: -1 }).limit(50);
    
    let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
    rss += '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">\n';
    rss += '  <channel>\n';
    rss += `    <title>Waynelab KnightVault - Premium 4K Wallpapers</title>\n`;
    rss += `    <link>${BASE_URL}</link>\n`;
    rss += `    <description>Download high-quality 4K &amp; HD wallpapers, dark themes, and custom backgrounds on Waynelab KnightVault.</description>\n`;
    rss += '    <language>en-us</language>\n';
    rss += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
    
    const xmlEsc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    walls.forEach(w => {
      const slug = w.slug || w.filename.replace('waynelab/', '');
      const itemUrl = `${BASE_URL}/w/${encodeURIComponent(slug)}`;
      rss += '    <item>\n';
      rss += `      <title>${xmlEsc(w.title)}</title>\n`;
      rss += `      <link>${itemUrl}</link>\n`;
      rss += `      <guid isPermaLink="true">${itemUrl}</guid>\n`;
      rss += `      <pubDate>${w.uploadedAt ? new Date(w.uploadedAt).toUTCString() : new Date().toUTCString()}</pubDate>\n`;
      rss += `      <description><![CDATA[Download ${xmlEsc(w.title)} wallpaper in high-resolution original format on Waynelab KnightVault.]]></description>\n`;
      
      if (w.directLink) {
        rss += `      <enclosure url="${xmlEsc(w.directLink)}" length="${w.size || 0}" type="${w.mimeType || 'image/jpeg'}" />\n`;
        rss += `      <media:content url="${xmlEsc(w.directLink)}" medium="image" type="${w.mimeType || 'image/jpeg'}" />\n`;
      }
      
      rss += '    </item>\n';
    });
    
    rss += '  </channel>\n';
    rss += '</rss>';
    
    res.header('Content-Type', 'application/xml');
    res.send(rss);
  } catch (err) {
    res.status(500).send('Error generating RSS feed');
  }
});

app.get(['/vault-access', '/vault-access/:secret'], async (req, res) => {
  const secret = req.params.secret;
  const isAlreadyAdmin = await isRequestAdmin(req);
  
  if (process.env.ADMIN_PASSWORD && secret === process.env.ADMIN_PASSWORD) {
    await updateAdminIp(req);
    res.setHeader('Set-Cookie', 'adminPw=' + encodeURIComponent(secret) + '; Path=/; Max-Age=31536000; SameSite=Strict');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(path.join(__dirname, 'admin_panel.html'));
  }
  
  if (isAlreadyAdmin) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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


// -------------------------------------------------------------
// DYNAMIC DESCRIPTION GENERATOR (AdSense Thin Content Compliance)
// -------------------------------------------------------------
function generateWallpaperDescription(w) {
  const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const title = w.title.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '').replace(/_/g, ' ').trim();
  const cleanTitle = esc(title.split('|')[0].trim());
  const categories = (Array.isArray(w.category) ? w.category : [w.category]).filter(Boolean);
  const tags = (Array.isArray(w.tags) ? w.tags : [w.tags]).filter(Boolean);
  
  const mainCat = esc(categories[0] || 'artwork');
  const tagList = tags.length > 0 ? tags.slice(0, 3).map(t => esc(t)).join(', ') : 'digital art';
  
  // Dynamic screen and orientation recommendation
  let deviceRec = 'desktop monitors, widescreen displays, and home office setups';
  let aspectText = 'landscape panoramic orientation';
  if (w.resolution && w.resolution.includes('x')) {
    const [width, height] = w.resolution.split('x').map(Number);
    if (!isNaN(width) && !isNaN(height) && height > width) {
      deviceRec = 'mobile devices, iPhones, Android home screens, and vertical lockscreens';
      aspectText = 'portrait layout';
    }
  }

  let contextSentence = `Featuring stunning design highlights, this digital background is curated specifically for fans looking to bring high-quality visual aesthetics to their setup.`;
  if (mainCat.toLowerCase() === 'anime') {
    contextSentence = `Designed for dedicated anime fans, this background showcases detailed anime character art and rich environmental effects, making it a perfect match for personalizing your lockscreens and desktop setups.`;
  } else if (mainCat.toLowerCase() === 'gaming') {
    contextSentence = `Featuring gaming-inspired concept themes and character illustrations, this background highlights the immersive art styles of modern gameplay graphics directly on your screens.`;
  }

  return `
    <p style="margin: 0 0 1rem 0;">This high-quality <strong>${cleanTitle}</strong> wallpaper is a hand-curated digital background optimized for ${mainCat} enthusiasts. ${contextSentence}</p>
    <p style="margin: 0 0 1rem 0;">Our creative post-processing involves sharpening image details, balancing lighting contrast, and refining the color palette. These visual enhancements ensure that digital lines and lighting effects remain crisp, vibrant, and clear on high-refresh-rate OLED and LCD displays.</p>
    <p style="margin: 0;">Tailored specifically for ${deviceRec}, this background is available for download in ${aspectText} in its original ${esc(w.resolution || '4K')} resolution, helping you build a clean and premium screen setup.</p>
  `;
}

// -------------------------------------------------------------
// CURATED COLLECTIONS RENDERERS
// -------------------------------------------------------------
function renderServerGrid(walls, esc) {
  if (!walls || !walls.length) {
    return `<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--dim);"><p>No wallpapers found in this collection.</p></div>`;
  }
  return walls.map(w => {
    const pageLink = '/w/' + (w.slug || w.filename.split('/').pop());
    const thumbUrl = (w.directLink && w.directLink.includes('/upload/')) 
      ? w.directLink.replace('/upload/', '/upload/w_600,q_auto,f_auto/') 
      : (w.directLink || '');
    
    let coreTitle = w.title.split('|')[0].split(' - ')[0].split(':')[0].trim();
    let cleanTitle = coreTitle.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '')
                              .replace(/HD(png|jpg|jpeg|webp)$/i, ' HD')
                              .replace(/_/g, ' ')
                              .replace(/Wallpaper/gi, '')
                              .replace(/4K/gi, '')
                              .trim();
    let words = cleanTitle.split(/\s+/)
                           .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                           .filter(Boolean);
    if (words.length > 4) {
      words = words.slice(0, 4);
    }
    cleanTitle = words.join(' ') + ' Wallpaper';

    let badgesHtml = '';
    const resolution = w.resolution || '';
    if (resolution.includes('x')) {
      const [wVal, hVal] = resolution.split('x').map(Number);
      if (!isNaN(wVal) && !isNaN(hVal)) {
        if (wVal >= 3840) {
          badgesHtml += `<span class="card-tag-badge gold">4K UHD</span>`;
        } else if (wVal >= 1920) {
          badgesHtml += `<span class="card-tag-badge">1080p HD</span>`;
        }
        if (wVal > hVal) {
          badgesHtml += `<span class="card-tag-badge">Desktop</span>`;
        } else {
          badgesHtml += `<span class="card-tag-badge">Mobile</span>`;
        }
      }
    }
    if (w.mimeType === 'image/png' || (w.originalName && w.originalName.toLowerCase().endsWith('.png'))) {
      badgesHtml += `<span class="card-tag-badge png">PNG</span>`;
    }

    return `
    <div class="wall-card" onclick="window.location.href='${pageLink}'">
      <img src="${esc(thumbUrl)}" alt="${esc(w.title)} High Quality Wallpaper" loading="lazy"
        style="${w.resolution && w.resolution.includes('x') && !isNaN(w.resolution.split('x')[0]) && !isNaN(w.resolution.split('x')[1]) ? 'aspect-ratio: ' + w.resolution.split('x')[0] + ' / ' + w.resolution.split('x')[1] + ';' : ''} width: 100%; height: auto;"
        onerror="this.style.opacity='0.3'" class="loading"
        onload="this.classList.remove('loading')">
      <div class="card-overlay">
        <h3 class="card-title">${esc(cleanTitle)}</h3>
        <div class="card-cats">
          ${(Array.isArray(w.category) ? w.category : [w.category]).filter(Boolean).map(c=>`<span class="card-cat-chip">${esc(c)}</span>`).join('')}
        </div>
        <div class="card-actions">
          <button class="card-btn card-btn-dl">
            ${w.isPaid ? `👑 PREMIUM ${w.price}` : 'Download 4K <span class="arrow">→</span>'}
          </button>
        </div>
      </div>
      <div class="card-info-footer">
        <span class="card-info-title">${esc(cleanTitle)}</span>
        <div class="card-tag-row">${badgesHtml}</div>
      </div>
    </div>
    `;
  }).join('');
}

function renderCollectionPage(res, walls, title, introText, metaDesc, canonicalUrl, esc) {
  const gridHtml = renderServerGrid(walls, esc);
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="robots" content="index, follow">
      <meta name="description" content="${esc(metaDesc)}">
      <title>${esc(title)} — Waynelab</title>
      <link rel="canonical" href="${canonicalUrl}">
      <link rel="icon" type="image/svg+xml" href="/favicon.svg">
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
      <link rel="shortcut icon" href="/favicon.ico">
      <link rel="manifest" href="/manifest.json">
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="/style.css">
      <style>
        .coll-hero {
          text-align: center;
          padding: 2.2rem 1rem 1.2rem;
          background: radial-gradient(circle at center, rgba(201, 168, 76, 0.05) 0%, transparent 70%);
          max-width: 800px;
          margin: 0 auto;
        }
        .coll-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.8rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0 0 0.8rem 0;
          background: linear-gradient(135deg, var(--gold) 30%, #fff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .coll-desc {
          font-family: 'Inter', sans-serif;
          font-size: 0.86rem;
          color: var(--mid);
          line-height: 1.6;
          margin: 0;
        }
        @media (max-width: 768px) {
          .coll-hero { padding: 1.5rem 1rem 0.8rem; }
          .coll-title { font-size: 1.4rem; }
          .coll-desc { font-size: 0.8rem; }
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

        <main class="main" style="padding: 1.2rem 2rem 3rem;">
          <div class="coll-hero">
            <h1 class="coll-title">${esc(title)}</h1>
            <p class="coll-desc">${esc(introText)}</p>
          </div>
          <div class="wall-grid" style="margin-top: 2.2rem;">
            ${gridHtml}
          </div>
        </main>

        <footer class="main-footer">
          <div class="main-footer-links">
            <a href="/about.html">About Us</a>
            <a href="/contact.html">Contact</a>
            <a href="/privacy.html">Privacy Policy</a>
            <a href="/terms.html">Terms of Service</a>
            <a href="/dmca.html">DMCA Policy</a>
          </div>
          <p class="main-footer-copy">© 2026 Waynelab. All rights reserved. High Quality Wallpapers.</p>
        </footer>
      </div>
    </body>
    </html>
  `);
}

async function renderCollection(req, res, keyword, title, introText) {
  try {
    const walls = await Wallpaper.find({
      $or: [
        { tags: { $regex: new RegExp(keyword, 'i') } },
        { title: { $regex: new RegExp(keyword, 'i') } },
        { category: { $regex: new RegExp(keyword, 'i') } }
      ]
    }).limit(24).sort({ uploadedAt: -1 });

    const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    const metaDesc = `Download the best high-quality ${title} in 4K UHD and HD resolutions. Browse our hand-curated collection of premium desktop and mobile backgrounds.`;
    const canonicalUrl = `${BASE_URL}/${req.path.replace(/^\/+/, '')}`;
    
    renderCollectionPage(res, walls, title, introText, metaDesc, canonicalUrl, esc);
  } catch (err) {
    res.status(500).send('Error loading collection page.');
  }
}

// Curated Collection Routes
app.get('/top-gear-5-wallpapers', (req, res) => {
  renderCollection(req, res, 'luffy|gear\\s*5', 'Top Gear 5 Luffy Wallpapers', 
    'Monkey D. Luffy\'s Gear 5 awakening is one of the most iconic moments in anime history. Representing the peak of his power as the Sun God Nika, Gear 5 combines cartoonish freedom with godlike abilities. In this curated collection, we have gathered the ultimate high-definition and 4K Gear 5 Luffy wallpapers. Each wallpaper in this vault has been processed with visual enhancements, color correction, and contrast tuning to highlight Luffy\'s signature white hair and glowing energy waves. Whether you are looking for a dark minimalist design for your iPhone lockscreen or a high-detail cinematic scene for your desktop monitor, this collection has the perfect background for One Piece fans.');
});

app.get('/best-black-clover-wallpapers', (req, res) => {
  renderCollection(req, res, 'asta|black\\s*clover', 'Best Black Clover Wallpapers', 
    'Black Clover follows the journey of Asta, a magicless boy in a world where magic is everything, who gains the power of Anti-Magic through a five-leaf clover grimoire. This curated collection brings together the absolute best Black Clover and Asta wallpapers in 4K UHD and HD resolutions. From Asta\'s intense devil-union forms to dramatic battle sequences and grimoire designs, each image has been carefully color-graded and sharpened to bring out the grim, high-energy aesthetic of the Magic Knights. Enhance your mobile screens and desktop setups with these premium backgrounds showcasing the determination and raw power of the Black Bulls\' anti-magic hero.');
});

app.get('/demon-slayer-4k-collection', (req, res) => {
  renderCollection(req, res, 'demon\\s*slayer|rengoku|tanjiro', 'Demon Slayer 4K Collection', 
    'Demon Slayer (Kimetsu no Yaiba) is celebrated for its breathtaking animation, vibrant color palettes, and intense swordsmanship. This curated Demon Slayer 4K collection offers premium high-resolution wallpapers featuring Tanjiro Kamado, the Flame Hashira Kyojuro Rengoku, and other iconic characters. Every wallpaper in this collection has been optimized for deep contrast and color balance, highlighting the gorgeous breathing style effects—from Rengoku\'s roaring flames to Tanjiro\'s water and sun breathing flows. Perfect for mobile lockscreens and high-refresh-rate desktop displays, this collection brings the cinematic art of Ufotable directly to your devices for free.');
});

app.listen(PORT, () => console.log(`⚔  Waynelab → ${BASE_URL}`));