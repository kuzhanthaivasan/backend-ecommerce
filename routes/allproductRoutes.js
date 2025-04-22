const express = require('express');
const router = express.Router();
const {Product} = require('../models'); // Path to your Product model

/**
 * @route   GET /api/all-products
 * @desc    Get all products with filtering, sorting, pagination and all images
 * @access  Public
 */
router.get('/all-products', async (req, res) => {
  try {
    // Extract query parameters
    const {
      minPrice = 0,
      maxPrice = 60000,
      category = 'all',
      customizationType = 'all',
      sortBy = 'featured',
      page = 1,
      limit = 12
    } = req.query;

    // Build filter object
    const filterOptions = {};

    // Price range filter
    filterOptions.price = { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) };

    // By default, only show products without customization
    filterOptions.customOption = { $in: ['None', ''] };

    // Category filter
    if (category !== 'all') {
      if (category === 'Female' || category === 'Male' || category === 'Kids'|| category === 'couples') {
        filterOptions.peopleCategory = category;
      } else if (category === 'customOption') {
        // If specifically requesting custom products, change the filter to include those with custom options
        delete filterOptions.customOption; // Remove the default filter
        filterOptions.customOption = { $nin: ['None', ''] }; // Show only products with customization
      }
    }

    // Customization type filter - only applies if specifically looking for customized products
    if (customizationType !== 'all') {
      delete filterOptions.customOption; // Remove the default filter
      filterOptions.customizationType = customizationType.toLowerCase();
    }

    // Build sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'alpha-asc':
        sortOptions = { name: 1 };
        break;
      case 'alpha-desc':
        sortOptions = { name: -1 };
        break;
      case 'price-asc':
        sortOptions = { price: 1 };
        break;
      case 'price-desc':
        sortOptions = { price: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'featured':
      default:
        // You could define "featured" as some combination of factors
        // For now, we'll just use the default sorting (likely by _id)
        sortOptions = {};
        break;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const products = await Product.find(filterOptions)
       .lean()
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Product.countDocuments(filterOptions);

    // Transform products to match frontend expectations
    const transformedProducts = products.map(product => {
      // Calculate discount if needed
      const discount = product.oldPrice ? 
        Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0;

      // Include a default image for backward compatibility
      const image = product.images && product.images.length > 0 ? 
        product.images[0] : '/images/default-product.jpg';

      return {
        id: product._id,
        name: product.name,
        description: product.description || '',
        price: product.price,
        oldPrice: product.oldPrice || null,
        discount,
        image, // Keep for backward compatibility
        images: product.images || [], // Include the full images array
        category: product.peopleCategory,
        productCategory: product.productCategory,
        customizationType: product.customizationType || '',
        inStock: product.inStock,
        isNew: (new Date() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24) < 30, // Less than 30 days old
        totalUsers: product.stock // For demo purposes, using stock as totalUsers
      };
    });

    res.json({
      success: true,
      products: transformedProducts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID with all images
 * @access  Public
 */
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Make sure we include the full images array
    const transformedProduct = {
      ...product.toObject(),
      images: product.images || [] // Ensure the images array is included
    };

    res.json({
      success: true,
      product: transformedProduct
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/products/category/:category
 * @desc    Get products by category with all images
 * @access  Public
 */
router.get('/products/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ 
      $or: [
        { peopleCategory: category },
        { productCategory: category }
      ],
      customOption: { $in: ['None', ''] } // Only show non-customized products
    });

    // Transform products to ensure images array is included
    const transformedProducts = products.map(product => ({
      ...product.toObject(),
      images: product.images || [] // Ensure the images array is included
    }));

    res.json({
      success: true,
      products: transformedProducts
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products by category',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/products/customization/:type
 * @desc    Get products by customization type with all images
 * @access  Public
 */
router.get('/products/customization/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const products = await Product.find({ 
      customizationType: type.toLowerCase(),
      customOption: { $nin: ['None', ''] } // Only show customized products
    });

    // Transform products to ensure images array is included
    const transformedProducts = products.map(product => ({
      ...product.toObject(),
      images: product.images || [] // Ensure the images array is included
    }));

    res.json({
      success: true,
      products: transformedProducts
    });
  } catch (error) {
    console.error('Error fetching products by customization:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products by customization',
      error: error.message
    });
  }
});

module.exports = router;
