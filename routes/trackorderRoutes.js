const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Order } = require('../models');

// Order Tracking Endpoint
router.get('/track-order/:orderNumber', async (req, res) => {
    try {
      const orderNumber = req.params.orderNumber;
      
      // Find order by Order ID from orderSummary
      const order = await Order.findOne({
        'orderSummary': {
          $elemMatch: {
            label: 'Order ID',
            value: orderNumber
          }
        }
      });
  
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      // Prepare response with key order details
      const orderStatus = {
        orderId: order.orderSummary.find(item => item.label === 'Order ID')?.value,
        orderDate: order.orderSummary.find(item => item.label === 'Order Date')?.value,
        totalAmount: order.orderSummary.find(item => item.label === 'Total Amount')?.value,
        paymentStatus: order.paymentDetails.status,
        status: order.status, // Order status from the database
        products: order.orderData.map(product => ({
          name: product.productName,
          quantity: product.quantity,
          price: product.price
        })),
        customerName: order.customerDetails.name,
        customerEmail: order.customerDetails.email,
        customerNumber:order.customerDetails.phone,
        customerAddress:order.customerDetails.address,
        customerCity:order.customerDetails.city,
        customerState:order.customerDetails.state,
        customerPincode:order.customerDetails.zipCode,
        customerCountry:order.customerDetails.country
      };
  
      res.json(orderStatus);
    } catch (error) {
      console.error('Error tracking order:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });


module.exports = router;
