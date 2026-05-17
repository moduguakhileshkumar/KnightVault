const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  adsensePublisherId: { type: String, default: '' },
});

module.exports = mongoose.model('Settings', settingsSchema);
