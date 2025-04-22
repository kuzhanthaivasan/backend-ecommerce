const express = require('express');
const router = express.Router();
const { Order } = require('../models');
const cors = require('cors');

// Enable CORS for all routes
router.use(cors());

// Get recent orders - Complete rewrite with simplified approach
router.get('/dashboard/orders/recent', async (req, res) => {
  try {
    console.log('Fetching recent orders...');
    
    // Simplified query with explicit projection of needed fields
    const recentOrders = await Order.find({}, {
      _id: 1,
      customerDetails: 1,
      createdAt: 1,
      totalAmount: 1,
      paymentDetails: 1,
      orderItems: 1
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
    console.log(`Found ${recentOrders.length} orders`);
    
    // Simplified transformation with direct field access
    const formattedOrders = recentOrders.map(order => {
      return {
        _id: order._id ? order._id.toString() : 'Unknown',
        customer: order.customerDetails?.name || order.customerDetails?.email || 'Unknown Customer',
        date: order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Unknown Date',
        total: parseFloat(order.totalAmount || 0).toFixed(2),
        status: order.paymentDetails?.status || 'Unknown',
        // Include these for frontend processing if needed
        items: Array.isArray(order.orderItems) ? order.orderItems : []
      };
    });
    
    console.log('Orders formatted successfully:', formattedOrders.length);
    
    // Send a successful response with the simplified format
    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ 
      message: 'Server error while fetching recent orders', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get dashboard summary statistics
router.get('/dashboard/summary', async (req, res) => {
  try {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    
    // Get all orders with lean query for better performance
    const allOrders = await Order.find().lean();
    
    // Calculate previous month date range for growth calculations
    const firstDayOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0, 23, 59, 59);
    
    // Total Sales Calculation
    const totalSales = allOrders.reduce((total, order) => total + (parseFloat(order.totalAmount) || 0), 0);
    
    // Utility function to safely parse dates
    const parseOrderDate = (orderCreatedAt) => {
      try {
        if (orderCreatedAt instanceof Date) return orderCreatedAt;
        if (typeof orderCreatedAt === 'string') return new Date(orderCreatedAt);
        if (orderCreatedAt && orderCreatedAt.$date) return new Date(orderCreatedAt.$date);
        return new Date(orderCreatedAt);
      } catch (err) {
        console.error('Error parsing date:', err);
        return new Date(); // Default to current date if parsing fails
      }
    };
    
    // Monthly Sales Calculation with proper date handling
    const monthlyOrders = allOrders.filter(order => {
      const orderDate = parseOrderDate(order.createdAt);
      return orderDate >= firstDayOfMonth && orderDate <= lastDayOfMonth;
    });
    
    const monthlySales = monthlyOrders.reduce((total, order) => total + (parseFloat(order.totalAmount) || 0), 0);
    
    // Previous month sales for growth calculation
    const prevMonthOrders = allOrders.filter(order => {
      const orderDate = parseOrderDate(order.createdAt);
      return orderDate >= firstDayOfPrevMonth && orderDate <= lastDayOfPrevMonth;
    });
    
    const prevMonthSales = prevMonthOrders.reduce((total, order) => total + (parseFloat(order.totalAmount) || 0), 0);
    
    // Calculate actual growth rates with safety checks
    let revenueGrowth = 0;
    if (prevMonthSales > 0) {
      revenueGrowth = ((monthlySales - prevMonthSales) / prevMonthSales * 100);
    } else if (monthlySales > 0) {
      revenueGrowth = 100; // If previous month was 0, but this month has sales, that's 100% growth
    }
    
    let ordersGrowth = 0;
    if (prevMonthOrders.length > 0) {
      ordersGrowth = ((monthlyOrders.length - prevMonthOrders.length) / prevMonthOrders.length * 100);
    } else if (monthlyOrders.length > 0) {
      ordersGrowth = 100; // If previous month had 0 orders, but this month has orders, that's 100% growth
    }
    
    // Unique Customers Calculation with proper null handling
    const uniqueCustomers = new Set(
      allOrders
        .map(order => order.customerDetails?.email || order.customerDetails?.name)
        .filter(identifier => identifier)
    );
    
    const uniqueCustomersPrevMonth = new Set(
      prevMonthOrders
        .map(order => order.customerDetails?.email || order.customerDetails?.name)
        .filter(identifier => identifier)
    );
    
    let customersGrowth = 0;
    if (uniqueCustomersPrevMonth.size > 0) {
      customersGrowth = ((uniqueCustomers.size - uniqueCustomersPrevMonth.size) / uniqueCustomersPrevMonth.size * 100);
    } else if (uniqueCustomers.size > 0) {
      customersGrowth = 100; // If previous month had 0 customers, but this month has customers, that's 100% growth
    }
    
    // Round all growth figures to one decimal place
    revenueGrowth = parseFloat(revenueGrowth.toFixed(1));
    ordersGrowth = parseFloat(ordersGrowth.toFixed(1));
    customersGrowth = parseFloat(customersGrowth.toFixed(1));
    
    // Add debug logging
    console.log('Dashboard summary data:', {
      totalSales,
      monthlySales,
      totalOrders: allOrders.length,
      totalCustomers: uniqueCustomers.size,
      revenueGrowth,
      ordersGrowth,
      customersGrowth
    });
    
    // Send a successful response
    res.status(200).json({
      totalSales,
      monthlySales,
      totalOrders: allOrders.length,
      totalCustomers: uniqueCustomers.size,
      revenueGrowth,
      ordersGrowth,
      customersGrowth
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ 
      message: 'Server error while fetching dashboard summary', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;