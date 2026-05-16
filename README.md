# ⚔ Knight Vault — Setup Guide

## What's in this folder

```
knight-vault/
├── server.js          ← Express backend (API + file uploads)
├── model.js           ← MongoDB wallpaper schema
├── package.json       ← Dependencies
├── .env.example       ← Copy to .env and fill in your values
├── uploads/           ← Where uploaded images are stored (auto-created)
└── public/
    └── index.html     ← The full frontend
```

---

## STEP 1 — Get a free MongoDB database

1. Go to **https://mongodb.com/cloud/atlas** → Sign up free
2. Create a free cluster (M0 Shared — 512MB free, enough for thousands of wallpapers)
3. In "Database Access" → Add user → username + password (save these)
4. In "Network Access" → Add IP → Allow access from anywhere (0.0.0.0/0)
5. In your cluster → Connect → Connect your application → Copy the connection string
   It looks like: `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/`
6. Replace `<password>` with your actual password

---

## STEP 2 — Configure your environment

```bash
# Copy the example file
cp .env.example .env

# Edit .env:
MONGO_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/knight-vault?retryWrites=true&w=majority
PORT=3000
BASE_URL=http://localhost:3000
```

---

## STEP 3 — Install and run locally

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Open **http://localhost:3000** in your browser.
Your site is running! Upload a wallpaper to test.

---

## STEP 4 — Deploy to the internet FREE

### Option A — Render.com (easiest, recommended)

1. Push your folder to GitHub (github.com → New repo → upload files)
2. Go to **https://render.com** → New → Web Service → Connect your repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables (MONGO_URI, PORT, BASE_URL)
6. Deploy → you get a free URL like `https://knight-vault.onrender.com`
7. Update BASE_URL in your env vars to that URL

**Free tier note:** Render free tier sleeps after 15min of inactivity (first request wakes it up in ~30 seconds). Upgrade to $7/month for always-on.

### Option B — Railway.app

1. Go to **https://railway.app** → New Project → Deploy from GitHub
2. Add MONGO_URI and BASE_URL environment variables
3. Done. Railway auto-detects Node.js.

### Option C — Your own VPS (DigitalOcean, Hetzner)

```bash
# On your server
git clone <your-repo>
cd knight-vault
npm install
# Install pm2 to keep it running
npm install -g pm2
pm2 start server.js --name knight-vault
pm2 save
```

---

## STEP 5 — Custom domain (optional, ~$10/year)

1. Buy a domain at **namecheap.com** (e.g. knightvault.com)
2. In Render/Railway → Settings → Custom Domains → Add your domain
3. Point your domain's DNS to the provided value
4. Update BASE_URL in your env to `https://knightvault.com`

---

## What the site does

- **Upload** any image (JPEG, PNG, WEBP, GIF, up to 20MB)
- **Auto-generates** a direct image link + a page link for every upload
- **Search** by title, tag, or category (MongoDB full-text search)
- **Filter** by category with live pill counts
- **Sort** by newest, most downloaded, most viewed
- **Lightbox** preview with copy-able direct links
- **Download** tracking (increments counter on each download)
- **Admin bar** shows total wallpapers, downloads, and views
- **Drag & drop** upload with progress bar

## API Endpoints (for reference)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/wallpapers | List with ?q=&category=&page=&sort= |
| GET | /api/wallpapers/:id | Single wallpaper (increments views) |
| POST | /api/upload | Upload new wallpaper (multipart/form-data) |
| PATCH | /api/wallpapers/:id | Update title/category/tags |
| DELETE | /api/wallpapers/:id | Delete wallpaper + file |
| POST | /api/wallpapers/:id/download | Increment download count |
| GET | /api/categories | All categories with counts |
| GET | /api/stats | Total wallpapers, downloads, views |
