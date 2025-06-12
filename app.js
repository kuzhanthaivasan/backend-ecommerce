const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const routes = require('./routes');
// Import models (just in case they're needed elsewhere)
const {
  PeopleCategory,
  ProductCategory,
  ProductType,
  PriceRange,
  MetalRate,
  User,
  Order,
  Contact
} = require('./models');

// -------------------- MIDDLEWARE --------------------
// Logger middleware (placed at the top)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});


// CORS
// Add these to your Express.js server setup
app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// -------------------- ROUTES --------------------
app.use('/api', routes);

// -------------------- FILE UPLOAD HANDLING --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ fileUrl });
});

// -------------------- DATABASE CONNECTION --------------------


const connectDB = async (retries = 5, delay = 5000) => {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://vasanravi12032004:vasan100vasan100@cluster3.9jyjy3k.mongodb.net/Rmj';

  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
      return;
    } catch (err) {
      console.error(`❌ MongoDB Connection Error (attempt ${i + 1}/${retries}):`, err.message);
      if (i < retries - 1) {
        console.log(`🔁 Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  throw new Error('❌ Failed to connect to MongoDB after multiple attempts');
};

// Start connection
connectDB().catch(err => {
  console.error('🚨 Final MongoDB connection failure:', err.message);
  process.exit(1);
});




// -------------------- HEALTH CHECK --------------------
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    timestamp: new Date(),
    database: dbStatus,
    uptime: process.uptime()
  });
});

// -------------------- ERROR HANDLERS --------------------
// General error middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// 404 middleware
app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// -------------------- START SERVER --------------------
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// -------------------- GRACEFUL SHUTDOWN --------------------
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down gracefully.');
  server.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close(false).then(() => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    }).catch(err => {
      console.error('Error closing MongoDB connection:', err);
      process.exit(1);
    });
  });
});

// Export app for testing
module.exports = app;

