const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {User} = require('../models');

// Helper for consistent error responses
const handleError = (res, error, message = 'Server error') => {
  console.error(`Error: ${message}:`, error);
  res.status(500).json({ 
    message, 
    error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message 
  });
};

// Helper function to safely convert to ObjectId
const toObjectId = (id) => {
  try {
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
  } catch (err) {
    return id;
  }
};

// Helper for determining document ID format
const findById = async (collection, id) => {
  let result = null;
  
  // Try with ObjectId first
  if (mongoose.Types.ObjectId.isValid(id)) {
    result = await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
  }
  
  // If not found, try with string ID
  if (!result) {
    result = await collection.findOne({ _id: id });
  }
  
  return result;
};

// Get all users
router.get('/users', async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database connection not established' });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Filter parameters
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.search) {
      filters.$or = [
        { firstName: new RegExp(req.query.search, 'i') },
        { lastName: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') }
      ];
    }

    // Using the User model
    const allUsers = await User.find(filters).skip(skip).limit(limit);
    const totalUsers = await User.countDocuments(filters);
    
    // Combine user data
    const formattedUsers = allUsers.map(user => ({
      _id: user._id.toString(),
      firstName: user.firstName || 'Unknown',
      lastName: user.lastName || '',
      email: user.email || 'No email',
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : 'Unknown',
      status: user.status || 'active'
    }));
    
    // Return with pagination info
    res.json({
      users: formattedUsers,
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    handleError(res, error, 'Error fetching users');
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database connection not established' });
    }
    
    // Find user
    const user = await User.findById(userId);
    
    // If no user found
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Format the response
    const userResponse = {
      id: user._id.toString(),
      firstName: user.firstName || 'Unknown',
      lastName: user.lastName || '',
      email: user.email || 'No email',
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : 'Unknown',
      status: user.status || 'active'
    };
    
    res.json(userResponse);
  } catch (error) {
    handleError(res, error, 'Error fetching user');
  }
});

// Delete user endpoint
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database connection not established' });
    }
    
    // Find and delete user
    const result = await User.findByIdAndDelete(userId);
    
    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully', userId: userId });
  } catch (error) {
    handleError(res, error, 'Error deleting user');
  }
});

module.exports = router;