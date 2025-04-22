
// routes/customOptionsRoutes.js
const express = require('express');
const router = express.Router();
const { CustomOption, Product } = require('../models');

// Get all custom options
router.get('/', async (req, res) => {
  try {
    const customOptions = await CustomOption.find();
    res.json(customOptions);
  } catch (err) {
    console.error('Error fetching custom options:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a custom option
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const customOption = new CustomOption({ name });
    await customOption.save();
    res.status(201).json(customOption);
  } catch (err) {
    if (err.code === 11000) { // Duplicate key error
      return res.status(400).json({ message: 'This custom option already exists' });
    }
    console.error('Error adding custom option:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a custom option
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if custom option is in use
    const productsUsingOption = await Product.find({ customOption: id });
    if (productsUsingOption.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete this custom option as it is in use',
        productsCount: productsUsingOption.length
      });
    }
    
    const result = await CustomOption.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: 'Custom option not found' });
    }
    
    res.json({ message: 'Custom option deleted successfully' });
  } catch (err) {
    console.error('Error deleting custom option:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;