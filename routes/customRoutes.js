const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Product } = require('../models');

const router = express.Router();

// ======================================================
// MULTER CONFIGURATION (for file uploads)
// ======================================================
const uploadsDir = path.join(__dirname, '../public/uploads/products');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `img${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ======================================================
// HELPER FUNCTIONS
// ======================================================
// Helper function to validate image URLs
const isValidImageUrl = (url) => {
  if (!url) return false;
  // Check if URL is a local path or placeholder
  if (url.startsWith('/') || url.startsWith('http')) {
    return true;
  }
  return false;
};

// Helper function to validate image arrays and provide fallbacks
const processImageArray = (imagesArray, maxImages = 4) => {
  // If no images found, return array with placeholder
  if (!imagesArray || !Array.isArray(imagesArray) || imagesArray.length === 0) {
    return ["/api/placeholder/400/400"];
  }
  
  // Filter to keep only valid URLs and limit to max number
  const validImages = imagesArray
    .filter(img => isValidImageUrl(img))
    .slice(0, maxImages);
    
  // If no valid images after filtering, return placeholder
  if (validImages.length === 0) {
    return ["/api/placeholder/400/400"];
  }
  
  return validImages;
};

// Function to clean up temporary files if needed
const cleanupTempFiles = (filepath) => {
  try {
    if (fs.existsSync(filepath) && filepath.includes('temp-')) {
      fs.unlinkSync(filepath);
      console.log(`Cleaned up temporary file: ${filepath}`);
    }
  } catch (err) {
    console.error('Error cleaning up temporary file:', err);
  }
};

// Generic product mapper function
const mapProducts = (products, defaultDescription) => {
  return products.map(product => {
    const processedImages = processImageArray(product.images, 4);
    const mainImage = processedImages.length > 0 ? processedImages[0] : "/api/placeholder/400/400";
    
    return {
      id: product._id,
      name: product.name,
      price: `${product.price.toFixed(2)} gram`, // Added "gram" to the price
      mainImage: mainImage,
      image: mainImage, // For frontend integration endpoints
      images: processedImages,
      inStock: product.stock > 0,
      customizationType: (product.customOption || 'none').toLowerCase(),
      description: product.description || defaultDescription
    };
  });
};

// Common error handler
const handleError = (res, category, error) => {
  console.error(`Error fetching ${category}:`, error);
  res.status(500).json({
    success: false,
    message: `Failed to fetch ${category}`,
    error: error.message
  });
};

// ======================================================
// ROUTES
// ======================================================

// Route to add a new product
router.post('/products', upload.array('productImages', 5), async (req, res) => {
  try {
    // Parse request body (JSON data)
    const productData = JSON.parse(req.body.productData);
    
    // Handle uploaded files if any
    const imagesList = [];
    
    // Process uploaded files - save them and store their URLs
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Create URL path for the image
        const imagePath = `/uploads/products/${file.filename}`;
        imagesList.push(imagePath);
      }
    }
    
    // Process image URLs from request body if present
    if (productData.images && productData.images.length > 0) {
      for (const img of productData.images) {
        if (isValidImageUrl(img)) {
          imagesList.push(img);
        }
      }
    }
    
    // Ensure customizationType matches customOption
    if (productData.customOption) {
      productData.customizationType = productData.customOption.toLowerCase();
    }
    
    // Create a new product with the parsed data and processed images
    const newProduct = new Product({
      ...productData,
      images: imagesList
    });
    
    // Save the product to the database
    const savedProduct = await newProduct.save();
    
    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product: savedProduct
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product',
      error: error.message
    });
  }
});

// Route to get all kids jewelry products with filters
router.get('/products/kids', async (req, res) => {
  try {
    // Extract query parameters for filtering
    const { 
      productCategory, 
      customOption, 
      minPrice, 
      maxPrice,
      sort 
    } = req.query;
    
    // Base query - filter by peopleCategory "Kids" and exclude customOption "None"
    const query = { 
      peopleCategory: 'Kids',
      customOption: { $ne: 'None' } // Exclude products where customOption is None
    };
    
    // Add additional filters if provided
    if (productCategory) {
      query.productCategory = productCategory;
    }
    
    // Handle custom options filter - modified to never include None
    if (customOption === 'available') {
      // If customOption is 'available', find all products where customOption is not 'None'
      query.customOption = { $ne: 'None' };
    } else if (customOption && customOption !== 'none') {
      // If a specific customOption is requested (and it's not 'none')
      query.customOption = customOption;
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    // Create sort options based on the sort parameter
    let sortOptions = {};
    if (sort === 'price-asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price-desc') {
      sortOptions = { price: -1 };
    } else if (sort === 'alpha-asc') {
      sortOptions = { name: 1 };
    } else if (sort === 'alpha-desc') {
      sortOptions = { name: -1 };
    } else {
      // Default sort by createdAt (newest first)
      sortOptions = { createdAt: -1 };
    }
    
    // Execute the query with sorting
    const products = await Product.find(query).sort(sortOptions);
    
    // Map the results to match the frontend structure
    const mappedProducts = products.map(product => {
      // Process images - validate and get up to 4 images
      const processedImages = processImageArray(product.images, 4);
      
      // Use the first image for display outside if available
      const mainImage = processedImages.length > 0 ? processedImages[0] : "/api/placeholder/400/400";
      
      return {
        id: product._id,
        name: product.name,
        price: `${product.price.toFixed(2)} gram`, // Added "gram" to the price
        // Return first image for outside display
        mainImage: mainImage,
        // Return all processed images for inside display
        images: processedImages,
        inStock: product.stock > 0,
        // Use the customOption value directly but convert to lowercase
        customizationType: (product.customOption || 'none').toLowerCase(),
        description: product.description || `Beautiful ${product.productCategory.toLowerCase()} for kids`,
      };
    });
    
    res.status(200).json({
      success: true,
      count: mappedProducts.length,
      products: mappedProducts
    });
  } catch (error) {
    console.error('Error fetching kids products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});

// Route to get a specific product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Process the images for the product
    const processedImages = processImageArray(product.images, 4);
    
    // Create a modified product with processed images
    const modifiedProduct = product.toObject();
    modifiedProduct.images = processedImages;
    
    // Add mainImage for outside display
    modifiedProduct.mainImage = processedImages.length > 0 ? processedImages[0] : "/api/placeholder/400/400";
    
    // Ensure customizationType is set correctly
    modifiedProduct.customizationType = (product.customOption || 'none').toLowerCase();
    
    // Add "gram" to the price
    modifiedProduct.price = `${product.price.toFixed(2)} gram`;
    
    res.status(200).json({
      success: true,
      product: modifiedProduct
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product details',
      error: error.message
    });
  }
});

// Route to update a product
router.put('/products/:id', upload.array('productImages', 5), async (req, res) => {
  try {
    // Check if product exists
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Parse request body
    const productData = JSON.parse(req.body.productData || '{}');
    
    // Process images - start with existing images
    const imagesList = [...product.images];
    
    // Process uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Create URL path for the image
        const imagePath = `/uploads/products/${file.filename}`;
        imagesList.push(imagePath);
      }
    }
    
    // Process new image URLs from request body if present
    if (productData.newImages && productData.newImages.length > 0) {
      for (const img of productData.newImages) {
        if (isValidImageUrl(img)) {
          imagesList.push(img);
        }
      }
    }
    
    // Handle image deletion if specified
    if (productData.deleteImages && productData.deleteImages.length > 0) {
      // Get the list of images to be removed
      const imagesToDelete = productData.deleteImages.map(index => imagesList[index]);
      
      // Remove images from the file system if they are local uploads
      imagesToDelete.forEach(imgPath => {
        if (imgPath && imgPath.startsWith('/uploads/products/')) {
          try {
            const fullPath = path.join(__dirname, '../public', imgPath);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              console.log(`Deleted image file: ${fullPath}`);
            }
          } catch (err) {
            console.error(`Error deleting image: ${err.message}`);
          }
        }
      });
      
      // Update the images list excluding deleted images
      const updatedImages = imagesList.filter((img, index) => 
        !productData.deleteImages.includes(index)
      );
      productData.images = updatedImages;
    } else {
      productData.images = imagesList;
    }
    
    // Ensure customizationType is updated when customOption changes
    if (productData.customOption) {
      productData.customizationType = productData.customOption.toLowerCase();
    }
    
    // Remove newImages and deleteImages from the data to be updated
    delete productData.newImages;
    delete productData.deleteImages;
    
    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true, runValidators: true }
    );
    
    // Add "gram" to the price in the response
    const responseProduct = updatedProduct.toObject();
    responseProduct.price = `${updatedProduct.price.toFixed(2)} gram`;
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: responseProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
});

// Route to delete a product
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Delete associated image files from the server
    if (product.images && product.images.length > 0) {
      product.images.forEach(imgPath => {
        if (imgPath && imgPath.startsWith('/uploads/products/')) {
          try {
            const fullPath = path.join(__dirname, '../public', imgPath);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              console.log(`Deleted image file: ${fullPath}`);
            }
          } catch (err) {
            console.error(`Error deleting image: ${err.message}`);
          }
        }
      });
    }
    
    // Delete the product from database
    await Product.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
});

// ======================================================
// REFACTORED ROUTES FOR PRODUCTS BY CATEGORY
// ======================================================

// Modified generic route handler to exclude customOption: "None"
const getProductsByCategory = (peopleCategory, productCategory, defaultDescription) => {
  return async (req, res) => {
    try {
      const products = await Product.find({
        peopleCategory: peopleCategory,
        productCategory: productCategory,
        customOption: { $ne: 'None' } // Exclude products with customOption "None"
      });
      
      const mappedProducts = mapProducts(products, defaultDescription);
      
      res.status(200).json({
        success: true,
        count: mappedProducts.length,
        products: mappedProducts
      });
    } catch (error) {
      handleError(res, `${peopleCategory.toLowerCase()} ${productCategory.toLowerCase()}`, error);
    }
  };
};

// KIDS ROUTES
// Basic routes for each product category
router.get('/products/kids/rings', getProductsByCategory('Kids', 'Ring', 'Adorable ring for kids'));
router.get('/products/kids/pendants', getProductsByCategory('Kids', 'Pendants', 'Adorable pendant for kids'));
router.get('/products/kids/bracelets', getProductsByCategory('Kids', 'Bracelets', 'Adorable bracelet for kids'));

// WOMEN ROUTES
router.get('/products/women/rings', getProductsByCategory('Female', 'Ring', 'Elegant ring for women'));
router.get('/products/women/pendants', getProductsByCategory('Female', 'Pendants', 'Elegant pendant for women'));
router.get('/products/women/bracelets', getProductsByCategory('Female', 'Bracelets', 'Elegant bracelet for women'));

// MEN ROUTES
router.get('/products/men/rings', getProductsByCategory('Male', 'Ring', 'Sophisticated ring for men'));
router.get('/products/men/pendants', getProductsByCategory('Male', 'Pendants', 'Sophisticated pendant for men'));
router.get('/products/men/bracelets', getProductsByCategory('Male', 'Bracelets', 'Sophisticated bracelet for men'));

// ======================================================
// ADVANCED FILTERED ROUTES
// ======================================================

// Modified advanced filtering route generator to exclude customOption: "None"
const createFilteredProductRoute = (endpoint, peopleCategory, productCategory, defaultDescription) => {
  router.get(endpoint, async (req, res) => {
    try {
      // Extract query parameters
      const { 
        minPrice = 0, 
        maxPrice = 2000, 
        customizationType = "all",
        sortBy = "featured"
      } = req.query;
      
      // Base query - now always excluding customOption: "None"
      const query = {
        peopleCategory: peopleCategory,
        productCategory: productCategory,
        price: { $gte: Number(minPrice), $lte: Number(maxPrice) },
        customOption: { $ne: 'None' } // Exclude products with customOption "None"
      };
      
      // Apply customization filter (but never include "None")
      if (customizationType !== "all" && ["fingerprint", "engraving", "image","combined"].includes(customizationType)) {
        query.customOption = customizationType.charAt(0).toUpperCase() + customizationType.slice(1);
      }
      
      // Determine sort options
      const sortOptions = {
        'alpha-asc': { name: 1 },
        'alpha-desc': { name: -1 },
        'price-asc': { price: 1 },
        'price-desc': { price: -1 },
        'featured': { createdAt: -1 }
      }[sortBy] || { createdAt: -1 };
      
      // Execute query with sorting
      const products = await Product.find(query).sort(sortOptions);
      
      // Transform results
      const transformedProducts = mapProducts(products, defaultDescription);
      
      res.status(200).json({
        success: true,
        count: transformedProducts.length,
        products: transformedProducts
      });
    } catch (error) {
      handleError(res, `${peopleCategory.toLowerCase()} ${productCategory.toLowerCase()}`, error);
    }
  });
};

// KIDS - Create frontend integration routes
createFilteredProductRoute('/kids-rings', 'Kids', 'Ring', 'Magical ring for kids');
createFilteredProductRoute('/kids-pendants', 'Kids', 'Pendants', 'Magical pendant for kids');
createFilteredProductRoute('/kids-bracelets', 'Kids', 'Bracelets', 'Magical bracelet for kids');

// WOMEN - Create frontend integration routes
createFilteredProductRoute('/women-rings', 'Female', 'Ring', 'Elegant ring for women');
createFilteredProductRoute('/women-pendants', 'Female', 'Pendants', 'Elegant pendant for women');
createFilteredProductRoute('/women-bracelets', 'Female', 'Bracelets', 'Elegant bracelet for women');

// MEN - Create frontend integration routes
createFilteredProductRoute('/men-rings', 'Male', 'Ring', 'Sophisticated ring for men');
createFilteredProductRoute('/men-pendants', 'Male', 'Pendants', 'Sophisticated pendant for men');
createFilteredProductRoute('/men-bracelets', 'Male', 'Bracelets', 'Sophisticated bracelet for men');

module.exports = router;
