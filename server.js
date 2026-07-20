require('dotenv').config();
const express    = require('express');
const compression = require('compression');
const mongoose   = require('mongoose');

// Helper to get rich, unique descriptions for collection pages
function getCollectionIntro(slug, name) {
  const intros = {
    'one-piece-4k-wallpapers': `
      Welcome to the ultimate One Piece 4K wallpapers collection! Explore high-resolution artwork featuring your favorite Straw Hat Pirates, including Monkey D. Luffy, Roronoa Zoro, Vinsmoke Sanji, Nami, and Nico Robin. Download stunning, uncompressed backgrounds showcasing iconic moments from the Wano Country Arc, Marineford, and Egghead Island.
      
      Whether you are looking for Luffy's legendary Gear 5 form (Sun God Nika), Zoro's three-sword style techniques, or epic battle scenes with Shanks and Kaido, our hand-curated catalog has you covered. All wallpapers are optimized for ultra-high-definition desktop screens and high-end mobile displays.
    `,
    'solo-leveling-4k-wallpapers': `
      Immerse yourself in the Shadow Monarch's realm with our premium Solo Leveling 4K wallpapers collection. Featuring Sung Jinwoo, the Shadow Army, Igris, Beru, and other S-Rank Hunters, these backgrounds bring the intensity and dark fantasy aesthetic of the hit anime and webtoon straight to your screen.
      
      Discover epic battle illustrations, glowing neon weapon details, and dark minimalist backgrounds perfect for AMOLED mobile lock screens and high-resolution gaming monitors. Elevate your device's look with the ultimate power of the Monarch of Shadows today.
    `,
    'demon-slayer-4k-collection': `
      Step into the world of the Demon Slayer Corps with our hand-picked Demon Slayer 4K wallpapers collection. Featuring breathtaking action shots of Tanjiro Kamado, Nezuko, Zenitsu Agatsuma, and Inosuke Hashibira, this collection highlights the stunning art style and animation of Ufotable.
      
      Showcase the power of the Hashira, including Kyojuro Rengoku (Flame Hashira), Giyu Tomioka (Water Hashira), and Tengen Uzui (Sound Hashira). Browse high-quality desktop backgrounds and mobile screens depicting epic encounters, breath techniques, and artistic character portraits.
    `,
    'best-black-clover-wallpapers': `
      Unleash your inner magic with the best Black Clover wallpapers in full 4K and HD. Featuring Asta, Yuno, Noelle Silva, and the members of the Black Bulls squad, this collection captures the spirit of the Clover Kingdom and its fiercest battles.
      
      Download high-quality wallpaper backgrounds showcasing Asta's Anti-Magic demon forms, Yuno's Spirit Dive, and the legendary Magic Knight Captains like Yami Sukehiro. Perfect for personalizing your desktop monitor, phone home screen, or tablet.
    `,
    'attack-on-titan-4k-wallpapers': `
      Dedicate your heart with our Attack on Titan (Shingeki no Kyojin) 4K wallpapers collection. Relive the epic dark fantasy saga with high-resolution backgrounds featuring Eren Yeager's Attack Titan form, Mikasa Ackerman, Armin Arlert, and the legendary Captain Levi.
      
      From the colossal walls of Paradis Island to the intense Scout Regiment battles against the Titans, these hand-selected artworks are optimized to look incredibly crisp on both desktop monitors and high-end smartphones.
    `,
    'chainsawman-4k-wallpapers': `
      Enter the gritty and chaotic universe of Tatsuki Fujimoto's masterpiece with our Chainsaw Man 4K wallpapers collection. Featuring Denji in his fully transformed chainsaw devil state, Makima, Power, Aki Hayakawa, and the adorable Pochita, these backgrounds bring a unique aesthetic to your device.
      
      Browse through vibrant artistic designs, dark moody wallpapers, and action-packed battle sequences. Find the perfect high-quality backdrop for your gaming PC or lock screen, optimized for maximum detail.
    `,
    'top-gear-5-wallpapers': `
      Celebrate the peak of Monkey D. Luffy's power with our Top Gear 5 wallpapers collection. Dedicated entirely to Luffy's legendary Gear 5 transformation (Sun God Nika) from One Piece, these high-resolution 4K and HD backgrounds showcase the comical, free-spirited, and god-like awakened state of the future Pirate King.
      
      Download uncompressed wallpapers featuring Luffy's white hair, glowing eyes, and cartoonish battle actions. Perfect for fans looking to bring the absolute peak of anime hype to their desktop and mobile screens.
    `
  };
  
  const text = intros[slug] || `
    Browse our hand-curated collection of premium ${name} wallpapers. This collection features high-quality HD and 4K UHD backgrounds designed to make your device's screen look stunning and unique.
    
    All wallpapers in this vault are available for free download, optimized for desktop monitors, laptops, and mobile screens. Personalize your setup and find your next favorite background today.
  `;
  
  return text.trim().split('\n\n').map(para => `<p class="coll-desc" style="margin-bottom: 1.2rem; text-align: left; max-width: 750px; margin-left: auto; margin-right: auto;">${para.trim()}</p>`).join('');
}



// Helper to get 600-1000+ word structured landing guides for Collection Hubs
function getCollectionGuideHtml(slug, name) {
  const guides = {
    'solo-leveling-4k-wallpapers': `
      <div class="coll-guide-container" style="max-width: 900px; margin: 3.5rem auto 0; text-align: left; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; line-height: 1.8; color: var(--mid); font-family: 'Inter', sans-serif;">
        <h2 style="font-family: 'Orbitron', sans-serif; color: var(--gold); font-size: 1.3rem; margin-top: 0; text-transform: uppercase; letter-spacing: 0.05em;">Solo Leveling 4K Wallpapers & Shadow Monarch Vault</h2>
        <p>Step into the dark fantasy realm of Chugong's global webtoon and anime sensation, <strong>Solo Leveling</strong>. Follow the journey of <strong>Sung Jinwoo</strong>, who evolves from humanity's weakest E-Rank hunter into the invincible <strong>Shadow Monarch (Ashborn's successor)</strong>. Our hand-curated catalog offers uncompressed, high-definition 4K desktop backgrounds and vertical AMOLED phone lock screens designed to showcase the epic visual style of Redice Studio and A-1 Pictures.</p>
        
        <h3 style="font-family: 'Orbitron', sans-serif; color: var(--bright); font-size: 1.1rem; margin-top: 2rem; text-transform: uppercase;">Featured Characters & Iconic Shadow Army Forms</h3>
        <p>Explore high-contrast, ultra-sharp artwork highlighting the key characters and summoned shadows from the series:</p>
        <ul style="padding-left: 1.2rem; margin-bottom: 1.5rem;">
          <li><strong style="color: var(--bright);">Sung Jinwoo (Shadow Monarch):</strong> Wielding the Demon King's Daggers and Dagger of Kasaka, surrounded by deep blue and purple monarch energy.</li>
          <li><strong style="color: var(--bright);">Igris (Red-Blood Commander):</strong> The loyal crimson knight equipped with the Demon King's Longsword, featured in dramatic dark armor poses.</li>
          <li><strong style="color: var(--bright);">Beru (Ant King):</strong> The terrifying S-Rank shadow commander known for lightning-fast combat speed and formidable aura.</li>
          <li><strong style="color: var(--bright);">Cha Hae-In & S-Rank Hunters:</strong> Stunning portrait wallpapers of Korea's top hunters, including Thomas Andre, Choi Jong-In, and Baek Yoonho.</li>
          <li><strong style="color: var(--bright);">Ashborn & Shadow Army Swarms:</strong> Cinematic ultrawide wallpapers capturing Jinwoo commanding thousands of shadow soldiers with the iconic <em>"Arise"</em> command.</li>
        </ul>

        <h3 style="font-family: 'Orbitron', sans-serif; color: var(--bright); font-size: 1.1rem; margin-top: 2rem; text-transform: uppercase;">AMOLED Dark Mode & Display Optimization</h3>
        <p>All Solo Leveling wallpapers in this collection feature deep black background tones (<code style="color: var(--gold);">#050508</code>), making them ideal for OLED and AMOLED displays (iPhone Pro Super Retina XDR, Samsung Galaxy Ultra Dynamic AMOLED, and 4K Gaming Monitors). Dark background pixels turn off completely on OLED screens, which conserves device battery life while emphasizing glowing purple and neon blue energy particle effects.</p>

        <h3 style="font-family: 'Orbitron', sans-serif; color: var(--bright); font-size: 1.1rem; margin-top: 2rem; text-transform: uppercase;">Frequently Asked Questions (FAQ)</h3>
        <div class="faq-block" style="margin-top: 1rem;">
          <div style="margin-bottom: 1.2rem;">
            <strong style="color: var(--gold); display: block; font-size: 0.95rem;">Q: Are these Solo Leveling wallpapers free to download in original 4K resolution?</strong>
            <span>Yes! Every wallpaper is 100% free to download in uncompressed 4K UHD (3840x2160) for PC/laptops and 1080x1920 / 1440x3200 vertical formats for mobile devices.</span>
          </div>
          <div style="margin-bottom: 1.2rem;">
            <strong style="color: var(--gold); display: block; font-size: 0.95rem;">Q: How do I set a dark Solo Leveling wallpaper on iPhone or Android?</strong>
            <span>Download your chosen wallpaper, open your device photo gallery, tap "Set as Wallpaper / Lockscreen", and adjust the zoom to center Sung Jinwoo or your favorite Shadow Commander.</span>
          </div>
          <div>
            <strong style="color: var(--gold); display: block; font-size: 0.95rem;">Q: How often is this collection updated with new anime stills?</strong>
            <span>Our vault is updated weekly with high-resolution artwork, official key visuals, and fan-art renders as new episodes and manwa chapters drop.</span>
          </div>
        </div>
      </div>
    `,
    'one-piece-4k-wallpapers': `
      <div class="coll-guide-container" style="max-width: 900px; margin: 3.5rem auto 0; text-align: left; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; line-height: 1.8; color: var(--mid); font-family: 'Inter', sans-serif;">
        <h2 style="font-family: 'Orbitron', sans-serif; color: var(--gold); font-size: 1.3rem; margin-top: 0; text-transform: uppercase; letter-spacing: 0.05em;">One Piece 4K Wallpapers & Straw Hat Pirates Collection</h2>
        <p>Embark on the Grand Line with Eiichiro Oda's timeless masterpiece, <strong>One Piece</strong>. Experience the journey of <strong>Monkey D. Luffy</strong> and the Straw Hat Crew as they battle Emperors of the Sea, World Government Admirals, and rival pirate captains to discover the legendary Treasure of Joy Boy. Our collection brings together high-definition 4K desktop wallpapers and vibrant mobile lockscreen backgrounds spanning iconic arcs like Wano Country, Marineford, Dressrosa, and Egghead Island.</p>

        <h3 style="font-family: 'Orbitron', sans-serif; color: var(--bright); font-size: 1.1rem; margin-top: 2rem; text-transform: uppercase;">Featured Straw Hats & Legendary Emperors</h3>
        <p>Discover high-resolution artwork of the world's most powerful pirates:</p>
        <ul style="padding-left: 1.2rem; margin-bottom: 1.5rem;">
          <li><strong style="color: var(--bright);">Luffy (Gear 5 Sun God Nika):</strong> White hair, glowing eyes, and cartoonish Battle Aura during his legendary confrontation against Kaido.</li>
          <li><strong style="color: var(--bright);">Roronoa Zoro (King of Hell):</strong> Three-Sword Style (Santoryu) master wielding Enma, Wado Ichimonji, and Sandai Kitetsu infused with Advanced Conqueror's Haki.</li>
          <li><strong style="color: var(--bright);">Vinsmoke Sanji (Ifrit Jambe):</strong> Blue flame leg strike wallpapers showcasing speed and stealth in Germa 66 suit transformations.</li>
          <li><strong style="color: var(--bright);">Red-Haired Shanks & Four Emperors:</strong> Epic wallpapers featuring Shanks, Trafalgar Law, Eustass Kid, Gol D. Roger, and Edward Newgate (Whitebeard).</li>
        </ul>

        <h3 style="font-family: 'Orbitron', sans-serif; color: var(--bright); font-size: 1.1rem; margin-top: 2rem; text-transform: uppercase;">Wano Woodblock Aesthetics & Ultrawide Resolutions</h3>
        <p>Whether you prefer traditional Japanese ukiyo-e woodblock art styles from the Wano Arc or clean dark minimalist AMOLED backgrounds, every image in our vault is rendered in native 3840x2160 4K UHD for dual monitors, laptops, and mobile screens.</p>

        <h3 style="font-family: 'Orbitron', sans-serif; color: var(--bright); font-size: 1.1rem; margin-top: 2rem; text-transform: uppercase;">Frequently Asked Questions (FAQ)</h3>
        <div class="faq-block" style="margin-top: 1rem;">
          <div style="margin-bottom: 1.2rem;">
            <strong style="color: var(--gold); display: block; font-size: 0.95rem;">Q: Do you have Luffy Gear 5 wallpapers in full 4K?</strong>
            <span>Yes, we offer multiple Gear 5 (Sun God Nika) wallpapers featuring Luffy's white awakened form in uncompressed 4K resolution.</span>
          </div>
          <div>
            <strong style="color: var(--gold); display: block; font-size: 0.95rem;">Q: Can I use these One Piece wallpapers for mobile and PC?</strong>
            <span>Absolutely. Each wallpaper is formatted to fit both desktop monitors (16:9 4K) and smartphone displays (9:16 vertical).</span>
          </div>
        </div>
      </div>
    `,
    'demon-slayer-4k-collection': `
      <div class="coll-guide-container" style="max-width: 900px; margin: 3.5rem auto 0; text-align: left; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; line-height: 1.8; color: var(--mid); font-family: 'Inter', sans-serif;">
        <h2 style="font-family: 'Orbitron', sans-serif; color: var(--gold); font-size: 1.3rem; margin-top: 0; text-transform: uppercase; letter-spacing: 0.05em;">Demon Slayer 4K Wallpapers - Hashira & Demon Corps Vault</h2>
        <p>Immerse yourself in Ufotable's breathtaking animation with our official <strong>Demon Slayer (Kimetsu no Yaiba)</strong> 4K wallpaper collection. Set in Taisho-era Japan, follow <strong>Tanjiro Kamado</strong> and the Hashira as they battle Muzan Kibutsuji and the Twelve Kizuki. Enjoy crystal-clear 4K wallpapers showcasing water breathing, sun breathing, and flame breathing effects in uncompressed detail.</p>

        <h3 style="font-family: 'Orbitron', sans-serif; color: var(--bright); font-size: 1.1rem; margin-top: 2rem; text-transform: uppercase;">Breath Techniques & Character Roster</h3>
        <ul style="padding-left: 1.2rem; margin-bottom: 1.5rem;">
          <li><strong style="color: var(--bright);">Tanjiro & Nezuko Kamado:</strong> Sun Breathing (Hinokami Kagura) slash effects and Nezuko's awakened demon form.</li>
          <li><strong style="color: var(--bright);">Zenitsu & Inosuke:</strong> Thunder Breathing 1st Form (Thunderclap and Flash) and Beast Breathing dual serrated katana art.</li>
          <li><strong style="color: var(--bright);">The 9 Hashira:</strong> Kyojuro Rengoku (Flame Hashira), Giyu Tomioka (Water Hashira), Tengen Uzui (Sound Hashira), and Muichiro Tokito (Mist Hashira).</li>
        </ul>

        <h3 style="font-family: 'Orbitron', sans-serif; color: var(--bright); font-size: 1.1rem; margin-top: 2rem; text-transform: uppercase;">Frequently Asked Questions (FAQ)</h3>
        <div class="faq-block" style="margin-top: 1rem;">
          <div style="margin-bottom: 1.2rem;">
            <strong style="color: var(--gold); display: block; font-size: 0.95rem;">Q: What makes Demon Slayer 4K wallpapers unique?</strong>
            <span>Ufotable's signature visual effects produce vibrant particle lighting and rich color gradients that look incredible on 4K HDR displays.</span>
          </div>
        </div>
      </div>
    `,
    'chainsawman-4k-wallpapers': `
      <div class="coll-guide-container" style="max-width: 900px; margin: 3.5rem auto 0; text-align: left; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; line-height: 1.8; color: var(--mid); font-family: 'Inter', sans-serif;">
        <h2 style="font-family: 'Orbitron', sans-serif; color: var(--gold); font-size: 1.3rem; margin-top: 0; text-transform: uppercase; letter-spacing: 0.05em;">Chainsaw Man 4K Wallpapers - Denji, Makima & Power</h2>
        <p>Enter Tatsuki Fujimoto's chaotic dark urban fantasy universe with our <strong>Chainsaw Man</strong> 4K wallpaper collection. Featuring Public Safety Devil Hunters <strong>Denji</strong>, <strong>Makima</strong>, <strong>Power</strong>, and <strong>Aki Hayakawa</strong>, these wallpapers deliver a high-contrast cyberpunk and grunge aesthetic for mobile and PC screens.</p>
        <h3 style="font-family: 'Orbitron', sans-serif; color: var(--bright); font-size: 1.1rem; margin-top: 2rem; text-transform: uppercase;">Featured Devil Hunter Forms</h3>
        <ul style="padding-left: 1.2rem; margin-bottom: 1.5rem;">
          <li><strong style="color: var(--bright);">Denji (Chainsaw Devil):</strong> Blood-splattered transformation scenes with Pochita's chainsaw cord pull.</li>
          <li><strong style="color: var(--bright);">Makima (Control Devil):</strong> Mysterious golden eye close-ups and dark minimalist suit portraits.</li>
          <li><strong style="color: var(--bright);">Power & Aki:</strong> Blood Fiend weapons and Fox Devil contract summoning artwork.</li>
        </ul>
      </div>
    `,
    'attack-on-titan-4k-wallpapers': `
      <div class="coll-guide-container" style="max-width: 900px; margin: 3.5rem auto 0; text-align: left; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; line-height: 1.8; color: var(--mid); font-family: 'Inter', sans-serif;">
        <h2 style="font-family: 'Orbitron', sans-serif; color: var(--gold); font-size: 1.3rem; margin-top: 0; text-transform: uppercase; letter-spacing: 0.05em;">Attack on Titan 4K Wallpapers - Shingeki no Kyojin Vault</h2>
        <p>Dedicate your heart with Hajime Isayama's dark fantasy epic, <strong>Attack on Titan (Shingeki no Kyojin)</strong>. Relive the battle for Paradis Island with wallpapers featuring <strong>Eren Yeager (Founding Titan)</strong>, <strong>Captain Levi Ackerman</strong>, <strong>Mikasa Ackerman</strong>, and the Scout Regiment.</p>
        <h3 style="font-family: 'Orbitron', sans-serif; color: var(--bright); font-size: 1.1rem; margin-top: 2rem; text-transform: uppercase;">Scout Regiment & Nine Titans</h3>
        <p>Includes high-resolution 4K battle stills of ODM Gear grapples, Wall Maria, The Rumbling, and Eren's Attack Titan form.</p>
      </div>
    `,
    'best-black-clover-wallpapers': `
      <div class="coll-guide-container" style="max-width: 900px; margin: 3.5rem auto 0; text-align: left; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; line-height: 1.8; color: var(--mid); font-family: 'Inter', sans-serif;">
        <h2 style="font-family: 'Orbitron', sans-serif; color: var(--gold); font-size: 1.3rem; margin-top: 0; text-transform: uppercase; letter-spacing: 0.05em;">Black Clover 4K Wallpapers - Asta & Black Bulls</h2>
        <p>Unleash your anti-magic with our <strong>Black Clover</strong> 4K wallpaper vault. Featuring <strong>Asta</strong>, <strong>Yuno Grinberryall</strong>, <strong>Noelle Silva</strong>, and Captain <strong>Yami Sukehiro</strong>, these wallpapers bring the Magic Knights of the Clover Kingdom to life in crisp 4K resolution.</p>
      </div>
    `,
    'top-gear-5-wallpapers': `
      <div class="coll-guide-container" style="max-width: 900px; margin: 3.5rem auto 0; text-align: left; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; line-height: 1.8; color: var(--mid); font-family: 'Inter', sans-serif;">
        <h2 style="font-family: 'Orbitron', sans-serif; color: var(--gold); font-size: 1.3rem; margin-top: 0; text-transform: uppercase; letter-spacing: 0.05em;">Top Gear 5 Luffy Wallpapers 4K - Sun God Nika</h2>
        <p>Celebrate the peak of Luffy's strength with our dedicated <strong>Gear 5 (Sun God Nika)</strong> 4K wallpaper collection. Featuring white hair, toon battle physics, and Drums of Liberation aura artwork optimized for dual monitors and OLED phones.</p>
      </div>
    `,
    'gojo-satoru-wallpapers': `
      <div class="coll-guide-container" style="max-width: 900px; margin: 3.5rem auto 0; text-align: left; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; line-height: 1.8; color: var(--mid); font-family: 'Inter', sans-serif;">
        <h2 style="font-family: 'Orbitron', sans-serif; color: var(--gold); font-size: 1.3rem; margin-top: 0; text-transform: uppercase; letter-spacing: 0.05em;">Gojo Satoru 4K Wallpapers - Jujutsu Kaisen Six Eyes Vault</h2>
        <p>Experience the power of the strongest Jujutsu Sorcerer with <strong>Gojo Satoru</strong> 4K wallpapers. Highlighting Six Eyes, Limitless, and Domain Expansion: Unlimited Void visuals with deep blue eye lighting and AMOLED dark mode backgrounds.</p>
      </div>
    `
  };

  return guides[slug] || `
    <div class="coll-guide-container" style="max-width: 900px; margin: 3.5rem auto 0; text-align: left; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; line-height: 1.8; color: var(--mid); font-family: 'Inter', sans-serif;">
      <h2 style="font-family: 'Orbitron', sans-serif; color: var(--gold); font-size: 1.3rem; margin-top: 0; text-transform: uppercase; letter-spacing: 0.05em;">${name} Premium 4K Wallpapers Vault</h2>
      <p>Welcome to our hand-curated ${name} wallpaper collection. Browse uncompressed 4K desktop wallpapers and vertical mobile backgrounds formatted for all modern displays.</p>
    </div>
  `;
}

// Helper to get structured FAQPage schema
function getCollectionFaqSchema(slug, name) {
  const faqs = {
    'solo-leveling-4k-wallpapers': [
      { q: "Are these Solo Leveling wallpapers free to download in original 4K resolution?", a: "Yes, every wallpaper is 100% free to download in uncompressed 4K UHD (3840x2160) for PC/laptops and vertical formats for mobile devices." },
      { q: "How do I set a dark Solo Leveling wallpaper on iPhone or Android?", a: "Download your chosen wallpaper, open your device photo gallery, tap 'Set as Wallpaper', and center Sung Jinwoo or your favorite Shadow Commander." },
      { q: "How often is this collection updated?", a: "Our vault is updated weekly with high-resolution artwork, official key visuals, and fan-art renders." }
    ],
    'one-piece-4k-wallpapers': [
      { q: "Do you have Luffy Gear 5 wallpapers in full 4K?", a: "Yes, we offer multiple Gear 5 (Sun God Nika) wallpapers featuring Luffy's white awakened form in uncompressed 4K resolution." },
      { q: "Can I use these One Piece wallpapers for mobile and PC?", a: "Absolutely. Each wallpaper is formatted to fit both desktop monitors (16:9 4K) and smartphone displays (9:16 vertical)." }
    ]
  };

  const items = faqs[slug] || [
    { q: `Are these ${name} wallpapers free to download?`, a: "Yes, all wallpapers in our vault are available for free download in high resolution." },
    { q: `What resolutions are available for ${name} wallpapers?`, a: "Wallpapers are available in 4K UHD (3840x2160) for desktop monitors and 1080x1920 for mobile phones." }
  ];

  return {
    "@type": "FAQPage",
    "mainEntity": items.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  };
}


const multer     = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const cors       = require('cors');
const path       = require('path');
const Wallpaper  = require('./model');
const Settings   = require('./settingsModel');
const Collection = require('./collectionModel');
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
// Canonical Domain Redirect (Render .onrender.com to custom domain)
app.use((req, res, next) => {
  const host = req.get('host');
  if (host && host.includes('onrender.com')) {
    const targetDomain = process.env.BASE_URL || 'https://waynelab.studio';
    try {
      const targetHost = new URL(targetDomain).host;
      if (host !== targetHost) {
        return res.redirect(301, `${targetDomain.replace(/\/+$/, '')}${req.originalUrl}`);
      }
    } catch(e) {}
  }
  next();
});

// Homepage Server-Side Rendering (SSR) for Google rich image search snippets
app.get('/', async (req, res) => {
  try {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    // Query wallpapers with pagination support
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 24;
    const skip = (page - 1) * limit;
    const walls = await Wallpaper.find({}).sort({ uploadedAt: -1 }).skip(skip).limit(limit);
    const totalWalls = await Wallpaper.countDocuments({});
    const pages = Math.ceil(totalWalls / limit);
    
    // Query featured collections for SSR
    let collectionsHtml = '';
    const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    
    try {
      const colls = await Collection.find({}).sort({ createdAt: -1 }).lean();
      for (let c of colls) {
        if (c.coverImage && c.coverImage.trim()) {
          c.previewImage = (c.coverImage.includes('/upload/'))
            ? c.coverImage.replace('/upload/', '/upload/w_500,q_auto,f_auto/')
            : c.coverImage.trim();
        } else {
          const regex = new RegExp(c.keyword, 'i');
          const wall = await Wallpaper.findOne({
            $or: [
              { title: regex },
              { category: regex },
              { tags: regex }
            ]
          }, 'directLink filename');
          if (wall) {
            c.previewImage = (wall.directLink && wall.directLink.includes('/upload/')) 
              ? wall.directLink.replace('/upload/', '/upload/w_500,q_auto,f_auto/') 
              : (wall.directLink || '');
          } else {
            c.previewImage = '/favicon.svg';
          }
        }
      }
      
      if (colls.length > 0) {
        collectionsHtml = colls.map((c, index) => {
          const loadAttr = index < 4 ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"';
          return `
          <a class="collection-showcase-card" href="/collection/${c.slug}">
            <img class="collection-showcase-bg" src="${c.previewImage}" alt="${esc(c.name)} Cover" ${loadAttr}>
            <div class="collection-showcase-content">
              <h3 class="collection-showcase-title">${esc(c.name)}</h3>
              <span class="collection-showcase-meta">Explore Collection →</span>
            </div>
          </a>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Failed to pre-render collections showcase', err);
    }

    let gridHtml = '';
    walls.forEach((w, i) => {
      const pageLink = `/w/` + getWallpaperSlug(w);
      const thumbUrl = (w.directLink && w.directLink.includes('/upload/')) 
        ? w.directLink.replace('/upload/', '/upload/w_600,q_auto,f_auto/') 
        : (w.directLink || '');

      let aspectStyle = '';
      if (w.resolution && w.resolution.includes('x')) {
        const [width, height] = w.resolution.split('x');
        if (width && height && !isNaN(width) && !isNaN(height)) {
          aspectStyle = `style="aspect-ratio: ${width} / ${height}; width: 100%; height: auto;"`;
        }
      }

      const isAboveFold = i < 4;
      const loadAttr = isAboveFold ? 'fetchpriority="high"' : 'loading="lazy"';

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

      // Determine aspect ratio class dynamically
      let isPortrait = false;
      if (w.resolution && w.resolution.includes('x')) {
        const [width, height] = w.resolution.split('x').map(Number);
        if (!isNaN(width) && !isNaN(height) && height > width) {
          isPortrait = true;
        }
      }
      const tagsStr = (Array.isArray(w.tags) ? w.tags : [w.tags]).join(' ').toLowerCase();
      if (tagsStr.includes('mobile') || tagsStr.includes('phone') || tagsStr.includes('portrait')) {
        isPortrait = true;
      }
      if (w.resolution && w.resolution.includes('x')) {
        const [width, height] = w.resolution.split('x').map(Number);
        if (!isNaN(width) && !isNaN(height) && width >= height) {
          isPortrait = false;
        }
      }
      
      gridHtml += `
      <a class="wall-card ${isPortrait ? 'portrait-card' : 'landscape-card'}" href="${pageLink}">
        <div class="wall-card-media-wrap">
          <div class="blurred-bg" style="background-image: url('${esc(thumbUrl)}')"></div>
          <img src="${esc(thumbUrl)}" alt="${esc(w.title)} High Quality Wallpaper" ${loadAttr} ${aspectStyle}
            onerror="this.style.opacity='0.3'" class="loading"
            onload="this.classList.remove('loading'); if(this.naturalHeight > this.naturalWidth) { this.closest('.wall-card').classList.add('portrait-card'); this.closest('.wall-card').classList.remove('landscape-card'); }">
        </div>
        ${w.tags && w.tags.length ? `<div class="card-badge">${esc(w.tags[0])}</div>` : ''}
        ${w.isPaid ? `<div class="card-badge" style="top:auto;bottom:8px;right:8px;background:rgba(201,168,76,0.9);color:#0A0A0F;border:none;">Premium ${w.price}</div>` : ''}
        <div class="card-info-footer">
          <span class="card-info-title">${esc(cleanTitle)}</span>
          <div class="card-tag-row">${badgesHtml}</div>
        </div>
      </a>
      `;
    });

    html = html.replace(/<div class="wall-grid" id="wallGrid">[\s\S]*?<\/div>/, `<div class="wall-grid" id="wallGrid">${gridHtml}</div>`);
    html = html.replace(/<div class="collections-showcase-grid" id="collectionsShowcaseGrid">[\s\S]*?<\/div>/, `<div class="collections-showcase-grid" id="collectionsShowcaseGrid">${collectionsHtml}</div>`);
    html = html.replace('id="collectionsShowcaseSection" style="display:none;', `id="collectionsShowcaseSection" style="${collectionsHtml ? 'display:block;' : 'display:none;'}`);

    const itemListElement = walls.map((w, index) => {
      const pageUrl = `${BASE_URL}/w/` + getWallpaperSlug(w);
      const thumbUrl = (w.directLink && w.directLink.includes('/upload/')) 
        ? w.directLink.replace('/upload/', '/upload/w_600,q_auto,f_auto/') 
        : (w.directLink || '');
      return {
        "@type": "ListItem",
        "position": index + 1,
        "url": pageUrl,
        "name": w.title,
        "image": thumbUrl
      };
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "numberOfItems": walls.length,
      "itemListElement": itemListElement
    };

    const schemaScript = `
      <script type="application/ld+json">
      ${JSON.stringify(structuredData, null, 2)}
      </script>
    `;

    const verificationTag = process.env.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${process.env.GOOGLE_SITE_VERIFICATION}" />\n` : '';
    
    // Dynamically inject optimized og:image for search engine snippet preview
    const ogImageUrl = walls.length > 0 ? (walls[0].directLink || '') : '';
    let ogImageTags = '';
    if (ogImageUrl) {
      const previewOg = ogImageUrl.includes('/upload/') 
        ? ogImageUrl.replace('/upload/', '/upload/w_1200,h_630,c_fill,q_auto,f_auto/') 
        : ogImageUrl;
      ogImageTags = `
      <meta property="og:image" content="${esc(previewOg)}">
      <meta name="twitter:image" content="${esc(previewOg)}">
      <link rel="image_src" href="${esc(previewOg)}">\n`;
    }
    
    // Pre-render pagination HTML for crawler discovery
    let paginationHtml = '';
    if (pages > 1) {
      if (page > 1) paginationHtml += `<a href="/?page=${page-1}" class="page-btn">Prev</a>`;
      for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i-page) <= 2) {
          paginationHtml += `<a href="/?page=${i}" class="page-btn ${i===page?'active':''}">${i}</a>`;
        } else if (Math.abs(i-page) === 3) {
          paginationHtml += `<span style="color:var(--dim);padding:0 .3rem">...</span>`;
        }
      }
      if (page < pages) paginationHtml += `<a href="/?page=${page+1}" class="page-btn">Next</a>`;
    }
    html = html.replace('<div class="pagination" id="pagination"></div>', `<div class="pagination" id="pagination">${paginationHtml}</div>`);

    // Clean up head injection typo 's' and replace head
    html = html.replace('</head>', `${verificationTag}${ogImageTags}${schemaScript}\n</head>`);
    res.send(html);
  } catch (err) {
    console.error('Error rendering homepage SSR:', err);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

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

// Helper to get a guaranteed non-empty slug for wallpaper links to prevent broken '/w/' URLs
function getWallpaperSlug(w) {
  if (!w) return '';
  const slugStr = String(w.slug || '').trim();
  if (slugStr) return slugStr;
  const filenameStr = String(w.filename || '').trim();
  if (filenameStr) {
    const base = filenameStr.replace('waynelab/', '').split('/').pop();
    if (base && base.trim()) return base.trim();
  }
  return w._id ? w._id.toString() : '';
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

    // MIGRATION: Seed initial default collections if empty
    try {
      const collCount = await Collection.countDocuments();
      if (collCount === 0) {
        console.log('Seeding initial collections into database...');
        await Collection.create([
          {
            name: 'One Piece Gear 5 Collection',
            slug: 'top-gear-5-wallpapers',
            keyword: 'gear\\s*5|luffy',
            description: 'Gear 5 is the peak form of Luffy\'s abilities, representing the pinnacle of anti-hero power and legendary rubber freedom. This curated Gear 5 4K collection offers premium high-resolution wallpapers showing Luffy in his divine sun god Nika state, bathed in white-heat flames and signature laughter. Each image has been color-graded and sharpened for stunning high-contrast desktop and mobile setups.',
            metaTitle: 'One Piece Gear 5 4K Wallpapers Collection'
          },
          {
            name: 'Best Black Clover Wallpapers',
            slug: 'best-black-clover-wallpapers',
            keyword: 'black\\s*clover|asta|yami',
            description: 'Black Clover follows the journey of Asta, a magicless boy in a world where magic is everything, who gains the power of Anti-Magic through a five-leaf clover grimoire. This curated collection brings together the absolute best Black Clover and Asta wallpapers in 4K UHD and HD resolutions. From Asta\'s intense devil-union forms to dramatic battle sequences and grimoire designs, each image has been carefully color-graded and sharpened to bring out the grim, high-energy aesthetic of the Magic Knights. Enhance your mobile screens and desktop setups with these premium backgrounds showcasing the determination and raw power of the Black Bulls\' anti-magic hero.',
            metaTitle: 'Best Black Clover & Asta 4K Wallpapers Collection'
          },
          {
            name: 'Demon Slayer 4K Collection',
            slug: 'demon-slayer-4k-collection',
            keyword: 'demon\\s*slayer|rengoku|tanjiro|kokushibo|zenitsu|akaza',
            description: 'Demon Slayer (Kimetsu no Yaiba) is celebrated for its breathtaking animation, vibrant color palettes, and intense swordsmanship. This curated Demon Slayer 4K collection offers premium high-resolution wallpapers featuring Tanjiro Kamado, the Flame Hashira Kyojuro Rengoku, and other iconic characters. Every wallpaper in this collection has been optimized for deep contrast and color balance, highlighting the gorgeous breathing style effects—from Rengoku\'s roaring flames to Tanjiro\'s water and sun breathing flows. Perfect for mobile lockscreens and high-refresh-rate desktop displays, this collection brings the cinematic art of Ufotable directly to your devices for free.',
            metaTitle: 'Demon Slayer 4K Wallpapers Collection'
          }
        ]);
        console.log('Seeded collections successfully.');
      }
    } catch(e) { console.error('Collections seeding migration failed:', e); }
    
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

// ─── COLLECTIONS API ──────────────────────
app.get('/api/collections', async (req, res) => {
  try {
    const colls = await Collection.find({}).sort({ createdAt: -1 }).lean();
    for (let c of colls) {
      if (c.coverImage && c.coverImage.trim()) {
        c.previewImage = (c.coverImage.includes('/upload/'))
          ? c.coverImage.replace('/upload/', '/upload/w_500,q_auto,f_auto/')
          : c.coverImage.trim();
      } else {
        const regex = new RegExp(c.keyword, 'i');
        const wall = await Wallpaper.findOne({
          $or: [
            { title: regex },
            { category: regex },
            { tags: regex }
          ]
        }, 'directLink filename');
        if (wall) {
          c.previewImage = (wall.directLink && wall.directLink.includes('/upload/')) 
            ? wall.directLink.replace('/upload/', '/upload/w_500,q_auto,f_auto/') 
            : (wall.directLink || '');
        } else {
          c.previewImage = '/favicon.svg';
        }
      }
    }
    res.json(colls);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/collections', adminOnly, async (req, res) => {
  try {
    const { name, slug, keyword, description, metaTitle } = req.body;
    if (!name || !slug || !keyword) {
      return res.status(400).json({ error: 'name, slug, and keyword are required' });
    }
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
    const existing = await Collection.findOne({ slug: cleanSlug });
    if (existing) return res.status(400).json({ error: 'Collection with this slug already exists' });

    const c = await Collection.create({
      name: name.trim(),
      slug: cleanSlug,
      keyword: keyword.trim(),
      description: (description || '').trim(),
      metaTitle: (metaTitle || '').trim(),
      coverImage: (req.body.coverImage || '').trim()
    });
    try {
      submitToIndexNow(`/collection/${cleanSlug}`);
    } catch(e) { console.error('IndexNow collection trigger error:', e.message); }
    res.status(201).json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/collections/:id', adminOnly, async (req, res) => {
  try {
    const allowed = ['name', 'slug', 'keyword', 'description', 'metaTitle', 'coverImage'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    
    if (update.slug) {
      update.slug = update.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
      const existing = await Collection.findOne({ slug: update.slug, _id: { $ne: req.params.id } });
      if (existing) return res.status(400).json({ error: 'Collection with this slug already exists' });
    }

    const c = await Collection.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!c) return res.status(404).json({ error: 'Collection not found' });
    try {
      submitToIndexNow(`/collection/${c.slug}`);
    } catch(e) { console.error('IndexNow collection trigger error:', e.message); }
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/collections/:id', adminOnly, async (req, res) => {
  try {
    const c = await Collection.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ error: 'Collection not found' });
    res.json({ deleted: true });
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

app.post('/api/wallpapers/:id/pin', adminOnly, async (req, res) => {
  try {
    const w = await Wallpaper.findById(req.params.id);
    if (!w) return res.status(404).json({ error: 'Wallpaper not found' });
    
    const settings = await Settings.findOne();
    if (!settings) return res.status(400).json({ error: 'Settings not configured' });
    
    const result = await postToPinterest(w, settings);
    if (result && result.success) {
      res.json({ success: true, message: 'Successfully pinned to Pinterest' });
    } else {
      res.status(500).json({ error: result ? result.error : 'Pinterest integration failed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SERVE INDIVIDUAL WALLPAPER PAGE ──────────────────────
app.get('/w/:slugOrId', async (req, res) => {
  try {
    const slugOrId = req.params.slugOrId;
    const queryConditions = [
      { slug: slugOrId },
      { filename: `waynelab/${slugOrId}` }
    ];
    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      queryConditions.push({ _id: new mongoose.Types.ObjectId(slugOrId) });
    }
    const w = await Wallpaper.findOne({ $or: queryConditions });
    
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

    // Find similar wallpapers (collection-aware suggestions)
    let categoryArr = Array.isArray(w.category) ? w.category : [w.category];
    categoryArr = categoryArr.filter(Boolean);

    let suggestionWalls = [];
    let suggestionTitle = 'Similar Wallpapers';
    
    try {
      const collections = await Collection.find({});
      let matchedCollection = null;
      
      for (const col of collections) {
        const regex = new RegExp(col.keyword, 'i');
        const matches = regex.test(w.title) || 
                        (Array.isArray(w.category) ? w.category.some(c => regex.test(c)) : regex.test(w.category)) ||
                        (Array.isArray(w.tags) && w.tags.some(t => regex.test(t)));
        if (matches) {
          matchedCollection = col;
          break;
        }
      }
      
      if (matchedCollection) {
        suggestionTitle = `${matchedCollection.name} Wallpapers`;
        const regex = new RegExp(matchedCollection.keyword, 'i');
        suggestionWalls = await Wallpaper.find({
          _id: { $ne: w._id },
          $or: [
            { title: regex },
            { category: regex },
            { tags: regex }
          ]
        }).limit(8).sort({ uploadedAt: -1 });
      }
    } catch (err) {
      console.error('Failed to find matching collection for suggestions', err);
    }
    
    if (!suggestionWalls.length) {
      suggestionWalls = await Wallpaper.find({
        _id: { $ne: w._id },
        category: { $in: categoryArr }
      }).limit(8).sort({ uploadedAt: -1 });
      suggestionTitle = 'Similar Wallpapers';
    }

    const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    let similarHtml = '';
    if (suggestionWalls.length > 0) {
      const feedHtml = renderServerGrid(suggestionWalls, esc);
      similarHtml = `
        <h2 style="font-family:'Orbitron',sans-serif;font-size:1.2rem;color:var(--gold);margin:3rem 0 1.5rem;letter-spacing:.1em;border-bottom:1px solid var(--border);padding-bottom:.8rem;">${esc(suggestionTitle)}</h2>
        <div class="coll-feed-container">
          ${feedHtml}
        </div>
      `;
    }
    const cleanTitle = w.title.replace(/\s+/g, '_');

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        ${process.env.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${process.env.GOOGLE_SITE_VERIFICATION}" />` : ''}
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
          "@graph": [
            {
              "@type": "ImageObject",
              "name": "${esc(w.title)}",
              "caption": "${esc(w.title)} High Quality Wallpaper",
              "contentUrl": "${esc(w.directLink)}",
              "thumbnailUrl": "${esc(w.directLink)}",
              "url": "${BASE_URL}/w/${encodeURIComponent(w.slug || slugOrId)}"
            },
            {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Vault",
                  "item": "${BASE_URL}/"
                },
                ${(Array.isArray(w.category) && w.category.length > 0) ? `
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "${esc(w.category[0].charAt(0).toUpperCase() + w.category[0].slice(1))}",
                  "item": "${BASE_URL}/?page=1"
                },
                ` : ''}
                {
                  "@type": "ListItem",
                  "position": ${(Array.isArray(w.category) && w.category.length > 0) ? 3 : 2},
                  "name": "${esc(w.title)}",
                  "item": "${BASE_URL}/w/${encodeURIComponent(w.slug || slugOrId)}"
                }
              ]
            }
          ]
        }
        </script>
        <style>
          .wp-container { max-width: 1200px; margin: 0 auto; padding: 2.5rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 2.5rem; }
          .wp-img-wrap { width: 100%; max-width: 900px; text-align: center; }
          .wp-img-wrap img { width: 100%; max-height: 85vh; object-fit: contain; border-radius: var(--radius); border: 1px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.12); }
          .wp-card-details { width: 100%; max-width: 650px; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
          .wp-title { font-family: 'Orbitron', sans-serif; font-size: 1.5rem; color: var(--gold); letter-spacing: .08em; margin-bottom: .8rem; text-transform: uppercase; }
          .wp-meta { font-size: .8rem; color: var(--dim); margin: 1.2rem 0; display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; }
          .wp-meta span { color: var(--mid); }
          .wp-cta-section { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; align-items: center; width: 100%; }
          .wp-btn-main { width: 100%; max-width: 450px; font-family: 'Orbitron', sans-serif; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; padding: 1.1rem; background: linear-gradient(135deg, var(--gold-d) 0%, var(--gold) 100%); color: var(--bg); border: none; border-radius: 30px; cursor: pointer; box-shadow: 0 5px 20px rgba(37, 99, 235, 0.2); transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
          .wp-btn-main:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(201, 168, 76, 0.45); filter: brightness(1.05); }
          .wp-btn-main:active { transform: translateY(0); }
          .wp-res-row { width: 100%; max-width: 450px; display: flex; align-items: center; justify-content: center; gap: 0.8rem; margin-top: 0.5rem; }
          .wp-res-label { font-size: 0.75rem; color: var(--dim); white-space: nowrap; text-transform: uppercase; letter-spacing: 0.08em; }
          .wp-res-select { flex: 1; max-width: 280px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; color: var(--bright); font-size: 0.85rem; padding: 0.5rem; outline: none; cursor: pointer; }
          .wp-res-select:focus { border-color: var(--gold); }
          .cat-tag { display: inline-block; font-size: .7rem; padding: .3rem .8rem; background: rgba(37,99,235,0.06); border: 1px solid var(--border); border-radius: 20px; color: var(--gold); text-transform: capitalize; margin: 0 4px 4px 0; }
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
                
<!-- Description section removed -->
                <p class="wp-description" style="font-size: 0.9rem; line-height: 1.6; color: var(--dim); max-width: 600px; margin: 1.5rem auto 0; text-align: center;">
                  Download the uncompressed <strong>${esc(w.title)}</strong> wallpaper for free. This high-quality artwork is available in <strong>${esc(w.resolution || '4K UHD')}</strong> resolution, perfect for customizing your ${categoryArr.length ? `<strong>${esc(categoryArr.join(', '))}</strong>` : 'desktop and mobile'} screens. Personalize your device with this stunning background today.
                </p>

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
              url = url.replace('/upload/', '/upload/w_3840,h_2160,c_pad,b_gen_fill/');
              proxyFilename += "_4K";
            } else if (res === 'laptop') {
              url = url.replace('/upload/', '/upload/w_1920,h_1080,c_pad,b_gen_fill/');
              proxyFilename += "_FHD";
            } else if (res === 'mobile') {
              url = url.replace('/upload/', '/upload/w_1080,h_1920,c_pad,b_gen_fill/');
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
    console.error('Error loading wallpaper page:', err);
    res.status(500).send('Error loading wallpaper page. Please try again later.'); 
  }
});
// ─── AMP WALLPAPER PAGE ───────────────────────────────────
app.get('/amp/w/:slugOrId', async (req, res) => {
  try {
    const isAdminReq = await isRequestAdmin(req);
    const slugOrId = req.params.slugOrId;
    const queryConditions = [
      { slug: slugOrId },
      { filename: `waynelab/${slugOrId}` }
    ];
    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      queryConditions.push({ _id: new mongoose.Types.ObjectId(slugOrId) });
    }
    const w = await Wallpaper.findOne({ $or: queryConditions });
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
          .cat-tag { display: inline-block; font-size: .75rem; padding: .2rem .6rem; background: rgba(37,99,235,0.06); border: 1px solid var(--border); border-radius: 20px; color: #C9A84C; text-transform: capitalize; margin: 0.2rem; }
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
          
          <p style="font-size: 0.9rem; line-height: 1.6; color: #7A7A9A; margin-top: 1.8rem; text-align: center; max-width: 500px; margin-left: auto; margin-right: auto;">
            Download the uncompressed <strong>${esc(w.title)}</strong> wallpaper for free. This high-quality artwork is available in <strong>${esc(w.resolution || '4K UHD')}</strong> resolution, perfect for customizing your ${(Array.isArray(w.category) && w.category.length > 0) ? `<strong>${esc(w.category.join(', '))}</strong>` : 'desktop and mobile'} screens. Personalize your device with this stunning background today.
          </p>
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
  if (!settings.pinterestAccessToken || !settings.pinterestBoardId) return { success: false, error: 'Credentials not configured' };
  try {
    // If token has expired or is expiring soon, attempt auto-refresh
    if (settings.pinterestTokenExpiresAt && new Date() >= new Date(settings.pinterestTokenExpiresAt)) {
      console.log('Pinterest token is expired/expiring. Refreshing...');
      const refreshed = await refreshPinterestToken(settings);
      if (!refreshed) {
        console.error('Skipping Pinterest upload: Failed to refresh token.');
        return { success: false, error: 'Failed to refresh Pinterest token' };
      }
    }

    // Generate watermarked preview link for Pinterest using Cloudinary transformation
    let previewLink = wall.directLink;
    if (previewLink && previewLink.includes('/upload/')) {
      // 1. Mild blur to protect the uncompressed master and drive CTR
      const blurEffect = 'e_blur:250';
      // 2. Elegant small corner watermark
      const cornerWatermark = 'co_rgb:ffffff,l_text:Arial_30:WAYNELAB.STUDIO,g_north_west,x_30,y_30,o_30';
      
      previewLink = previewLink.replace('/upload/', `/upload/${blurEffect}/${cornerWatermark}/`);
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
    let response = await fetch(baseUrl + '/v5/pins', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + settings.pinterestAccessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pinData)
    });

    if (response.status === 401) {
      console.log('Pinterest API returned 401 Unauthorized. Attempting to refresh token...');
      const refreshed = await refreshPinterestToken(settings);
      if (refreshed) {
        response = await fetch(baseUrl + '/v5/pins', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + settings.pinterestAccessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pinData)
        });
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Pinterest API failed with status ${response.status}:`, errText);
      return { success: false, error: `Pinterest API error (${response.status}): ${errText}` };
    } else {
      console.log(`Successfully posted pin to Pinterest for wallpaper: ${wall.title} (Sandbox: ${!!settings.pinterestSandbox})`);
      return { success: true };
    }
  } catch (err) {
    console.error('Failed to post to Pinterest:', err.message);
    return { success: false, error: err.message };
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
    const queryConditions = [
      { slug: slugOrId },
      { filename: `waynelab/${slugOrId}` }
    ];
    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      queryConditions.push({ _id: new mongoose.Types.ObjectId(slugOrId) });
    }
    const w = await Wallpaper.findOne({ $or: queryConditions });
    
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
app.get('/api/diagnostics/count', async (req, res) => {
  try {
    const wallCount = await Wallpaper.countDocuments();
    const collCount = await Collection.countDocuments();
    const wallsWithoutSlug = await Wallpaper.countDocuments({ slug: { $exists: false } });
    res.json({ wallCount, collCount, wallsWithoutSlug });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

// Alias for /sitemap to /sitemap.xml
app.get('/sitemap', (req, res) => res.redirect(301, '/sitemap.xml'));

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
      '/blog.html',
      '/blog/customize-homescreen-guide.html',
      '/blog/4k-resolution-mobile-wallpapers.html',
      '/blog/anime-wallpaper-trends-2026.html'
    ];
    staticRoutes.forEach(route => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}${route}</loc>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.5</priority>\n';
      xml += '  </url>\n';
    });
    
    // Dynamic collections sitemap
    try {
      const dbColls = await Collection.find({}, 'slug');
      dbColls.forEach(c => {
        xml += '  <url>\n';
        xml += `    <loc>${BASE_URL}/collection/${c.slug}</loc>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      });
    } catch(e) { console.error('Failed to append collections to sitemap', e); }
    
    const xmlEsc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    // Dynamic wallpaper routes
    walls.forEach(w => {
      xml += '  <url>\n';
      const slug = getWallpaperSlug(w);
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
async function submitToIndexNow(pathOrSlug) {
  try {
    const path = pathOrSlug.startsWith('/') ? pathOrSlug : `/w/${pathOrSlug}`;
    const pageUrl = `${BASE_URL}${path}`;
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
      console.log(`[IndexNow] Successfully submitted URL for ${pathOrSlug}`);
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
  const allTagsLower = tags.map(t => t.toLowerCase());
  const titleLower = title.toLowerCase();

  // Determine aspect ratio and device recommendation
  let deviceRec = 'desktop monitors, widescreen displays, and home office setups';
  let aspectText = 'landscape panoramic orientation';
  if (w.resolution && w.resolution.includes('x')) {
    const [width, height] = w.resolution.split('x').map(Number);
    if (!isNaN(width) && !isNaN(height) && height > width) {
      deviceRec = 'mobile devices, iPhones, Android home screens, and vertical lockscreens';
      aspectText = 'portrait layout';
    }
  }

  // Generate a hash based on the title to select variations
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  // Franchise-specific or theme-specific paragraph generation
  let customIntro = '';
  let customDetails = '';
  let customAesthetic = '';

  const onePieceWords = ['one piece', 'luffy', 'zoro', 'shanks', 'ace', 'garp', 'kuma', 'bonney', 'sanji', 'nami', 'robin', 'usopp', 'chopper', 'brook', 'franky', 'law', 'trafalgar', 'kaido', 'yamato'];
  const blackCloverWords = ['black clover', 'asta', 'yuno', 'yami', 'noelle', 'julius', 'mereoleona', 'grimoire'];
  const demonSlayerWords = ['demon slayer', 'tanjiro', 'nezuko', 'rengoku', 'zenitsu', 'inosuke', 'giyu', 'shinobu', 'akaza', 'muzan', 'kokushibo', 'tomioka', 'hashira'];
  const batmanWords = ['batman', 'joker', 'gotham', 'arkham', 'catwoman', 'batmobile', 'dark knight'];

  const isOnePiece = onePieceWords.some(w => titleLower.includes(w) || allTagsLower.includes(w));
  const isBlackClover = blackCloverWords.some(w => titleLower.includes(w) || allTagsLower.includes(w));
  const isDemonSlayer = demonSlayerWords.some(w => titleLower.includes(w) || allTagsLower.includes(w));
  const isBatman = batmanWords.some(w => titleLower.includes(w) || allTagsLower.includes(w));

  if (isOnePiece) {
    const intros = [
      `Embark on an epic visual journey to the Grand Line with this stunning digital backdrop of <strong>${cleanTitle}</strong>. Perfect for fans of the iconic pirate saga, this artwork captures the spirit of adventure and Eiichiro Oda's legendary world.`,
      `Bring the vibrant energy of the Straw Hat universe directly to your screen with this custom <strong>${cleanTitle}</strong> background. Ranging from high-action battle stances to beautiful thematic artwork, this piece stands out as a premium digital collectible.`,
      `Celebrate your love for the ultimate pirate adventure with this high-fidelity <strong>${cleanTitle}</strong> digital wallpaper. It showcases the intense color palettes, rich details, and memorable character aesthetics of the series.`
    ];
    const details = [
      `The visual features high-contrast rendering that emphasizes character contours, signature abilities (like Luffy's Gear 5 awakening or Zoro's Santoryu haki), and dynamic battle-ready poses.`,
      `The composition leverages striking color gradients and bold line work, making it particularly impressive on modern OLED and high-refresh-rate displays where the colors can truly pop.`,
      `Every detail—from the flowing energy waves of the characters to the cinematic background elements—is crisp and well-defined, providing a clean backdrop that won't clutter your app icons.`
    ];
    const aesthetics = [
      `Designed specifically for your ${deviceRec}, this premium layout fits perfectly on your screen in its original ${esc(w.resolution || '4K')} ${aspectText}.`,
      `Whether you are customizing a clean mobile lockscreen or a widescreen desktop setup, this ${aspectText} background offers an immersive high-definition viewing experience.`,
      `Complete your custom configuration with this high-quality background, optimized to preserve visual details in full ${esc(w.resolution || '4K')} resolution.`
    ];

    customIntro = intros[hash % intros.length];
    customDetails = details[(hash + 1) % details.length];
    customAesthetic = aesthetics[(hash + 2) % aesthetics.length];

  } else if (isBlackClover) {
    const intros = [
      `Enter the magic-filled kingdom of Clover with this high-energy <strong>${cleanTitle}</strong> digital art piece. The artwork captures the intense determination and raw battle presence of the characters.`,
      `Channel the unstoppable power of Anti-Magic and the Black Bulls with this premium <strong>${cleanTitle}</strong> background. It highlights the heavy-ink shadows, glowing mana details, and dark fantasy style of the series.`,
      `Elevate your display with the intense magical energy of <strong>${cleanTitle}</strong>. Ranging from legendary spells to dramatic squad imagery, this wallpaper brings the action of the Magic Knights to life.`
    ];
    const details = [
      `The layout showcases rich dark elements, anti-magic trails, and high-contrast highlights that look incredibly sleek on dark-mode setups.`,
      `The composition focuses on clean graphic design and striking silhouettes, ensuring that characters like Asta and Yuno stand out with exceptional clarity.`,
      `Featuring a detailed fantasy aesthetic, this graphic highlights the complex patterns of grimoires and glowing spell effects against a dark, dramatic background.`
    ];
    const aesthetics = [
      `Optimized to fit seamlessly on your ${deviceRec}, this wallpaper delivers a premium display in its original ${esc(w.resolution || '4K')} ${aspectText}.`,
      `Ideal for high-density smartphone screens and wide gaming setups, this ${aspectText} background provides a sharp, immersive look.`,
      `Enjoy the atmospheric Magic Knights design on your setup, available in high-definition ${esc(w.resolution || '4K')} resolution.`
    ];

    customIntro = intros[hash % intros.length];
    customDetails = details[(hash + 1) % details.length];
    customAesthetic = aesthetics[(hash + 2) % aesthetics.length];

  } else if (isDemonSlayer) {
    const intros = [
      `Experience the cinematic beauty and breathtaking animation aesthetic of the Demon Slayer Corps with this gorgeous <strong>${cleanTitle}</strong> background.`,
      `Immerse yourself in the vibrant, flame-lit world of Tanjiro, Nezuko, and the Hashira with this custom <strong>${cleanTitle}</strong> digital wallpaper.`,
      `Highlighting the iconic color schemes and dramatic swordsmanship of the series, this high-fidelity <strong>${cleanTitle}</strong> wallpaper is a must-have for fans.`
    ];
    const details = [
      `The illustration showcases flowing elemental sword strokes—from water breathing flows to blazing sun breathing trails—creating a dynamic sense of motion on your screen.`,
      `The color balance captures the gorgeous contrast between dark nights and luminous breathing techniques, ensuring the colors remain vivid under any brightness setting.`,
      `With its crisp outlines and premium digital art style, the wallpaper emphasizes the intricate haori patterns and signature Nichirin blade shapes.`
    ];
    const aesthetics = [
      `Tailored specifically for ${deviceRec}, this background displays every animated detail in crisp ${esc(w.resolution || '4K')} ${aspectText}.`,
      `Perfect for clean lockscreens or widescreen monitors, this ${aspectText} layout matches any dark or minimalist setup.`,
      `Bring the cinematic world of Ufotable's masterpiece to your display in its original ${esc(w.resolution || '4K')} resolution.`
    ];

    customIntro = intros[hash % intros.length];
    customDetails = details[(hash + 1) % details.length];
    customAesthetic = aesthetics[(hash + 2) % aesthetics.length];

  } else if (isBatman) {
    const intros = [
      `Step into the gritty, atmospheric streets of Gotham with this sleek <strong>${cleanTitle}</strong> digital background.`,
      `Embrace the shadows and the legacy of the Dark Knight with this premium <strong>${cleanTitle}</strong> digital wallpaper.`,
      `Featuring high-detail comic book artwork and city silhouettes, this <strong>${cleanTitle}</strong> wallpaper showcases the ultimate detective at his finest.`
    ];
    const details = [
      `The design utilizes high-dynamic-range (HDR) black levels, casting dramatic yellow or blue lighting highlights against the dark concrete textures of Gotham.`,
      `The composition focuses on iconic silhouettes, rain-slicked rooftops, and neon-lit skies, creating a classic, moody noir vibe for your screen.`,
      `Perfect for dark-mode setups, this wallpaper ensures that Bat-symbol outlines and cape textures are sharp, clean, and highly visible.`
    ];
    const aesthetics = [
      `Designed to complement dark-themed layouts on your ${deviceRec}, this background looks stunning in its original ${esc(w.resolution || '4K')} ${aspectText}.`,
      `Whether you are a fan of DC Comics or need a clean cyberpunk-noir aesthetic, this ${aspectText} background is optimized for all your ${deviceRec}.`,
      `Enjoy the atmospheric Gotham design on your display in full ${esc(w.resolution || '4K')} high-definition resolution.`
    ];

    customIntro = intros[hash % intros.length];
    customDetails = details[(hash + 1) % details.length];
    customAesthetic = aesthetics[(hash + 2) % aesthetics.length];

  } else {
    // General high-quality wallpapers (Anime, Gaming, Art, etc.)
    const tagsText = tags.length > 0 ? tags.slice(0, 4).map(t => esc(t)).join(', ') : '';
    const tagsPhrase = tagsText ? `featuring themes of ${tagsText}` : 'showcasing stunning design details';

    const intros = [
      `Enhance your digital setup with this curated <strong>${cleanTitle}</strong> wallpaper, ${tagsPhrase}. This beautiful background is selected specifically for ${mainCat} fans looking to add unique visual style to their screens.`,
      `Personalize your display with the premium aesthetics of <strong>${cleanTitle}</strong>, ${tagsPhrase}. Optimized for vibrant color gradients, this digital artwork elevates any theme.`,
      `Bring artistic inspiration to your everyday screen with this high-detail <strong>${cleanTitle}</strong> wallpaper, presenting a beautiful balance of color and composition ${tagsText ? `focusing on ${tagsText}` : ''}.`
    ];
    const details = [
      `The illustration showcases detailed ${mainCat} elements and rich environmental effects, making it a perfect match for personalizing your device's theme.`,
      `With its high-quality composition, the graphic highlights the immersive art style of ${mainCat} illustrations, presenting sharp details and clean outlines.`,
      `The design captures the unique visual style and character presence of the artwork, ensuring a premium backdrop that looks great behind your app icons.`
    ];
    const aesthetics = [
      `Designed to fit seamlessly on your ${deviceRec}, this high-resolution background is available in its original ${esc(w.resolution || '4K')} ${aspectText}.`,
      `Whether you are configuring a mobile lockscreen or a wide desktop monitor, this ${aspectText} layout provides a clean, premium visual aesthetic.`,
      `Complete your custom setup with this high-quality background, optimized for modern displays in its original ${esc(w.resolution || '4K')} format.`
    ];

    customIntro = intros[hash % intros.length];
    customDetails = details[(hash + 1) % details.length];
    customAesthetic = aesthetics[(hash + 2) % aesthetics.length];
  }

  return `
    <p style="margin: 0 0 1rem 0;">${customIntro} ${customDetails}</p>
    <p style="margin: 0;">${customAesthetic}</p>
  `;
}


// -------------------------------------------------------------
// CURATED COLLECTIONS RENDERERS
// -------------------------------------------------------------
function renderServerGrid(walls, esc) {
  if (!walls || !walls.length) {
    return `<div style="text-align:center; padding:3rem; color:var(--dim);"><p>No wallpapers found in this collection.</p></div>`;
  }
  return walls.map(w => {
    const safeTitle = w.title || '';
    const safeFilename = w.filename || '';
    const pageLink = '/w/' + getWallpaperSlug(w);
    const pageUrl = `${BASE_URL}${pageLink}`;
    const imgUrl = (w.directLink && w.directLink.includes('/upload/')) 
      ? w.directLink.replace('/upload/', '/upload/q_auto,f_auto/') 
      : (w.directLink || '');
    
    let coreTitle = safeTitle.split('|')[0].split(' - ')[0].split(':')[0].trim();
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

    const resolutionText = w.resolution || '4K UHD';

    // Determine aspect ratio class dynamically
    let isPortrait = false;
    if (w.resolution && w.resolution.includes('x')) {
      const [width, height] = w.resolution.split('x').map(Number);
      if (!isNaN(width) && !isNaN(height) && height > width) {
        isPortrait = true;
      }
    }
    const tagsStr = (Array.isArray(w.tags) ? w.tags : [w.tags]).join(' ').toLowerCase();
    if (tagsStr.includes('mobile') || tagsStr.includes('phone') || tagsStr.includes('portrait')) {
      isPortrait = true;
    }
    if (w.resolution && w.resolution.includes('x')) {
      const [width, height] = w.resolution.split('x').map(Number);
      if (!isNaN(width) && !isNaN(height) && width >= height) {
        isPortrait = false;
      }
    }

    return `
    <div class="coll-feed-item ${isPortrait ? 'portrait-card' : 'landscape-card'}">
      <h3 class="coll-item-title">${esc(cleanTitle)}</h3>
      <div class="coll-item-img-wrap" style="position: relative; aspect-ratio: 1.5 / 1; overflow: hidden; background: #050508; width: 100%;">
        <div class="blurred-bg" style="background-image: url('${esc(imgUrl)}'); position: absolute; inset: -15px; background-size: cover; background-position: center; filter: blur(12px) brightness(0.6); z-index: 1; display: ${isPortrait ? 'block' : 'none'};"></div>
        <img src="${esc(imgUrl)}" alt="${esc(w.title)} High Quality Wallpaper" loading="lazy" onerror="this.style.opacity='0.3'"
          style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: ${isPortrait ? 'contain' : 'cover'}; z-index: 2;"
          onload="const card = this.closest('.coll-feed-item'); if(this.naturalHeight > this.naturalWidth) { card.classList.add('portrait-card'); card.classList.remove('landscape-card'); const blur = card.querySelector('.blurred-bg'); if(blur) blur.style.display='block'; this.style.objectFit='contain'; }">
      </div>
      <div class="coll-item-footer">
        <div class="coll-item-left">
          <span class="coll-item-res-badge">${esc(resolutionText)} Wallpaper</span>
          <div class="coll-item-share-buttons">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}" target="_blank" title="Share on Facebook">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
            </a>
            <a href="https://pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}&media=${encodeURIComponent(imgUrl)}&description=${encodeURIComponent(w.title)}" target="_blank" title="Pin on Pinterest">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.627 0-12 5.373-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.993 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.204 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"/></svg>
            </a>
            <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(w.title)}" target="_blank" title="Share on Twitter">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
            </a>
          </div>
        </div>
        <a href="${pageLink}" class="coll-item-dl-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:6px;"><path d="M12 21l-8-9h6v-12h4v12h6l-8 9z"/></svg>
          Get Wallpaper
        </a>
      </div>
    </div>
    `;
  }).join('');
}

function renderCollectionPage(res, walls, title, introText, metaDesc, canonicalUrl, esc, otherColls = []) {
  const gridHtml = renderServerGrid(walls, esc);
  
  // Generate schema structured data for indexing
  const itemListElement = walls.map((w, index) => {
    const pageUrl = `${BASE_URL}/w/${getWallpaperSlug(w)}`;
    const thumbUrl = (w.directLink && w.directLink.includes('/upload/')) 
      ? w.directLink.replace('/upload/', '/upload/w_600,q_auto,f_auto/') 
      : (w.directLink || '');
    return {
      "@type": "ListItem",
      "position": index + 1,
      "url": pageUrl,
      "name": w.title,
      "image": thumbUrl
    };
  });
  
  // Determine slug from canonicalUrl
  const currentSlug = canonicalUrl.split('/collection/')[1] || '';
  const faqSchema = getCollectionFaqSchema(currentSlug, title);
  const guideHtml = getCollectionGuideHtml(currentSlug, title);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "name": title,
        "description": metaDesc,
        "url": canonicalUrl,
        "mainEntity": {
          "@type": "ItemList",
          "numberOfItems": walls.length,
          "itemListElement": itemListElement
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Vault",
            "item": `${BASE_URL}/`
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": title,
            "item": canonicalUrl
          }
        ]
      },
      faqSchema
    ]
  };

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${process.env.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${process.env.GOOGLE_SITE_VERIFICATION}" />` : ''}
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="robots" content="index, follow">
      <meta name="description" content="${esc(metaDesc)}">
      
      <!-- OpenGraph Metadata -->
      <meta property="og:title" content="${esc(title)}">
      <meta property="og:description" content="${esc(metaDesc)}">
      <meta property="og:type" content="website">
      <meta property="og:url" content="${canonicalUrl}">
      ${walls.length > 0 ? `<meta property="og:image" content="${esc(walls[0].directLink)}">` : ''}
      
      <!-- Twitter Card Metadata -->
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${esc(title)}">
      <meta name="twitter:description" content="${esc(metaDesc)}">
      ${walls.length > 0 ? `<meta name="twitter:image" content="${esc(walls[0].directLink)}">` : ''}

      <!-- JSON-LD Structured Data -->
      <script type="application/ld+json">
        ${JSON.stringify(structuredData)}
      </script>

      <title>${esc(title)} - Waynelab</title>
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
          margin: 0 0 1.2rem 0;
          background: linear-gradient(135deg, var(--gold) 30%, #fff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .coll-desc {
          font-family: 'Inter', sans-serif;
          font-size: 0.88rem;
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
            <button class="btn btn-gold" onclick="window.location.href='/'">🔙 Back to Vault</button>
          </div>
        </header>

        <main class="main" style="padding: 1.2rem 2rem 3rem;">
          <div class="coll-hero">
            <h1 class="coll-title">${esc(title)}</h1>
            <div class="coll-desc-wrap">${introText}</div>
          </div>
          <div class="coll-feed-container" style="margin-top: 2.2rem;">
            ${gridHtml}
          </div>
          
          <!-- Comprehensive Collection Landing Guide & FAQ -->
          ${guideHtml}
          
          ${(otherColls && otherColls.length > 0) ? `
          <div class="related-colls" style="margin-top: 4rem; border-top: 1px solid var(--border-light); padding-top: 2.5rem; text-align: center;">
            <h3 style="font-family: 'Orbitron', sans-serif; font-size: 1.1rem; color: var(--gold); text-transform: uppercase; margin-bottom: 1.5rem; letter-spacing: 0.08em;">Explore Other Collections</h3>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.8rem; max-width: 800px; margin: 0 auto;">
              ${otherColls.map(oc => `
                <a href="/collection/${oc.slug}" style="padding: 0.6rem 1.4rem; background: var(--bg3); border: 1px solid var(--border); border-radius: 30px; color: var(--mid); text-decoration: none; font-size: 0.85rem; font-family: 'Inter', sans-serif; transition: all 0.25s ease;" 
                   onmouseover="this.style.borderColor='var(--gold)'; this.style.color='#fff'; this.style.background='rgba(201, 168, 76, 0.05)';" 
                   onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--mid)'; this.style.background='var(--bg3)';">
                  ${esc(oc.name)}
                </a>
              `).join('')}
            </div>
          </div>
          ` : ''}
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

    const otherColls = await Collection.find({}).limit(8);

    const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    const metaDesc = `Download the best high-quality ${title} in 4K UHD and HD resolutions. Browse our hand-curated collection of premium desktop and mobile backgrounds.`;
    const canonicalUrl = `${BASE_URL}/${req.path.replace(/^\/+/, '')}`;
    
    renderCollectionPage(res, walls, title, introText, metaDesc, canonicalUrl, esc, otherColls);
  } catch (err) {
    res.status(500).send('Error loading collection page.');
  }
}

// Legacy collection redirects
app.get('/top-gear-5-wallpapers', (req, res) => res.redirect(301, '/collection/top-gear-5-wallpapers'));
app.get('/best-black-clover-wallpapers', (req, res) => res.redirect(301, '/collection/best-black-clover-wallpapers'));
app.get('/demon-slayer-4k-collection', (req, res) => res.redirect(301, '/collection/demon-slayer-4k-collection'));

// Dynamic Collection Page
app.get('/collection/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const c = await Collection.findOne({ slug });
    if (!c) {
      return res.status(404).send(`
        <body style="background:#0A0A0F;color:#7A7A9A;font-family:sans-serif;text-align:center;padding-top:100px;">
          <h1 style="color:#C9A84C;">Collection Not Found</h1>
          <p>The requested collection could not be found in our records.</p>
          <a href="/" style="color:#C9A84C;text-decoration:none;">Return to Vault</a>
        </body>
      `);
    }

    // Helper to safely escape keywords for regular expressions
    const escapeRegex = (string) => String(string || '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    // Extract core search terms (excluding generic SEO words like '4k', 'wallpapers', etc.)
    const rawKeyword = String(c.keyword || '').trim().toLowerCase();
    const cleanKeyword = rawKeyword.replace(/[-_]/g, ' ');
    const words = cleanKeyword.split(/\s+/).filter(Boolean);
    const generic = new Set(['4k', 'uhd', 'hd', 'wallpaper', 'wallpapers', 'collection', 'best', 'top', 'cool', 'background', 'backgrounds', 'theme', 'download', 'free', 'of', 'the']);
    const coreTerms = words.filter(w => !generic.has(w));
    const termsToSearch = coreTerms.length > 0 ? coreTerms : words;
    
    // Expand search terms to handle typos, splits, and spaces (e.g. chainsawman vs chainsaw man vs chinsawman)
    function expandSearchTerm(term) {
      const t = term.toLowerCase();
      const patterns = [t];
      if (t === 'chainsawman' || t === 'chainsaw' || t === 'chinsawman') {
        patterns.push('chainsaw', 'chainsawman', 'chinsawman', 'chainsaw\\s+man', 'chinsaw\\s+man');
      }
      if (t === 'demonslayer') {
        patterns.push('demon', 'slayer', 'demonslayer', 'demon\\s+slayer');
      }
      if (t === 'solo' || t === 'leveling' || t === 'sololeveling') {
        patterns.push('solo', 'leveling', 'sololeveling', 'solo\\s+leveling');
      }
      return [...new Set(patterns)];
    }

    // Build query conditions: wallpapers must match all search terms
    const queryConditions = termsToSearch.map(term => {
      const patterns = expandSearchTerm(term);
      const orConditions = [];
      patterns.forEach(pat => {
        const patRegex = new RegExp(escapeRegex(pat), 'i');
        orConditions.push(
          { title: patRegex },
          { category: patRegex },
          { tags: patRegex }
        );
      });
      return { $or: orConditions };
    });
    
    const walls = await Wallpaper.find({
      $and: queryConditions
    }).sort({ uploadedAt: -1 });

    const otherColls = await Collection.find({ slug: { $ne: c.slug } }).limit(8);

    const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    
    const canonicalUrl = `${BASE_URL}/collection/${c.slug}`;
    const richIntroText = getCollectionIntro(c.slug, c.name);
    
    renderCollectionPage(res, walls, c.metaTitle || c.name, richIntroText, c.description, canonicalUrl, esc, otherColls);
  } catch (err) {
    console.error('Error loading collection page:', err);
    res.status(500).send('Error loading collection.');
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


// Global error handling middleware to catch and print detailed errors (e.g. from Multer / Cloudinary)
app.use((err, req, res, next) => {
  console.error('--- GLOBAL ERROR HANDLER ---');
  if (err && typeof err === 'object') {
    console.error('Error properties:', Object.getOwnPropertyNames(err));
    console.error('Error details (JSON):', JSON.stringify(err));
    if (err.stack) console.error('Stack trace:', err.stack);
    if (err.message) console.error('Error message:', err.message);
  } else {
    console.error('Error value:', err);
  }
  
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ error: err.message || err || 'Server error during upload or execution' });
});

app.listen(PORT, () => console.log(`⚔  Waynelab → ${BASE_URL}`));