const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  requestId: { type: String },
  name: { type: String, required: true },
  date: { type: Date, default: Date.now },
  condition: { type: String, default: 'Normal' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);
