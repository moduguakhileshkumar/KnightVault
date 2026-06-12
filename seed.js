const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
const BASE_URL = process.env.BASE_URL || 'https://waynelab.studio';

if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI environment variable is missing.');
  console.log('Please run the script as:');
  console.log('  MONGO_URI="your_mongodb_connection_string" node seed.js');
  process.exit(1);
}

// Define Schema (matches model.js)
const wallpaperSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  filename:    { type: String, required: true },
  originalName:{ type: String },
  slug:        { type: String, unique: true, sparse: true, trim: true },
  url:         { type: String, required: true },
  directLink:  { type: String, required: true },
  category:    [{ type: String, lowercase: true, trim: true }],
  tags:        [{ type: String, lowercase: true, trim: true }],
  resolution:  { type: String },
  size:        { type: Number },
  mimeType:    { type: String },
  downloads:   { type: Number, default: 0 },
  views:       { type: Number, default: 0 },
  isPaid:      { type: Boolean, default: false },
  price:       { type: Number, default: 0 },
  uploadedAt:  { type: Date, default: Date.now },
  adminViews:  { type: Number, default: 0 },
  adminDownloads:{ type: Number, default: 0 },
});

const Wallpaper = mongoose.model('Wallpaper', wallpaperSchema);

// Helper to slugify text
function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// 120 Curated high-quality wallpapers categorized and tagged
const wallpaperSeeds = [
  // ONE PIECE (Luffy, Gear 5, Zoro, Nami, Sanji, etc.)
  { id: 'photo-1607604276583-eef5d076aa5f', title: 'Gear 5 Luffy Sun God Nika', cat: 'anime', tags: 'one piece, luffy, gear 5, nika, neon, illustration' },
  { id: 'photo-1578632767115-351597cf2477', title: 'Roronoa Zoro Three Sword Style', cat: 'anime', tags: 'one piece, zoro, swordsman, wano, green, illustration' },
  { id: 'photo-1542751371-adc38448a05e', title: 'Portgas D Ace Fire Fist', cat: 'anime', tags: 'one piece, ace, fire, flame, legacy, illustration' },
  { id: 'photo-1509198397868-475647b2a1e5', title: 'Emperor Shanks Conquerors Haki', cat: 'anime', tags: 'one piece, shanks, red hair, haki, cinematic' },
  { id: 'photo-1541562232579-512a21360020', title: 'Monkey D Luffy Red Hawk Attack', cat: 'anime', tags: 'one piece, luffy, red hawk, fire, fight' },
  { id: 'photo-1508739773434-c26b3d09e071', title: 'Vinsmoke Sanji Ifrit Jambe', cat: 'anime', tags: 'one piece, sanji, blue fire, leg, cook, combat' },
  { id: 'photo-1518709268805-4e9042af9f23', title: 'Pirate Hunter Zoro Asura Form', cat: 'anime', tags: 'one piece, zoro, asura, demon, dark, haki' },
  { id: 'photo-1618005182384-a83a8bd57fbe', title: 'Egghead Island Futuristic Luffy', cat: 'anime', tags: 'one piece, luffy, egghead, sci-fi, future' },
  { id: 'photo-1534447677768-be436bb09401', title: 'Trafalgar Law Room Shambles', cat: 'anime', tags: 'one piece, law, room, heart, blue, surgery' },
  { id: 'photo-1614850523459-c2f4c699c52e', title: 'Nico Robin Devil Child Demon', cat: 'anime', tags: 'one piece, robin, demonio, hands, purple' },

  // BLACK CLOVER (Asta, Yuno, Black Bulls)
  { id: 'photo-1511512578047-dfb367046420', title: 'Asta Anti Magic Demon Form', cat: 'anime', tags: 'black clover, asta, demon, sword, dark, red' },
  { id: 'photo-1612287230202-1bf1d85d1bdf', title: 'Yuno Spirit of Zephyr Wind', cat: 'anime', tags: 'black clover, yuno, wind, spirit, green, magic' },
  { id: 'photo-1601987177651-8edfe6c20009', title: 'Black Bulls Squad Insignia', cat: 'anime', tags: 'black clover, bulls, logo, banner, gold, black' },
  { id: 'photo-1538481199705-c710c4e965fc', title: 'Asta Black Divider Slash', cat: 'anime', tags: 'black clover, asta, sword, anti magic, purple' },
  { id: 'photo-1550745165-9bc0b252726f', title: 'Yami Sukehiro Dark Magic Slash', cat: 'anime', tags: 'black clover, yami, dark, katana, captain' },
  { id: 'photo-1563089145-599997674d42', title: 'Noelle Silva Valkyrie Armor', cat: 'anime', tags: 'black clover, noelle, water, armor, blue, princess' },
  { id: 'photo-1518770660439-4636190af475', title: 'Wizard King Julius Chrono Magic', cat: 'anime', tags: 'black clover, julius, time, magic, gold, blue' },
  { id: 'photo-1526374965328-7f61d4dc18c5', title: 'Asta Devil Union Mode', cat: 'anime', tags: 'black clover, asta, liebe, union, 4k' },
  { id: 'photo-1580234810907-b40315b76418', title: 'Mereoleona Vermillion Mana Zone', cat: 'anime', tags: 'black clover, vermillion, fire, lion, lioness' },
  { id: 'photo-1553481187-be93c21490a9', title: 'Yuno Star Magic Awakening', cat: 'anime', tags: 'black clover, yuno, stars, sky, blue' },

  // DEMON SLAYER (Tanjiro, Nezuko, Rengoku, Hashiras)
  { id: 'photo-1542751371-adc38448a05e', title: 'Tanjiro Hinokami Kagura Dance', cat: 'anime', tags: 'demon slayer, tanjiro, sun, fire, katana' },
  { id: 'photo-1607604276583-eef5d076aa5f', title: 'Kyojuro Rengoku Flame Breathing', cat: 'anime', tags: 'demon slayer, rengoku, flame, hashira, orange' },
  { id: 'photo-1578632767115-351597cf2477', title: 'Zenitsu Agatsuma Thunder Clap', cat: 'anime', tags: 'demon slayer, zenitsu, thunder, lightning, yellow' },
  { id: 'photo-1509198397868-475647b2a1e5', title: 'Nezuko Kamado Demon Form', cat: 'anime', tags: 'demon slayer, nezuko, demon, pink, bamboo' },
  { id: 'photo-1541562232579-512a21360020', title: 'Giyu Tomioka Water Breathing', cat: 'anime', tags: 'demon slayer, giyu, water, hashira, blue' },
  { id: 'photo-1508739773434-c26b3d09e071', title: 'Inosuke Hashibira Beast Breath', cat: 'anime', tags: 'demon slayer, inosuke, boar, beast, swords' },
  { id: 'photo-1518709268805-4e9042af9f23', title: 'Shinobu Kocho Butterfly Dance', cat: 'anime', tags: 'demon slayer, shinobu, insect, butterfly, purple' },
  { id: 'photo-1618005182384-a83a8bd57fbe', title: 'Akaza Upper Moon Three', cat: 'anime', tags: 'demon slayer, akaza, compass, fight, pink' },
  { id: 'photo-1534447677768-be436bb09401', title: 'Kokushibo Six Eyes Demon', cat: 'anime', tags: 'demon slayer, kokushibo, upper moon, crescent, purple' },
  { id: 'photo-1614850523459-c2f4c699c52e', title: 'Tanjiro Water Dragon Thread', cat: 'anime', tags: 'demon slayer, tanjiro, dragon, water, combat' },

  // BATMAN / DC SUPERHEROES
  { id: 'photo-1509198397868-475647b2a1e5', title: 'Batman Gotham Knight Shadows', cat: 'gaming', tags: 'batman, gotham, dark, superhero, bat' },
  { id: 'photo-1607604276583-eef5d076aa5f', title: 'Joker Chaotic Neon Grin', cat: 'gaming', tags: 'joker, clown, neon, green, purple, psycho' },
  { id: 'photo-1578632767115-351597cf2477', title: 'Batmobile Cyberpunk Drive Night', cat: 'gaming', tags: 'batman, batmobile, car, neon, street' },
  { id: 'photo-1542751371-adc38448a05e', title: 'Batman Dark Knight Silhouette', cat: 'gaming', tags: 'batman, dark knight, cape, moon, gargoyle' },
  { id: 'photo-1509198397868-475647b2a1e5', title: 'Arkham Asylum Gothic Spire', cat: 'gaming', tags: 'batman, arkham, gothic, castle, moon' },
  { id: 'photo-1541562232579-512a21360020', title: 'The Joker HAHA Graffiti Art', cat: 'gaming', tags: 'joker, graffiti, red, text, paint' },
  { id: 'photo-1508739773434-c26b3d09e071', title: 'Catwoman Gotham Rooftops Neon', cat: 'gaming', tags: 'catwoman, selina, leather, whip, neon' },
  { id: 'photo-1518709268805-4e9042af9f23', title: 'Batman Arkham City Neon Glow', cat: 'gaming', tags: 'batman, arkham, city, rain, neon' },
  { id: 'photo-1618005182384-a83a8bd57fbe', title: 'Justice League Dark Emblem', cat: 'gaming', tags: 'batman, superman, logo, gold, metal' },
  { id: 'photo-1534447677768-be436bb09401', title: 'Gotham City Cyberpunk Sky', cat: 'gaming', tags: 'gotham, sky, bat-signal, light, gold' }
];

// Generate extra fillers to easily reach 120 wallpapers total
const categories = ['anime', 'gaming', 'cinematic', 'minimalist', 'nature'];
const extraTags = ['cyberpunk', 'neon', '4k', 'artwork', 'abstract', 'dark', 'oled', 'gold', 'future', 'minimal'];

for (let i = 1; i <= 80; i++) {
  const seedIndex = i % wallpaperSeeds.length;
  const seed = wallpaperSeeds[seedIndex];
  const cat = categories[i % categories.length];
  const resolution = (i % 2 === 0) ? '3840x2160' : '1080x1920'; // Alternate Desktop/Mobile
  const suffix = (resolution === '3840x2160') ? 'Ultra HD' : 'Vertical Mobile';
  
  wallpaperSeeds.push({
    id: seed.id,
    title: `${seed.title.split(' ').slice(0, 3).join(' ')} ${suffix} v${i}`,
    cat: cat,
    tags: `${seed.tags}, ${extraTags[i % extraTags.length]}, dynamic-seed`,
    resolution: resolution
  });
}

// Perform insertion
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✓ Connected to MongoDB for seeding...');
    
    let insertedCount = 0;
    for (const data of wallpaperSeeds) {
      const slug = slugify(data.title);
      
      // Prevent duplicates
      const exists = await Wallpaper.findOne({ slug: slug });
      if (exists) {
        continue;
      }
      
      const width = data.resolution ? parseInt(data.resolution.split('x')[0]) : 3840;
      const height = data.resolution ? parseInt(data.resolution.split('x')[1]) : 2160;
      
      // Curate high resolution image CDN link (Unsplash source image API)
      const directLink = `https://images.unsplash.com/${data.id}?q=85&w=${width}&h=${height}&auto=format&fit=crop`;
      const pageUrl = `${BASE_URL}/w/${slug}`;
      
      await Wallpaper.create({
        title: data.title,
        slug: slug,
        filename: `seed_${data.id}_${width}`,
        originalName: `${slug}.jpg`,
        url: pageUrl,
        directLink: directLink,
        category: Array.isArray(data.cat) ? data.cat : [data.cat],
        tags: data.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        resolution: data.resolution || '3840x2160',
        size: Math.floor(Math.random() * 3000000) + 1500000, // 1.5MB - 4.5MB
        mimeType: 'image/jpeg',
      });
      insertedCount++;
    }
    
    console.log(`✓ Seeding complete! Successfully added ${insertedCount} new wallpapers.`);
    console.log(`Total Wallpapers in your Vault: ${await Wallpaper.countDocuments()}`);
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error during seeding database:', err);
  });
