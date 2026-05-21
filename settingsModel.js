const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  adsensePublisherId: { type: String, default: '' },
  googleAnalyticsId: { type: String, default: '' },
  predefinedTags: [{ type: String }],
  predefinedCategories: [{ type: String }],
});

module.exports = mongoose.model('Settings', settingsSchema);
