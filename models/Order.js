const mongoose = require('mongoose');

//======================================================
// Order Schema Definition
//======================================================

const orderSchema = new mongoose.Schema({
  // Original jewelry shop fields
  orderData: [{
    productName: String,
    price: String,
    quantity: String,
    size: String,
    total: String,
    Variant: String,
    Image: String,
    Customization: mongoose.Schema.Types.Mixed,
  }],
  
  // Dashboard server fields - also capturing orderItems with different structure
  orderItems: [{
    productName: String,
    quantity: Number,
    price: Number
  }],
  
  // Common fields from both servers
  orderSummary: [{
    label: String,
    value: String
  }],
  
  customerDetails: {
    name: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  
  paymentDetails: {
    paymentId: String,
    status: {
      type: String,
      enum: ['Pending', 'Successful', 'Failed', 'Refunded', 'Partially Paid', 'Completed'],
      default: 'Pending'
    },
    method: String
  },
  
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
    default: 'Pending'
  },
  
  totalAmount: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Helper methods
// Find order by ID (handles multiple ID formats)
orderSchema.statics.findOrderByOrderId = async function(orderId) {
  try {
    // Try to find by MongoDB ID first if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      const orderById = await this.findById(orderId);
      if (orderById) return orderById;
    }
    
    // Try with and without ORD- prefix
    const queries = [
      orderId,
      orderId.startsWith('ORD-') ? orderId : `ORD-${orderId}`
    ];
    
    // Search by Order ID in orderSummary
    for (const query of queries) {
      const order = await this.findOne({
        'orderSummary': {
          $elemMatch: {
            label: 'Order ID',
            value: query
          }
        }
      });
      
      if (order) return order;
    }
    
    return null;
  } catch (err) {
    console.error('Error in findOrderByOrderId:', err);
    return null;
  }
};

//======================================================
// Create and Export Order Model
//======================================================

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;