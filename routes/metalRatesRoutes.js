
// routes/metalRatesRoutes.js
const express = require('express');
const router = express.Router();
const { MetalRate } = require('../models');

// Get latest metal rates
router.get('/rates', async (req, res) => {
  try {
    const latestRate = await MetalRate.findOne().sort({ createdAt: -1 });
    res.json(latestRate || { gold: { rate: 0, purity: '24K' }, silver: { rate: 0, purity: '999' }, gst: 0 });
  } catch (err) {
    console.error('Error fetching metal rates:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add/update metal rates
router.post('/rates', async (req, res) => {
  try {
    const { gold, silver, gst } = req.body;
    
    if (!gold || !silver || gst === undefined) {
      return res.status(400).json({ message: 'Gold rate, silver rate, and GST are required' });
    }
    
    const metalRate = new MetalRate({
      gold: {
        rate: gold.rate,
        purity: gold.purity || '24K'
      },
      silver: {
        rate: silver.rate,
        purity: silver.purity || '999'
      },
      gst
    });
    
    const savedRate = await metalRate.save();
    res.status(201).json(savedRate);
  } catch (err) {
    console.error('Error updating metal rates:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;