// routes/imageRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Helper function to clean up temporary files
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

// Setup uploads directory
const uploadsDir = path.join(__dirname, '..', 'temp-uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created temporary uploads directory');
}

// Multer configuration
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
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Download image from URL
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

// Upload image route
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    console.log('Image upload endpoint called');
    
    // Handle file upload via multer
    if (req.file) {
      console.log('File uploaded via multer');
      
      return res.json({ 
        imageUrl: `/uploads/${req.file.filename}`,
        success: true
      });
    }
    
    // Handle image URL
    if (req.body.imageUrl) {
      const imageUrl = req.body.imageUrl;
      console.log('Processing image from URL:', imageUrl);
      
      // Create a unique filename for the downloaded image
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(imageUrl.split('?')[0]) || '.jpg'; // Default to .jpg if extension can't be determined
      const filename = `url_img_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadsDir, filename);
      
      try {
        // Download the image from the URL
        await downloadImageFromUrl(imageUrl, filePath);
        
        return res.json({
          imageUrl: `/uploads/${filename}`,
          success: true
        });
      } catch (downloadErr) {
        console.error('Error downloading image from URL:', downloadErr);
        return res.status(400).json({ 
          message: 'Failed to download image from URL',
          error: downloadErr.message
        });
      }
    }
    
    // No image data provided
    return res.status(400).json({ message: 'No image file or URL provided' });
  } catch (err) {
    console.error('Error processing image:', err);
    res.status(500).json({ message: 'Error processing image', error: err.message });
  }
});

//======================================================
// Image Upload Route for Fingerprint Customization
//======================================================

router.post('/upload/fingerprint', upload.single('image'), async (req, res) => {
  try {
    // Handle file upload
    if (req.file) {
      // Get path of the temp file
      const tempFilePath = req.file.path;
      
      // Create a unique filename for the final image
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname);
      const finalFilename = `fingerprint-${uniqueSuffix}${ext}`;
      const finalPath = path.join(uploadsDir, finalFilename);
      
      // Copy the file from temp to uploads directory
      fs.copyFile(tempFilePath, finalPath, (err) => {
        if (err) {
          console.error('Error copying file:', err);
          return res.status(500).json({ message: 'Error saving file', error: err.message });
        }
        
        // Clean up the temp file
        cleanupTempFiles(tempFilePath);
        
        // Return the image path
        res.status(200).json({
          message: 'Fingerprint image uploaded successfully',
          uploadedFile: finalFilename,
          imageUrl: `/uploads/${finalFilename}`
        });
      });
    }
    // Handle image URL
    else if (req.body.imageUrl) {
      const imageUrl = req.body.imageUrl;
      
      // Create a unique filename for the downloaded image
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(imageUrl.split('?')[0]) || '.jpg';
      const finalFilename = `fingerprint-${uniqueSuffix}${ext}`;
      const finalPath = path.join(uploadsDir, finalFilename);
      
      try {
        // Download the image from the URL
        await downloadImageFromUrl(imageUrl, finalPath);
        
        res.status(200).json({
          message: 'Fingerprint image uploaded successfully',
          uploadedFile: finalFilename,
          imageUrl: `/uploads/${finalFilename}`
        });
      } catch (downloadErr) {
        console.error('Error downloading fingerprint image from URL:', downloadErr);
        return res.status(400).json({ 
          message: 'Failed to download fingerprint image from URL',
          error: downloadErr.message
        });
      }
    }
    else {
      return res.status(400).json({ message: 'No image file or URL provided' });
    }
  } catch (err) {
    console.error('Error in fingerprint upload:', err);
    res.status(500).json({ 
      message: 'Server error during file upload',
      error: err.message
    });
  }
});

//======================================================
// URL Image Processing Route
//======================================================

router.post('/upload/url', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'No image URL provided' });
    }
    
    // Create a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(imageUrl.split('?')[0]) || '.jpg';
    const finalFilename = `url-${uniqueSuffix}${ext}`;
    const finalPath = path.join(uploadsDir, finalFilename);
    
    try {
      // Download the image from the URL
      await downloadImageFromUrl(imageUrl, finalPath);
      
      res.status(200).json({
        message: 'URL image downloaded successfully',
        uploadedFile: finalFilename,
        imageUrl: `/uploads/${finalFilename}`
      });
    } catch (downloadErr) {
      console.error('Error downloading image from URL:', downloadErr);
      return res.status(400).json({ 
        message: 'Failed to download image from URL',
        error: downloadErr.message
      });
    }
  } catch (err) {
    console.error('Error in URL image processing:', err);
    res.status(500).json({ 
      message: 'Server error during URL image processing',
      error: err.message
    });
  }
});

module.exports = router;