const mongoose = require('mongoose');


// Contact Schema
const contactSchema = new mongoose.Schema({
    name: String,
    email: { type: String, required: true },
    phone: String,
    message: String,
    createdAt: { type: Date, default: Date.now }
  });

  


  const Contact = mongoose.model('Contact', contactSchema);


  
module.exports = Contact;