
// models/metalRate.js
const mongoose = require('mongoose');

const metalRateSchema = new mongoose.Schema({
  gold: { 
    rate: { type: Number, required: true },
    purity: { type: String, default: '24K' }
  },
  silver: { 
    rate: { type: Number, required: true },
    purity: { type: String, default: '999' }
  },
  gst: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const MetalRate = mongoose.model('MetalRate', metalRateSchema);

module.exports = MetalRate;