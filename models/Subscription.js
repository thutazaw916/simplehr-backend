const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro'],
    default: 'free'
  },
  maxEmployees: {
    type: Number,
    default: 5
  },
  price: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  payments: [{
    amount: Number,
    method: String,
    transactionId: String,
    paidAt: Date,
    note: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Subscription', subscriptionSchema);