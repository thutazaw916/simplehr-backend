const mongoose = require('mongoose');

const paymentConfigSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

  officeLocation: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    address: { type: String, default: '' },
    radiusMeters: { type: Number, default: 200 }
  },

  kbzpay: { enabled: { type: Boolean, default: false }, accountName: { type: String, default: '' }, phoneNumber: { type: String, default: '' }, merchantId: { type: String, default: '' } },
  wavepay: { enabled: { type: Boolean, default: false }, accountName: { type: String, default: '' }, phoneNumber: { type: String, default: '' }, merchantId: { type: String, default: '' } },
  cbpay: { enabled: { type: Boolean, default: false }, accountName: { type: String, default: '' }, accountNumber: { type: String, default: '' } },
  ayapay: { enabled: { type: Boolean, default: false }, accountName: { type: String, default: '' }, phoneNumber: { type: String, default: '' } },

  bankAccounts: [{
    bankName: { type: String },
    accountName: { type: String },
    accountNumber: { type: String },
    branch: { type: String, default: '' },
    isDefault: { type: Boolean, default: false }
  }],

  ssbSettings: {
    enabled: { type: Boolean, default: true },
    employeeRate: { type: Number, default: 2 },
    employerRate: { type: Number, default: 3 },
    maxSalaryForSSB: { type: Number, default: 300000 }
  },

  overtimeSettings: {
    normalRate: { type: Number, default: 1.5 },
    holidayRate: { type: Number, default: 2 },
    weekendRate: { type: Number, default: 2 },
    maxOvertimePerDay: { type: Number, default: 4 },
    maxOvertimePerWeek: { type: Number, default: 12 }
  },

  leaveSettings: {
    casualLeave: { type: Number, default: 6 },
    earnedLeave: { type: Number, default: 10 },
    sickLeave: { type: Number, default: 30 },
    maternityLeave: { type: Number, default: 14 },
    paternityLeave: { type: Number, default: 15 },
    publicHolidays: { type: Number, default: 21 }
  },

  workingHours: {
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '17:00' },
    lunchBreak: { type: Number, default: 60 },
    workDaysPerWeek: { type: Number, default: 5 },
    workDaysPerMonth: { type: Number, default: 22 }
  },

  latePenalty: {
    enabled: { type: Boolean, default: true },
    graceMinutes: { type: Number, default: 15 },
    penaltyPerLate: { type: Number, default: 2000 },
    maxPenaltyPerMonth: { type: Number, default: 50000 }
  },

  attendanceBonus: {
    enabled: { type: Boolean, default: true },
    fullMonthBonus: { type: Number, default: 30000 },
    maxLateDays: { type: Number, default: 0 },
    maxAbsentDays: { type: Number, default: 0 },
    description: { type: String, default: 'Perfect attendance bonus' }
  },

  positions: [{
    name: { type: String },
    nameMM: { type: String, default: '' },
    level: { type: String, enum: ['executive', 'manager', 'senior', 'mid', 'junior', 'intern', 'other'], default: 'mid' }
  }]

}, { timestamps: true });

module.exports = mongoose.model('PaymentConfig', paymentConfigSchema);