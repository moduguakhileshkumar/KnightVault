const mongoose = require('mongoose');

const wallpaperSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  filename:    { type: String, required: true },         // stored file name on disk
  originalName:{ type: String },                         // original upload name
  slug:        { type: String, unique: true, sparse: true, trim: true },
  url:         { type: String, required: true },         // public access URL
  directLink:  { type: String, required: true },         // direct image link (shareable)
  category:    [{ type: String, lowercase: true, trim: true }],
  tags:        [{ type: String, lowercase: true, trim: true }],
  resolution:  { type: String },                         // e.g. "3840x2160"
  size:        { type: Number },                         // bytes
  mimeType:    { type: String },
  downloads:   { type: Number, default: 0 },
  views:       { type: Number, default: 0 },
  isPaid:      { type: Boolean, default: false },
  price:       { type: Number, default: 0 },
  uploadedAt:  { type: Date, default: Date.now },
  adminViews:  { type: Number, default: 0 },
  adminDownloads:{ type: Number, default: 0 },
});

// Full-text search index
wallpaperSchema.index({ title: 'text', tags: 'text', category: 'text' });

module.exports = mongoose.model('Wallpaper', wallpaperSchema);
