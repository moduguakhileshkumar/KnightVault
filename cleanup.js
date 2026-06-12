const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI environment variable is missing.');
  console.log('Please run the script as:');
  console.log('  MONGO_URI="your_mongodb_connection_string" node cleanup.js');
  process.exit(1);
}

// Define Schema
const wallpaperSchema = new mongoose.Schema({
  filename: String
});
const Wallpaper = mongoose.model('Wallpaper', wallpaperSchema);

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✓ Connected to MongoDB for cleanup...');
    
    // Delete all documents where filename starts with "seed_"
    const result = await Wallpaper.deleteMany({ filename: /^seed_/ });
    
    console.log(`✓ Cleanup complete! Successfully deleted ${result.deletedCount} seeded wallpapers.`);
    console.log(`Total remaining wallpapers (your manual uploads): ${await Wallpaper.countDocuments()}`);
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error during database cleanup:', err);
  });
