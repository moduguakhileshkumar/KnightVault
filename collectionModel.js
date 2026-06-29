const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },       // e.g. "One Piece"
  slug:        { type: String, required: true, unique: true, trim: true }, // e.g. "top-one-piece-wallpapers"
  keyword:     { type: String, required: true, trim: true },    // tag/category/regex keyword (e.g. "one piece")
  description: { type: String, default: '' },                   // Curated collection intro text
  metaTitle:   { type: String, default: '' },                   // Custom SEO browser title
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Collection', collectionSchema);
