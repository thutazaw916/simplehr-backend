const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
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
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  
  // Basic Salary
  basicSalary: { type: Number, required: true },
  
  // Working Days
  workingDays: { type: Number, default: 26 },
  presentDays: { type: Number, default: 0 },
  lateDays: { type: Number, default: 0 },
  absentDays: { type: Number, default: 0 },
  leaveDays: { type: Number, default: 0 },
  
  // Overtime (Myanmar Labor Law - 2x rate)
  overtime: {
    normalHours: { type: Number, default: 0 },   // ပုံမှန်အချိန်ပိုနာရီ (1.5x)
    holidayHours: { type: Number, default: 0 },   // ရုံးပိတ်ရက်အချိန်ပိုနာရီ (2x)
    normalRate: { type: Number, default: 0 },
    holidayRate: { type: Number, default: 0 },
    normalAmount: { type: Number, default: 0 },
    holidayAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 }
  },
  
  // Allowances
  allowances: {
    transport: { type: Number, default: 0 },
    meal: { type: Number, default: 0 },
    housing: { type: Number, default: 0 },
    phone: { type: Number, default: 0 },
    position: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  // SSB - Social Security Board (Myanmar)
  ssb: {
    employeeContribution: { type: Number, default: 0 },  // ဝန်ထမ်းထည့်ဝင်ငွေ (2%)
    employerContribution: { type: Number, default: 0 },   // အလုပ်ရှင်ထည့်ဝင်ငွေ (3%)
    isApplicable: { type: Boolean, default: true }
  },
  
  // Income Tax (Myanmar)
  incomeTax: {
    taxableIncome: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 }
  },
  
  // Advance Salary (လစာကြိုတင်ငွေ)
  advanceSalary: {
    amount: { type: Number, default: 0 },
    date: { type: Date },
    reason: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // Leave Balances (Myanmar Labor Law)
  leaveBalance: {
    casual: { total: { type: Number, default: 6 }, used: { type: Number, default: 0 }, remaining: { type: Number, default: 6 } },
    earned: { total: { type: Number, default: 10 }, used: { type: Number, default: 0 }, remaining: { type: Number, default: 10 } },
    sick: { total: { type: Number, default: 30 }, used: { type: Number, default: 0 }, remaining: { type: Number, default: 30 } },
    maternity: { total: { type: Number, default: 14 }, used: { type: Number, default: 0 }, remaining: { type: Number, default: 14 } },
    paternity: { total: { type: Number, default: 15 }, used: { type: Number, default: 0 }, remaining: { type: Number, default: 15 } }
  },
  
  // Deductions
  deductions: {
    ssb: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    latePenalty: { type: Number, default: 0 },
    absentPenalty: { type: Number, default: 0 },
    advanceSalary: { type: Number, default: 0 },
    loan: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  totalAllowances: { type: Number, default: 0 },
  totalOvertimePay: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  grossSalary: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  
  // Payment Info
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'processing', 'paid', 'failed'],
    default: 'draft'
  },
  
  paymentMethod: {
    type: String,
    enum: ['cash', 'kbzpay', 'wavepay', 'cbpay', 'ayapay', 'bank_transfer', 'kbz_bank', 'cb_bank', 'aya_bank', 'mab_bank'],
    default: 'cash'
  },
  
  paymentDetails: {
    transactionId: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountName: { type: String, default: '' },
    paidAt: { type: Date },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiptUrl: { type: String, default: '' },
    note: { type: String, default: '' }
  },
  
  note: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payroll', payrollSchema);