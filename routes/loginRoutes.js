const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { User } = require('../models');
const nodemailer = require('nodemailer');

// Configure nodemailer
let transporter;
try {
  transporter = nodemailer.createTransport({
    service: 'gmail', // or another email service provider
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD // Use app password for Gmail
    }
  });
  
  console.log('Email config attempted with:', {
    user: process.env.EMAIL_USER ? 'EMAIL_USER is set' : 'EMAIL_USER is NOT set',
    pass: process.env.EMAIL_APP_PASSWORD ? 'EMAIL_APP_PASSWORD is set' : 'EMAIL_APP_PASSWORD is NOT set'
  });
  
  // Test the connection
  transporter.verify(function(error, success) {
    if (error) {
      console.error('Email verification error:', error);
    } else {
      console.log('Email server is ready to send messages');
    }
  });
} catch (error) {
  console.error('Email configuration error:', error);
}

// In-memory storage for verification codes (in production, use a database)
const verificationCodes = new Map();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, verificationCode } = req.body;
    
    // If verification code is not provided, it's the initial registration request
    if (!verificationCode) {
      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Generate a 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the code with expiration time (15 minutes)
      verificationCodes.set(email, {
        code: code,
        firstName,
        lastName,
        password,
        phoneNumber,
        expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
      });
      
      // Send verification email
      if (transporter) {
        try {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Account Verification Code',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #333;">Account Verification</h2>
                <p>Your verification code is:</p>
                <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; text-align: center; font-size: 24px; letter-spacing: 3px; margin: 20px 0;">
                  <strong>${code}</strong>
                </div>
                <p>This code will expire in 15 minutes.</p>
                <p>If you didn't request this verification, you can safely ignore this email.</p>
                <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message, please do not reply.</p>
              </div>
            `
          };
          
          await transporter.sendMail(mailOptions);
          
          return res.status(200).json({ message: 'Verification code sent to your email' });
        } catch (emailError) {
          console.error('Email sending error:', emailError);
          return res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
        }
      } else {
        return res.status(500).json({ message: 'Email service not configured. Please contact support.' });
      }
    }
    
    // Verify the code for final registration
    const storedData = verificationCodes.get(email);
    if (!storedData) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }
    
    if (storedData.code !== verificationCode) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    
    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(email);
      return res.status(400).json({ message: 'Verification code has expired' });
    }
    
    // Create new user
    const user = new User({
      firstName: storedData.firstName,
      lastName: storedData.lastName,
      email,
      password: storedData.password,
      phoneNumber: storedData.phoneNumber
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret', 
      { expiresIn: '1h' }
    );
    
    // Remove the verification code
    verificationCodes.delete(email);
    
    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      userId: user._id,
      firstName: user.firstName
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      userId: user._id,
      firstName: user.firstName
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Password reset request
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the code with expiration time (15 minutes)
    verificationCodes.set(email, {
      code: verificationCode,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    });
    
    // Send email with verification code
    if (transporter) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Password Reset Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p>We received a request to reset your password. Use the verification code below to complete the process:</p>
              <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; text-align: center; font-size: 24px; letter-spacing: 3px; margin: 20px 0;">
                <strong>${verificationCode}</strong>
              </div>
              <p>This code will expire in 15 minutes.</p>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
              <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message, please do not reply.</p>
            </div>
          `
        };
        
        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ 
          message: 'Verification code sent to your email'
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
      }
    } else {
      console.error('Email transporter not configured');
      res.status(500).json({ message: 'Email service not configured. Please contact support.' });
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify the code and reset the password
router.post('/reset-password-verify', async (req, res) => {
  try {
    const { email, verificationCode, newPassword } = req.body;
    
    // Check if verification code exists and is valid
    const storedData = verificationCodes.get(email);
    if (!storedData) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }
    
    if (storedData.code !== verificationCode) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    
    // Check if the code is expired
    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(email); // Remove expired code
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set new password directly on the user object
    // No need to hash here since the pre-save hook will handle it
    user.password = newPassword;
    await user.save();

    // Remove the verification code after successful reset
    verificationCodes.delete(email);

    res.status(200).json({ message: 'Password reset successfully. You can now log in.' });

  } catch (error) {
    console.error('Password reset verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
