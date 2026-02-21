const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 600 }
});

module.exports = mongoose.model('OTP', otpSchema);