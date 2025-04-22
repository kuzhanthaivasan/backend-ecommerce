// models/priceRange.js
const mongoose = require('mongoose');

const priceRangeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }
});

const PriceRange = mongoose.model('PriceRange', priceRangeSchema);

module.exports = PriceRange;