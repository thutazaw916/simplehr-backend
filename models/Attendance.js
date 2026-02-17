const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  checkIn: {
    time: { type: Date },
    note: { type: String, default: '' }
  },
  checkOut: {
    time: { type: Date },
    note: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'leave', 'half-day'],
    default: 'present'
  },
  workHours: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema);