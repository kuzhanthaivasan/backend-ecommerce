const express = require('express');
const path = require('path');
const fs = require('fs');
const { Order } = require('../models');
const crypto = require('crypto'); // For Razorpay payment verification
const Razorpay = require('razorpay'); // You'll need to install this package

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// File Upload Route
router.post('/upload', (req, res) => {
  const upload = req.app.locals.upload;
  
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ 
        success: false, 
        message: 'File upload error', 
        error: err.message 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    res.json({
      success: true,
      fileId: req.file.filename,
      fileUrl: `https://backend-e-commerce-4-clvh.onrender.com/api/files/${req.file.filename}`
    });
  });
});

// File Retrieval Route
router.get('/files/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ 
      success: false, 
      message: 'File not found' 
    });
  }
});

// Create Razorpay Order
router.post('/create-razorpay-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }
    
    // Amount should be in paise (multiply by 100)
    const amountInPaise = Math.round(parseFloat(amount) * 100);
    
    const options = {
      amount: amountInPaise,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture payment
    };
    
    const razorpayOrder = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      order: razorpayOrder
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating Razorpay order',
      error: error.message
    });
  }
});

// Verify Razorpay Payment
router.post('/verify-payment', async (req, res) => {
  try {
    const { 
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature 
    } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'All payment details are required'
      });
    }
    
    // Verify the payment signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
      
    const isSignatureValid = expectedSignature === razorpay_signature;
    
    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
    
    // Payment is verified
    res.json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: razorpay_payment_id
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
});

// Order Saving Route with Razorpay integration
router.post('/orders', async (req, res) => {
    try {
      const {
        orderData,
        orderSummary,
        customerDetails,
        paymentDetails
      } = req.body;
  
      // Validate input
      if (!orderData || !Array.isArray(orderData) || orderData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Order data is required and must be an array'
        });
      }
      
      // Validate Razorpay payment if payment method is Razorpay
      if (paymentDetails && paymentDetails.method === 'razorpay') {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentDetails;
        
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return res.status(400).json({
            success: false,
            message: 'Incomplete Razorpay payment details'
          });
        }
        
        // Verify the payment signature
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');
          
        if (expectedSignature !== razorpay_signature) {
          return res.status(400).json({
            success: false,
            message: 'Invalid payment signature'
          });
        }
        
        // Optionally, you can also verify the payment status with Razorpay API
        try {
          const payment = await razorpay.payments.fetch(razorpay_payment_id);
          if (payment.status !== 'captured') {
            return res.status(400).json({
              success: false,
              message: `Payment not completed. Status: ${payment.status}`
            });
          }
        } catch (paymentError) {
          return res.status(400).json({
            success: false,
            message: 'Error verifying payment with Razorpay',
            error: paymentError.message
          });
        }
      }
  
      // Calculate total amount with proper numeric handling
      let totalAmount = 0;
      const processedOrderData = orderData.map(item => {
        // Ensure price is a valid number
        const priceString = String(item.price || 0).replace(/[^\d.-]/g, '');
        const price = parseFloat(priceString) || 0;
        
        // Ensure quantity is a valid number
        const quantity = parseInt(item.quantity) || 1;
        
        // Calculate item total with proper precision
        const itemTotal = price * quantity;
        totalAmount += itemTotal;
        
        return {
          ...item,
          price: price,
          quantity: quantity,
          total: `₹ ${itemTotal.toFixed(2)}`
        };
      });
  
      // Ensure totalAmount has proper precision for storage
      totalAmount = Number(totalAmount.toFixed(2));
  
      // Create new order with validated data
      const newOrder = new Order({
        orderData: processedOrderData,
        orderSummary: orderSummary || {},
        customerDetails: customerDetails || {},
        paymentDetails: paymentDetails || {},
        totalAmount,
        status: paymentDetails?.method === 'razorpay' ? 'Paid' : 'Pending',
        createdAt: new Date()
      });
  
      // Save order to database
      const savedOrder = await newOrder.save();
  
      res.status(201).json({
        success: true,
        message: 'Order saved successfully',
        orderId: savedOrder._id
      });
    } catch (error) {
      console.error('Order saving error:', error);
      
      // More specific error handling
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error saving order',
        error: error.message
      });
    }
  });

// Get Razorpay Key ID for frontend use
router.get('/razorpay-key', (req, res) => {
  res.json({
    success: true,
    key: process.env.RAZORPAY_KEY_ID
  });
});
  
// Order Retrieval Routes
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving orders',
      error: error.message 
    });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving order',
      error: error.message 
    });
  }
});

module.exports = router;
