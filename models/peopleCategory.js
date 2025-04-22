// models/peopleCategory.js
const mongoose = require('mongoose');

const peopleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }
});

const PeopleCategory = mongoose.model('PeopleCategory', peopleSchema);

module.exports = PeopleCategory;

