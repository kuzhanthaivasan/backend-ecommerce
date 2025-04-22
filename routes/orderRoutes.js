const express = require('express');
const router = express.Router();
const {Order} = require('../models');

// Helper functions
// Format date consistently
function formatDate(date) {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-GB'); // Use DD/MM/YYYY format
  } catch (e) {
    return '';
  }
}

// Process image paths
function getImagePath(imagePath) {
  if (!imagePath) return null;
  
  // If it's already a complete URL or base64 string, use it directly
  if (imagePath.startsWith('data:image') || imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // If it's a placeholder path, keep it as is
  if (imagePath.startsWith('/api/placeholder')) {
    return imagePath;
  }
  
  // Otherwise assume it's a filename that needs the uploads prefix
  return `/uploads/${imagePath}`;
}

//======================================================
// Route: Get All Orders
//======================================================

router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    
    // Transform data to match the frontend format
    const formattedOrders = orders.map(order => {
      try {
        // Find order ID from orderSummary or use MongoDB ID
        const orderIdObj = order.orderSummary.find(item => item.label === "Order ID");
        const orderId = orderIdObj ? orderIdObj.value : `ORD-${order._id}`;
        
        // Find order date from orderSummary or use createdAt
        const orderDateObj = order.orderSummary.find(item => item.label === "Order Date");
        const orderDate = orderDateObj ? orderDateObj.value.split(',')[0] : 
                         formatDate(order.createdAt);
        
        // Map items with proper structure and improved customization handling
        const processedItems = (order.orderData || []).map((item, index) => {
          // Process customization data based on type
          let processedCustomization = null;
          
          if (item.Customization) {
            const customType = item.Customization.type;
            
            if (customType === 'fingerprint') {
              processedCustomization = {
                type: 'fingerprint',
                uploadedFile: item.Customization.uploadedFile || null,
                imageUrl: item.Customization.uploadedFile ? getImagePath(item.Customization.uploadedFile) : null,
                fileData: item.Customization.fileData || null,
                _id: item.Customization._id || null
              };
            } 
            else if (customType === 'engraving') {
              processedCustomization = {
                type: 'engraving',
                customName: item.Customization.customName || '',
                selectedFont: item.Customization.selectedFont || 'default',
                _id: item.Customization._id || null
              };
            } else  if (customType === 'image') {
              processedCustomization = {
                type: 'image',
                uploadedFile: item.Customization.uploadedFile || null,
                imageUrl: item.Customization.uploadedFile ? getImagePath(item.Customization.uploadedFile) : null,
                fileData: item.Customization.fileData || null,
                _id: item.Customization._id || null
              };
            } 
            else {
              // For any other customization type, pass through directly
              processedCustomization = item.Customization;
            }
          }
          
          return {
            id: item._id || `item-${index}`,
            name: item.productName || 'Unknown Product',
            quantity: parseInt(item.quantity) || 1,
            price: item.price || '₹0',
            size:item.size || 'N/A',
            total: item.total || '₹0',
            image: item.Image ? getImagePath(item.Image) : null,
            customization: processedCustomization
          };
        });
        
        return {
          id: orderId,
          customer: order.customerDetails?.name || 'Unknown Customer',
          date: orderDate,
          items: processedItems,
          total: order.totalAmount || 0,
          status: order.status || 'Pending',
          payment: { 
            method: order.paymentDetails?.method || 'Unknown', 
            status: order.paymentDetails?.status || 'Unknown' 
          },
          rawData: {
            customerDetails: {
              email: order.customerDetails?.email || '',
              phone: order.customerDetails?.phone || '',
              address: order.customerDetails?.address || '',
              city: order.customerDetails?.city || '',
              state: order.customerDetails?.state || '',
              zipCode: order.customerDetails?.zipCode || '',
              country: order.customerDetails?.country || ''
            },
            paymentDetails: {
              paymentId: order.paymentDetails?.paymentId || '',
              method: order.paymentDetails?.method || '',
              status: order.paymentDetails?.status || ''
            },
            totalAmount: order.totalAmount,
            createdAt: order.createdAt
          }
        };
      } catch (err) {
        console.error('Error processing order:', err);
        // Return a simplified version if there's an error
        return {
          id: `ORD-${order._id}`,
          customer: 'Data Error',
          date: formatDate(new Date()),
          items: [],
          total: 0,
          status: 'Error',
          payment: { method: 'Unknown', status: 'Unknown' },
          rawData: { error: 'Failed to process order data' }
        };
      }
    });
    
    res.json(formattedOrders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message
    });
  }
});

//======================================================
// Route: Get Single Order
//======================================================

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findOrderByOrderId(req.params.id);
    
    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found',
        searchedId: req.params.id
      });
    }
    
    // Find order ID
    const orderIdObj = order.orderSummary.find(item => item.label === "Order ID");
    const orderId = orderIdObj ? orderIdObj.value : `ORD-${order._id}`;
    
    // Find order date
    const orderDateObj = order.orderSummary.find(item => item.label === "Order Date");
    const orderDate = orderDateObj ? orderDateObj.value : formatDate(order.createdAt);
    
    // Process items with improved customization handling
    const processedItems = (order.orderData || []).map((item, index) => {
      // Process customization data based on type
      let processedCustomization = null;
      
      if (item.Customization) {
        const customType = item.Customization.type || 
                          (item.Customization.uploadedFile || item.Customization.fileData ? 'fingerprint' : 'engraving');
        
        if (customType === 'fingerprint') {
          // Ensure we're capturing all possible image data fields
          processedCustomization = {
            type: 'fingerprint',
            // Store all possible fingerprint image sources
            uploadedFile: item.Customization.uploadedFile || null,
            fileData: item.Customization.fileData || null,
            image: item.Customization.image || null,
            file: item.Customization.file || null,
            // Include notes if they exist
            notes: item.Customization.notes || '',
            _id: item.Customization._id || null
          };
        } else if (customType === 'image') {
          // Ensure we're capturing all possible image data fields
          processedCustomization = {
            type: 'image',
            // Store all possible fingerprint image sources
            uploadedFile: item.Customization.uploadedFile || null,
            fileData: item.Customization.fileData || null,
            image: item.Customization.image || null,
            file: item.Customization.file || null,
            // Include notes if they exist
            notes: item.Customization.notes || '',
            _id: item.Customization._id || null
          };
        } 
        else if (customType === 'engraving' || customType === 'text') {
          processedCustomization = {
            type: 'text',
            // Capture all possible text field variations
            text: item.Customization.text || item.Customization.customName || '',
            font: item.Customization.font || item.Customization.selectedFont || 'default',
            // Keep the original structure for backward compatibility
            customName: item.Customization.customName || '',
            selectedFont: item.Customization.selectedFont || 'default',
            _id: item.Customization._id || null
          };
        }
        else if (customType === 'combined') {
          // Handle combined customization (text + image)
          processedCustomization = {
            type: 'combined',
            // Text information
            text: item.Customization.text || '',
            font: item.Customization.font || 'default',
            // Image information
            image: item.Customization.image || null,
            file: item.Customization.file || null,
            uploadedFile: item.Customization.uploadedFile || null,
            fileData: item.Customization.fileData || null,
            _id: item.Customization._id || null
          };
        }
        else {
          // For any other customization type, pass through directly
          processedCustomization = {
            ...item.Customization,
            type: customType
          };
        }
      }
      
      // Process product image - ensure we're handling all possible image fields
      const productImage = item.Image || item.image || null;
      
      return {
        id: item._id || `item-${index}`,
        name: item.productName || 'Unknown Product',
        quantity: parseInt(item.quantity) || 1,
        price: item.price || '₹0',
        size:item.size || 'N/A',
        total: item.total || '₹0',
        // Properly handle image path
        image: productImage ? getImagePath(productImage) : null,
        // Use consistent naming for customization
        customization: processedCustomization
      };
    });
    
    const formattedOrder = {
      id: orderId,
      customer: order.customerDetails?.name || 'Unknown Customer',
      date: orderDate,
      items: processedItems,
      total: order.totalAmount || 0,
      status: order.status || 'Pending',
      payment: { 
        method: order.paymentDetails?.method || 'Unknown', 
        status: order.paymentDetails?.status || 'Unknown' 
      },
      rawData: {
        customerDetails: {
          email: order.customerDetails?.email || '',
          phone: order.customerDetails?.phone || '',
          address: order.customerDetails?.address || '',
          city: order.customerDetails?.city || '',
          state: order.customerDetails?.state || '',
          zipCode: order.customerDetails?.zipCode || '',
          country: order.customerDetails?.country || ''
        },
        paymentDetails: {
          paymentId: order.paymentDetails?.paymentId || '',
          method: order.paymentDetails?.method || '',
          status: order.paymentDetails?.status || ''
        },
        totalAmount: order.totalAmount,
        createdAt: order.createdAt
      }
    };
    
    res.json(formattedOrder);
  } catch (err) {
    console.error('Error fetching single order:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
});

//======================================================
// Route: Update Order Status
//======================================================

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate input
    const validStatuses = [
      'Pending', 
      'Processing', 
      'Shipped', 
      'Delivered', 
      'Cancelled', 
      'Refunded'
    ];

    if (!status) {
      return res.status(400).json({ 
        message: 'Status is required',
        validStatuses: validStatuses
      });
    }

    // Normalize status
    const normalizedStatus = status.charAt(0).toUpperCase() + 
                              status.slice(1).toLowerCase();

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ 
        message: 'Invalid status',
        validStatuses: validStatuses
      });
    }

    // Find the order by Order ID
    const order = await Order.findOrderByOrderId(req.params.id);
    
    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found', 
        searchedId: req.params.id 
      });
    }
    
    // Update status
    order.status = normalizedStatus;
    
    try {
      await order.save();

      // Find the Order ID from orderSummary or use MongoDB ID
      const orderIdItem = order.orderSummary.find(item => item.label === 'Order ID');
      const orderId = orderIdItem ? orderIdItem.value : `ORD-${order._id}`;
      
      res.json({ 
        message: 'Order status updated successfully', 
        order: {
          id: orderId,
          status: normalizedStatus
        }
      });
    } catch (saveError) {
      console.error('Error saving order status:', saveError);
      res.status(500).json({ 
        message: 'Failed to update order status', 
        error: saveError.message 
      });
    }
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ 
      message: 'Server error occurred while updating order status',
      error: err.message 
    });
  }
});

//======================================================
// Route: Update Payment Status
//======================================================

router.put('/orders/:id/payment', async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate input
    const validPaymentStatuses = [
      'Pending', 
      'Successful', 
      'Failed', 
      'Refunded',
      'Partially Paid'
    ];

    if (!status) {
      return res.status(400).json({ 
        message: 'Payment status is required',
        validStatuses: validPaymentStatuses
      });
    }

    // Normalize payment status
    const normalizedPaymentStatus = status.charAt(0).toUpperCase() + 
                                    status.slice(1).toLowerCase();

    if (!validPaymentStatuses.includes(normalizedPaymentStatus)) {
      return res.status(400).json({ 
        message: 'Invalid payment status',
        validStatuses: validPaymentStatuses
      });
    }

    // Find the order by Order ID
    const order = await Order.findOrderByOrderId(req.params.id);
    
    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found', 
        searchedId: req.params.id 
      });
    }
    
    // Ensure paymentDetails exists and update
    if (!order.paymentDetails) {
      order.paymentDetails = { 
        status: normalizedPaymentStatus, 
        method: 'Unknown', 
        paymentId: 'Unknown' 
      };
    } else {
      order.paymentDetails.status = normalizedPaymentStatus;
    }
    
    try {
      await order.save();

      // Find the Order ID from orderSummary or use MongoDB ID
      const orderIdItem = order.orderSummary.find(item => item.label === 'Order ID');
      const orderId = orderIdItem ? orderIdItem.value : `ORD-${order._id}`;
      
      res.json({ 
        message: 'Payment status updated successfully', 
        order: {
          id: orderId,
          payment: {
            status: normalizedPaymentStatus,
            method: order.paymentDetails.method || 'Unknown'
          }
        }
      });
    } catch (saveError) {
      console.error('Error saving payment status:', saveError);
      res.status(500).json({ 
        message: 'Failed to update payment status', 
        error: saveError.message 
      });
    }
  } catch (err) {
    console.error('Error updating payment status:', err);
    res.status(500).json({ 
      message: 'Server error occurred while updating payment status',
      error: err.message 
    });
  }
});





// ... rest of the code ...

//======================================================
// Route: Delete Order
//======================================================

router.delete('/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Find the order by Order ID (consistent with other routes)
    const order = await Order.findOrderByOrderId(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found', 
        searchedId: orderId 
      });
    }
    
    // Delete the order
    await order.deleteOne();
    
    res.json({ 
      message: 'Order deleted successfully', 
      deletedOrderId: orderId 
    });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ 
      message: 'Server error occurred while deleting order',
      error: err.message 
    });
  }
});

module.exports = router;