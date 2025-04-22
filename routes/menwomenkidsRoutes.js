const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { Product } = require('../models');

const router = express.Router();

// ====================================================== 
// MULTER CONFIGURATION (for initial file handling) 
// ====================================================== 
const uploadsDir = path.join(__dirname, 'temp-uploads');
const permanentUploadsDir = path.join(__dirname, 'uploads');

// Ensure both directories exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(permanentUploadsDir)) {
  fs.mkdirSync(permanentUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({   
  destination: (req, file, cb) => {     
    cb(null, uploadsDir);   
  },   
  filename: (req, file, cb) => {     
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);     
    const ext = path.extname(file.originalname);     
    cb(null, `img_${uniqueSuffix}${ext}`);   
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
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ====================================================== 
// HELPER FUNCTIONS 
// ====================================================== 
// Helper function to validate URL
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

// Helper function to download an image from URL
const downloadImageFromUrl = async (imageUrl, destinationPath) => {
  try {
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream'
    });
    
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(destinationPath);
      response.data.pipe(writer);
      
      writer.on('finish', () => resolve(destinationPath));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error('Failed to download image from URL');
  }
};

// Function to clean up temporary files 
const cleanupTempFiles = (filepath) => {   
  try {     
    if (fs.existsSync(filepath)) {       
      fs.unlinkSync(filepath);       
      console.log(`Cleaned up temporary file: ${filepath}`);     
    }   
  } catch (err) {     
    console.error('Error cleaning up temporary file:', err);   
  } 
};

// ====================================================== 
// IMAGE UPLOAD ENDPOINTS 
// ====================================================== 
// Upload image using multipart form data
router.post('/upload/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const tempFilePath = req.file.path;
    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(req.file.originalname);
    const fileName = `img_${uniqueId}${extension}`;
    const destinationPath = path.join(permanentUploadsDir, fileName);

    // Move file from temp to permanent storage
    fs.copyFileSync(tempFilePath, destinationPath);
    
    // Clean up the temporary file
    cleanupTempFiles(tempFilePath);
    
    // Return the URL to access the image
    res.json({
      success: true,
      imageUrl: `/uploads/${fileName}`,
      fileName: fileName
    });
  } catch (error) {
    console.error('Error handling image upload:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload image from URL directly
router.post('/upload/url', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl || !isValidUrl(imageUrl)) {
      return res.status(400).json({ message: 'Invalid or missing image URL' });
    }
    
    // Create unique filename for the downloaded image
    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const urlPath = new URL(imageUrl).pathname;
    const ext = path.extname(urlPath) || '.jpg'; // Default to .jpg if extension can't be determined
    const fileName = `url_img_${uniqueId}${ext}`;
    const filePath = path.join(permanentUploadsDir, fileName);
    
    try {
      // Download the image from URL
      await downloadImageFromUrl(imageUrl, filePath);
      
      res.json({
        success: true,
        imageUrl: `/uploads/${fileName}`,
        fileName: fileName,
        originalUrl: imageUrl
      });
    } catch (downloadErr) {
      console.error('Error downloading image from URL:', downloadErr);
      return res.status(400).json({ 
        message: 'Failed to download image from URL',
        error: downloadErr.message
      });
    }
  } catch (error) {
    console.error('Error handling URL image upload:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ====================================================== 
// SEARCH FUNCTIONALITY - Add this BEFORE any parameterized routes
// ====================================================== 
/**
 * Search products with filtering
 * GET /api/products/search?q=searchTerm&peopleCategory=Female&productType=Gold&priceRange=1000-2000
 */
router.get('/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Extract filters from query params
    const filters = {};
    
    // Add text search condition if search query exists
    if (q && q.trim() !== '') {
      // Use regex for case-insensitive search across multiple fields
      filters.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { peopleCategory: { $regex: q, $options: 'i' } },
        { productCategory: { $regex: q, $options: 'i' } }
      ];
    }
    
    // Add people category filter - directly from req.query
    if (req.query.peopleCategory && req.query.peopleCategory !== 'all') {
      filters.peopleCategory = req.query.peopleCategory;
    }
    
    // Add product category filter - directly from req.query
    if (req.query.productCategory && req.query.productCategory !== 'all') {
      filters.productCategory = req.query.productCategory;
    }
    
    // Add product type filter (Gold or Silver) - directly from req.query
    if (req.query.productType && req.query.productType !== 'all') {
      filters.productType = req.query.productType;
    }
    
    // Add price range filter - directly from req.query
    if (req.query.priceRange && req.query.priceRange !== 'all') {
      const [min, max] = req.query.priceRange.split('-').map(Number);
      if (max) {
        filters.price = { $gte: min, $lte: max };
      } else {
        filters.price = { $gte: min };
      }
    }
    
    // Add custom option filter - directly from req.query
    if (req.query.customOption && req.query.customOption !== 'all') {
      filters.customOption = req.query.customOption;
    }
    
    // Add in-stock filter - directly from req.query
    if (req.query.inStock === 'true') {
      filters.inStock = true;
    }
    
    // Add weight/gram filter if needed
    if (req.query.minGram) {
      filters.gram = filters.gram || {};
      filters.gram.$gte = parseInt(req.query.minGram);
    }
    
    if (req.query.maxGram) {
      filters.gram = filters.gram || {};
      filters.gram.$lte = parseInt(req.query.maxGram);
    }
    
    console.log('Search filters:', JSON.stringify(filters));
    
    // Execute query with pagination
    const products = await Product.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    // Get total count for pagination
    const total = await Product.countDocuments(filters);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      products
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching products',
      error: error.message
    });
  }
});

// ====================================================== 
// PRODUCT ENDPOINTS WITH IMAGE SUPPORT
// ====================================================== 
// Create a new product with image(s)
router.post('/products', async (req, res) => {
  try {
    const productData = req.body;
    
    // Handle image URL in the product data if present
    if (productData.imageUrl && isValidUrl(productData.imageUrl)) {
      // Keep the URL as is, no need to process it further
      console.log(`Using provided image URL: ${productData.imageUrl}`);
    }
    
    // Handle multiple image URLs if present
    if (productData.imageUrls && Array.isArray(productData.imageUrls)) {
      const validImageUrls = [];
      
      for (const url of productData.imageUrls) {
        if (isValidUrl(url)) {
          validImageUrls.push(url);
        } else {
          console.log(`Skipping invalid image URL: ${url}`);
        }
      }
      
      productData.imageUrls = validImageUrls;
    }
    
    // Create and save the new product
    const product = new Product(productData);
    await product.save();
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a product with new image(s)
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Handle image URL in the update data if present
    if (updateData.imageUrl && isValidUrl(updateData.imageUrl)) {
      // Keep the URL as is, no need to process it further
      console.log(`Using provided image URL: ${updateData.imageUrl}`);
    }
    
    // Handle multiple image URLs if present
    if (updateData.imageUrls && Array.isArray(updateData.imageUrls)) {
      const validImageUrls = [];
      
      for (const url of updateData.imageUrls) {
        if (isValidUrl(url)) {
          validImageUrls.push(url);
        } else {
          console.log(`Skipping invalid image URL: ${url}`);
        }
      }
      
      updateData.imageUrls = validImageUrls;
    }
    
    // Update the product
    const product = await Product.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format to prevent "search" being treated as an id
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error retrieving product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ====================================================== 
// PRODUCT API ENDPOINTS
// ====================================================== 
// API endpoint to fetch all products with filtering options
router.get('/products', async (req, res) => {
  try {
    const { 
      peopleCategory, 
      productCategory, 
      productType, 
      priceRange,
      minPrice,
      maxPrice,
      sortBy 
    } = req.query;
    
    // Building the query object
    const query = {};
    
    // Filter by people category (male, female, kids, unisex)
    if (peopleCategory) {
      query.peopleCategory = peopleCategory;
    }
    
    // Filter by product category (chain, ring, etc.)
    if (productCategory) {
      query.productCategory = productCategory;
    }
    
    // Filter by product type (silver, gold)
    if (productType) {
      query.productType = productType;
    }
    
    // Filter by price range
    if (priceRange) {
      query.priceRange = priceRange;
    }
    
    // Filter by min and max price if provided
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    console.log('Database query:', JSON.stringify(query));
    
    // Get products from the database
    let products = await Product.find(query);
    
    console.log(`Found ${products.length} products matching the criteria`);
    
    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case 'alpha-asc':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'alpha-desc':
          products.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'price-asc':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          products.sort((a, b) => b.price - a.price);
          break;
        default:
          // Default sorting by creation date
          products.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return 0;
          });
      }
    }
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Specific endpoint for men's jewelry - FIXED ROUTE PATH
router.get('/products/category/men', async (req, res) => {
  try {
    const { 
      productCategory, 
      productType, 
      priceRange,
      minPrice,
      maxPrice,
      sortBy 
    } = req.query;
    
    // Building the query object - always filter for male category
    const query = { 
      $and: [
        { $or: [{ peopleCategory: "male" }, { peopleCategory: "Male" }] },
        { $or: [
            { customOption: "None" },
            { customOption: { $exists: false } }
          ] 
        }
      ]
    };
    
    // Additional filters
    if (productCategory) query.productCategory = productCategory;
    if (productType) query.productType = productType;
    if (priceRange) query.priceRange = priceRange;
    
    // Filter by min and max price if provided
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    console.log('Men\'s products query:', JSON.stringify(query));
    
    // Get products from the database
    let products = await Product.find(query);
    
    console.log(`Found ${products.length} men's products matching the criteria`);
    
    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case 'alpha-asc':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'alpha-desc':
          products.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'price-asc':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          products.sort((a, b) => b.price - a.price);
          break;
        default:
          // Default sorting
          products.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return 0;
          });
      }
    }
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching men\'s products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Endpoint for women's jewelry - FIXED ROUTE PATH
router.get('/products/category/women', async (req, res) => {
  try {
    const { 
      productCategory, 
      productType, 
      priceRange,
      minPrice,
      maxPrice,
      sortBy 
    } = req.query;
    
     
    const query = { 
      $and: [
        { $or: [{ peopleCategory: "female" }, { peopleCategory: "Female" }] },
        { $or: [
            { customOption: "None" },
            { customOption: { $exists: false } }
          ] 
        }
      ]
    };
    
    
    // Additional filters
    if (productCategory) query.productCategory = productCategory;
    if (productType) query.productType = productType;
    if (priceRange) query.priceRange = priceRange;
    
    // Filter by min and max price if provided
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    let products = await Product.find(query);
    
    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case 'alpha-asc':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'alpha-desc':
          products.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'price-asc':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          products.sort((a, b) => b.price - a.price);
          break;
        default:
          products.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return 0;
          });
      }
    }
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching women\'s products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Endpoint for kids' jewelry - FIXED ROUTE PATH
router.get('/products/category/kids', async (req, res) => {
  try {
    const { 
      productCategory, 
      productType, 
      priceRange,
      minPrice,
      maxPrice,
      sortBy 
    } = req.query;
    const query = { 
      $and: [
        { $or: [{ peopleCategory: "kids" }, { peopleCategory: "Kids" }] },
        { $or: [
            { customOption: "None" },
            { customOption: { $exists: false } }
          ] 
        }
      ]
    };
    
    
    // Additional filters
    if (productCategory) query.productCategory = productCategory;
    if (productType) query.productType = productType;
    if (priceRange) query.priceRange = priceRange;
    
    // Filter by min and max price if provided
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    let products = await Product.find(query);
    
    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case 'alpha-asc':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'alpha-desc':
          products.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'price-asc':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          products.sort((a, b) => b.price - a.price);
          break;
        default:
          products.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return 0;
          });
      }
    }
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching kids\' products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Endpoint for unisex jewelry - FIXED ROUTE PATH
router.get('/products/category/unisex', async (req, res) => {
  try {
    const { 
      productCategory, 
      productType, 
      priceRange,
      minPrice,
      maxPrice,
      sortBy 
    } = req.query;
    
    const query = { $or: [{ peopleCategory: "unisex" }, { peopleCategory: "Unisex" }] };
    
    // Additional filters
    if (productCategory) query.productCategory = productCategory;
    if (productType) query.productType = productType;
    if (priceRange) query.priceRange = priceRange;
    
    // Filter by min and max price if provided
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    let products = await Product.find(query);
    
    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case 'alpha-asc':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'alpha-desc':
          products.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'price-asc':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          products.sort((a, b) => b.price - a.price);
          break;
        default:
          products.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return 0;
          });
      }
    }
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching unisex products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Endpoint for couples jewelry - FIXED ROUTE PATH
router.get('/products/category/couples', async (req, res) => {
  try {
    const { 
      productCategory, 
      productType, 
      priceRange,
      minPrice,
      maxPrice,
      sortBy 
    } = req.query;
    
    const query = { 
      $and: [
        { $or: [{ peopleCategory: "Couples" }, { peopleCategory: "couples" }] },
        { $or: [
            { customOption: "None" },
            { customOption: { $exists: false } }
          ] 
        }
      ]
    };
    
    
    // Additional filters
    if (productCategory) query.productCategory = productCategory;
    if (productType) query.productType = productType;
    if (priceRange) query.priceRange = priceRange;
    
    // Filter by min and max price if provided
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    console.log('Couples products query:', JSON.stringify(query));
    
    let products = await Product.find(query);
    
    console.log(`Found ${products.length} couples products matching the criteria`);
    
    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case 'alpha-asc':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'alpha-desc':
          products.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'price-asc':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          products.sort((a, b) => b.price - a.price);
          break;
        default:
          products.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return 0;
          });
      }
    }
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching couples products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test endpoint to verify API functionality
router.get('/test', (req, res) => {
  res.json({ message: 'API is working correctly' });
});

// Diagnostic endpoint to check all products and DB status
router.get('/diagnostic', async (req, res) => {
  try {
    const allProducts = await Product.find({});
    const productsByCategory = {
      male: await Product.countDocuments({ peopleCategory: "male" }),
      female: await Product.countDocuments({ peopleCategory: "female" }),
      kids: await Product.countDocuments({ peopleCategory: "kids" }),
      unisex: await Product.countDocuments({ peopleCategory: "unisex" }),
      couples: await Product.countDocuments({ peopleCategory: "couples" }),
    };
    
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      dbStatus,
      totalProducts: allProducts.length,
      productsByCategory,
      sampleProduct: allProducts.length > 0 ? allProducts[0] : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;