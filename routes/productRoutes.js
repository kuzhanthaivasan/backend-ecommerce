// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { Product } = require('../models');

// Helper function to validate URL
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    console.log(`Retrieved ${products.length} products`);
    
    // Return products with image URLs as is
    res.json(products);
  } catch (err) {
    console.error('Error retrieving products:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /products
router.post('/products', async (req, res) => {
  try {
    const productData = req.body;

    // Validate required fields
    if (!productData.name || !productData.price || productData.stock == null) {
      return res.status(400).json({
        message: 'Name, price, and stock are required fields.'
      });
    }

    console.log('Creating new product:', productData.name);

    // Validate and filter image URLs
    if (Array.isArray(productData.images)) {
      productData.images = productData.images.filter(img => isValidUrl(img));
    }

    const product = new Product(productData);
    const saved = await product.save();

    console.log('✅ Product saved:', saved._id);
    res.status(201).json(saved);
  } catch (err) {
    console.error('❌ Error saving product:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single product
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Return product with image URLs as is
    res.json(product);
  } catch (err) {
    console.error(`Error retrieving product ${req.params.id}:`, err);
    res.status(500).json({ message: err.message });
  }
});

// Update product
router.put('/products/:id', async (req, res) => {
  try {
    const productData = req.body;
    console.log(`Updating product ${req.params.id}:`, productData.name);
    
    // Process images to ensure they are valid URLs
    if (productData.images && productData.images.length) {
      const processedImages = [];
      
      for (let img of productData.images) {
        // If it's a valid URL, add it
        if (isValidUrl(img)) {
          processedImages.push(img);
          continue;
        }
        
        // Skip invalid images
        console.log('Skipping invalid image URL:', 
          img.substring(0, 50) + (img.length > 50 ? '...' : ''));
      }
      
      productData.images = processedImages;
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id, 
      productData,
      { new: true, runValidators: true }
    );
    
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(updatedProduct);
  } catch (err) {
    console.error(`Error updating product ${req.params.id}:`, err);
    res.status(400).json({ message: err.message });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    console.log(`Attempting to delete product with ID: ${req.params.id}`);
    
    // Check if ID is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid product ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid product ID format' });
    }
    
    // Find and delete the product
    const deleteResult = await Product.findByIdAndDelete(req.params.id);
    
    if (!deleteResult) {
      console.log(`Product not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Product not found' });
    }
    
    console.log(`Successfully deleted product: ${deleteResult.name}`);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(`Error in delete product endpoint for ID ${req.params.id}:`, err);
    res.status(500).json({ 
      message: 'Server error during product deletion', 
      error: err.message
    });
  }
});

module.exports = router;
