const express = require('express');
const router = express.Router();
const { Contact } = require('../models');

// Contact form submission
router.post('/contacts', async (req, res) => {
  try {
    console.log('Received contact form submission:', req.body);
    
    const { name, email, phone, message } = req.body;
    
    // Create new contact entry
    const newContact = new Contact({
      name,
      email,
      phone,
      message
    });

    // Save to database
    const savedContact = await newContact.save();
    
    console.log('Contact saved:', savedContact);
    
    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully',
      data: savedContact
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting form',
      error: error.message
    });
  }
});

// Get all contacts (for admin purposes)
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts',
      error: error.message
    });
  }
});

module.exports = router;