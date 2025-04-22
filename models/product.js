const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  gram: { type: Number, default: 0 },
  peopleCategory: {
    type: String,
    required: true,
    // enum: ['Kids', 'Female', 'Male']
  },
  productCategory: {
    type: String,
    required: true,
    // enum: ['Pendants', 'Rings', 'Bracelets', 'Chains', 'Earrings', 'Necklaces']
  },
  productType: {
    type: String,
    required: true,
    enum: ['Gold', 'Silver']
  },
  priceRange: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  metalType: { 
    type: String, 
    enum: ['gold', 'silver'], 
    default: ' ' 
  },
  customOption: {
    type: String,
    default: '',
    enum: ['None', 'Engraving', 'Fingerprint', 'Image','combined']
  },
  images: [{
    type: String,  // Base64 encoded image string
    default: []    // Default to an empty array
  }],
  description: { type: String },
  inStock: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  customizationType: { type: String }
});

// Pre-save hook to ensure customizationType matches customOption
productSchema.pre('save', function(next) {
  // Convert customOption to lowercase for customizationType
  if (this.customOption) {
    this.customizationType = this.customOption.toLowerCase();
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;