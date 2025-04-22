// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { PeopleCategory, ProductCategory, ProductType, PriceRange } = require('../models');

// =============================
// PEOPLE CATEGORY ROUTES
// =============================

// NEW API pattern
router.get('/people', async (req, res) => {
  try {
    const categories = await PeopleCategory.find().sort({ name: 1 });
    console.log(`Retrieved ${categories.length} people categories (via /categories/people)`);
    res.json(categories);
  } catch (err) {
    console.error('Error retrieving people categories:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/people', async (req, res) => {
  try {
    console.log('Adding new people category (via /categories/people):', req.body);
    
    // Validate request body
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Check for duplicate names
    const existingCategory = await PeopleCategory.findOne({ name: req.body.name.trim() });
    if (existingCategory) {
      return res.status(409).json({ message: 'Category with this name already exists' });
    }
    
    const category = new PeopleCategory({ name: req.body.name.trim() });
    const newCategory = await category.save();
    console.log('New people category created:', newCategory._id);
    res.status(201).json(newCategory);
  } catch (err) {
    console.error('Error creating people category:', err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/people/:id', async (req, res) => {
  try {
    console.log(`Attempting to delete people category with ID: ${req.params.id} (via /categories/people)`);
    
    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid people category ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid category ID format' });
    }
    
    // Find and delete the category
    const category = await PeopleCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      console.log(`People category not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Category not found' });
    }
    
    console.log(`Successfully deleted people category: ${category.name}`);
    res.json({ message: 'Category deleted successfully', deletedCategory: category });
  } catch (err) {
    console.error(`Error deleting people category ${req.params.id}:`, err);
    res.status(500).json({ message: err.message });
  }
});

// LEGACY API pattern
router.get('/people-categories', async (req, res) => {
  try {
    const categories = await PeopleCategory.find().sort({ name: 1 });
    console.log(`Retrieved ${categories.length} people categories (via legacy endpoint)`);
    res.json(categories);
  } catch (err) {
    console.error('Error retrieving people categories:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/people-categories', async (req, res) => {
  try {
    console.log('Adding new people category (via legacy endpoint):', req.body);
    
    // Validate request body
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Check for duplicate names
    const existingCategory = await PeopleCategory.findOne({ name: req.body.name.trim() });
    if (existingCategory) {
      return res.status(409).json({ message: 'Category with this name already exists' });
    }
    
    const category = new PeopleCategory({ name: req.body.name.trim() });
    const newCategory = await category.save();
    console.log('New people category created:', newCategory._id);
    res.status(201).json(newCategory);
  } catch (err) {
    console.error('Error creating people category:', err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/people-categories/:id', async (req, res) => {
  try {
    console.log(`Attempting to delete people category with ID: ${req.params.id} (via legacy endpoint)`);
    
    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid people category ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid category ID format' });
    }
    
    // Find and delete the category
    const category = await PeopleCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      console.log(`People category not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Category not found' });
    }
    
    console.log(`Successfully deleted people category: ${category.name}`);
    res.json({ message: 'Category deleted successfully', deletedCategory: category });
  } catch (err) {
    console.error(`Error deleting people category ${req.params.id}:`, err);
    res.status(500).json({ message: err.message });
  }
});

// =============================
// PRODUCT CATEGORY ROUTES
// =============================

// NEW API pattern
router.get('/product', async (req, res) => {
  try {
    const categories = await ProductCategory.find().sort({ name: 1 });
    console.log(`Retrieved ${categories.length} product categories (via /categories/product)`);
    res.json(categories);
  } catch (err) {
    console.error('Error retrieving product categories:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/product', async (req, res) => {
  try {
    console.log('Adding new product category (via /categories/product):', req.body);
    
    // Validate request body
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Check for duplicate names
    const existingCategory = await ProductCategory.findOne({ name: req.body.name.trim() });
    if (existingCategory) {
      return res.status(409).json({ message: 'Category with this name already exists' });
    }
    
    const category = new ProductCategory({ name: req.body.name.trim() });
    const newCategory = await category.save();
    console.log('New product category created:', newCategory._id);
    res.status(201).json(newCategory);
  } catch (err) {
    console.error('Error creating product category:', err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/product/:id', async (req, res) => {
  try {
    console.log(`Attempting to delete product category with ID: ${req.params.id} (via /categories/product)`);
    
    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid product category ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid category ID format' });
    }
    
    // Find and delete the category
    const category = await ProductCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      console.log(`Product category not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Category not found' });
    }
    
    console.log(`Successfully deleted product category: ${category.name}`);
    res.json({ message: 'Category deleted successfully', deletedCategory: category });
  } catch (err) {
    console.error(`Error deleting product category ${req.params.id}:`, err);
    res.status(500).json({ message: err.message });
  }
});

// LEGACY API pattern
router.get('/product-categories', async (req, res) => {
  try {
    const categories = await ProductCategory.find().sort({ name: 1 });
    console.log(`Retrieved ${categories.length} product categories (via legacy endpoint)`);
    res.json(categories);
  } catch (err) {
    console.error('Error retrieving product categories:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/product-categories', async (req, res) => {
  try {
    console.log('Adding new product category (via legacy endpoint):', req.body);
    
    // Validate request body
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Check for duplicate names
    const existingCategory = await ProductCategory.findOne({ name: req.body.name.trim() });
    if (existingCategory) {
      return res.status(409).json({ message: 'Category with this name already exists' });
    }
    
    const category = new ProductCategory({ name: req.body.name.trim() });
    const newCategory = await category.save();
    console.log('New product category created:', newCategory._id);
    res.status(201).json(newCategory);
  } catch (err) {
    console.error('Error creating product category:', err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/product-categories/:id', async (req, res) => {
  try {
    console.log(`Attempting to delete product category with ID: ${req.params.id} (via legacy endpoint)`);
    
    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid product category ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid category ID format' });
    }
    
    // Find and delete the category
    const category = await ProductCategory.findByIdAndDelete(req.params.id);
    
    if (!category) {
      console.log(`Product category not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Category not found' });
    }
    
    console.log(`Successfully deleted product category: ${category.name}`);
    res.json({ message: 'Category deleted successfully', deletedCategory: category });
  } catch (err) {
    console.error(`Error deleting product category ${req.params.id}:`, err);
    res.status(500).json({ message: err.message });
  }
});

// =============================
// PRODUCT TYPE ROUTES
// =============================

// NEW API pattern
router.get('/type', async (req, res) => {
  try {
    const types = await ProductType.find().sort({ name: 1 });
    console.log(`Retrieved ${types.length} product types (via /categories/type)`);
    res.json(types);
  } catch (err) {
    console.error('Error retrieving product types:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/type', async (req, res) => {
  try {
    console.log('Adding new product type (via /categories/type):', req.body);
    
    // Validate request body
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Product type name is required' });
    }
    
    // Check for duplicate names
    const existingType = await ProductType.findOne({ name: req.body.name.trim() });
    if (existingType) {
      return res.status(409).json({ message: 'Product type with this name already exists' });
    }
    
    const type = new ProductType({ name: req.body.name.trim() });
    const newType = await type.save();
    console.log('New product type created:', newType._id);
    res.status(201).json(newType);
  } catch (err) {
    console.error('Error creating product type:', err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/type/:id', async (req, res) => {
  try {
    console.log(`Attempting to delete product type with ID: ${req.params.id} (via /categories/type)`);
    
    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid product type ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid product type ID format' });
    }
    
    // Find and delete the product type
    const type = await ProductType.findByIdAndDelete(req.params.id);
    
    if (!type) {
      console.log(`Product type not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Product type not found' });
    }
    
    console.log(`Successfully deleted product type: ${type.name}`);
    res.json({ message: 'Product type deleted successfully', deletedType: type });
  } catch (err) {
    console.error(`Error deleting product type ${req.params.id}:`, err);
    res.status(500).json({ message: err.message });
  }
});

// LEGACY API pattern
router.get('/product-types', async (req, res) => {
  try {
    const types = await ProductType.find().sort({ name: 1 });
    console.log(`Retrieved ${types.length} product types (via legacy endpoint)`);
    res.json(types);
  } catch (err) {
    console.error('Error retrieving product types:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/product-types', async (req, res) => {
  try {
    console.log('Adding new product type (via legacy endpoint):', req.body);
    
    // Validate request body
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Product type name is required' });
    }
    
    // Check for duplicate names
    const existingType = await ProductType.findOne({ name: req.body.name.trim() });
    if (existingType) {
      return res.status(409).json({ message: 'Product type with this name already exists' });
    }
    
    const type = new ProductType({ name: req.body.name.trim() });
    const newType = await type.save();
    console.log('New product type created:', newType._id);
    res.status(201).json(newType);
  } catch (err) {
    console.error('Error creating product type:', err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/product-types/:id', async (req, res) => {
  try {
    console.log(`Attempting to delete product type with ID: ${req.params.id} (via legacy endpoint)`);
    
    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid product type ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid product type ID format' });
    }
    
    // Find and delete the product type
    const type = await ProductType.findByIdAndDelete(req.params.id);
    
    if (!type) {
      console.log(`Product type not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Product type not found' });
    }
    
    console.log(`Successfully deleted product type: ${type.name}`);
    res.json({ message: 'Product type deleted successfully', deletedType: type });
  } catch (err) {
    console.error(`Error deleting product type ${req.params.id}:`, err);
    res.status(500).json({ message: err.message });
  }
});

// =============================
// PRICE RANGE ROUTES
// =============================

// NEW API pattern
router.get('/price', async (req, res) => {
  try {
    const ranges = await PriceRange.find().sort({ name: 1 });
    console.log(`Retrieved ${ranges.length} price ranges (via /categories/price)`);
    res.json(ranges);
  } catch (err) {
    console.error('Error retrieving price ranges:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/price', async (req, res) => {
  try {
    console.log('Adding new price range (via /categories/price):', req.body);
    
    // Validate request body
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Price range name is required' });
    }
    
    // Check for duplicate names
    const existingRange = await PriceRange.findOne({ name: req.body.name.trim() });
    if (existingRange) {
      return res.status(409).json({ message: 'Price range with this name already exists' });
    }
    
    const range = new PriceRange({ name: req.body.name.trim() });
    const newRange = await range.save();
    console.log('New price range created:', newRange._id);
    res.status(201).json(newRange);
  } catch (err) {
    console.error('Error creating price range:', err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/price/:id', async (req, res) => {
  try {
    console.log(`Attempting to delete price range with ID: ${req.params.id} (via /categories/price)`);
    
    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid price range ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid price range ID format' });
    }
    
    // Find and delete the price range
    const range = await PriceRange.findByIdAndDelete(req.params.id);
    
    if (!range) {
      console.log(`Price range not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Price range not found' });
    }
    
    console.log(`Successfully deleted price range: ${range.name}`);
    res.json({ message: 'Price range deleted successfully', deletedRange: range });
  } catch (err) {
    console.error(`Error deleting price range ${req.params.id}:`, err);
    res.status(500).json({ message: err.message });
  }
});

// LEGACY API pattern
router.get('/price-ranges', async (req, res) => {
  try {
    const ranges = await PriceRange.find().sort({ name: 1 });
    console.log(`Retrieved ${ranges.length} price ranges (via legacy endpoint)`);
    res.json(ranges);
  } catch (err) {
    console.error('Error retrieving price ranges:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/price-ranges', async (req, res) => {
  try {
    console.log('Adding new price range (via legacy endpoint):', req.body);
    
    // Validate request body
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Price range name is required' });
    }
    
    // Check for duplicate names
    const existingRange = await PriceRange.findOne({ name: req.body.name.trim() });
    if (existingRange) {
      return res.status(409).json({ message: 'Price range with this name already exists' });
    }
    
    const range = new PriceRange({ name: req.body.name.trim() });
    const newRange = await range.save();
    console.log('New price range created:', newRange._id);
    res.status(201).json(newRange);
  } catch (err) {
    console.error('Error creating price range:', err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/price-ranges/:id', async (req, res) => {
  try {
    console.log(`Attempting to delete price range with ID: ${req.params.id} (via legacy endpoint)`);
    
    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid price range ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid price range ID format' });
    }
    
    // Find and delete the price range
    const range = await PriceRange.findByIdAndDelete(req.params.id);
    
    if (!range) {
      console.log(`Price range not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Price range not found' });
    }
    
    console.log(`Successfully deleted price range: ${range.name}`);
    res.json({ message: 'Price range deleted successfully', deletedRange: range });
  } catch (err) {
    console.error(`Error deleting price range ${req.params.id}:`, err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;