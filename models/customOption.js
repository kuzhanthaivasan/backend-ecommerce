
// models/customOption.js
const mongoose = require('mongoose');

const customOptionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

const CustomOption = mongoose.model('CustomOption', customOptionSchema);

module.exports = CustomOption;