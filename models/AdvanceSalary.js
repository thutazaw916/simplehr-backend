const mongoose = require('mongoose');

const advanceSalarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'deducted'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: { type: Date },
  rejectReason: { type: String, default: '' },
  
  // Which month's salary to deduct from
  deductMonth: { type: Number },
  deductYear: { type: Number },
  
  // Payment
  paymentMethod: {
    type: String,
    enum: ['cash', 'kbzpay', 'wavepay', 'cbpay', 'ayapay', 'bank_transfer'],
    default: 'cash'
  },
  paidAt: { type: Date },
  transactionId: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdvanceSalary', advanceSalarySchema);