const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  adsensePublisherId: { type: String, default: '' },
  googleAnalyticsId: { type: String, default: '' },
  predefinedTags: [{ type: String }],
  predefinedCategories: [{ type: String }],
  pinterestAccessToken: { type: String, default: '' },
  pinterestBoardId: { type: String, default: '' },
  pinterestClientId: { type: String, default: '' },
  pinterestClientSecret: { type: String, default: '' },
  pinterestRefreshToken: { type: String, default: '' },
  pinterestTokenExpiresAt: { type: Date },
  pinterestSandbox: { type: Boolean, default: false }
});

module.exports = mongoose.model('Settings', settingsSchema);
