const mongoose = require('mongoose');

const overtimeSchema = new mongoose.Schema({
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
  date: {
    type: String,
    required: true
  },
  hours: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['normal', 'holiday', 'weekend'],
    default: 'normal'
  },
  reason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('Overtime', overtimeSchema);