const Payroll = require('../models/Payroll');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Overtime = require('../models/Overtime');
const AdvanceSalary = require('../models/AdvanceSalary');
const PaymentConfig = require('../models/PaymentConfig');
const User = require('../models/User');

// Helper: Calculate Myanmar SSB
const calculateSSB = (basicSalary, ssbSettings) => {
  if (!ssbSettings || !ssbSettings.enabled) return { employee: 0, employer: 0 };
  
  const cappedSalary = Math.min(basicSalary, ssbSettings.maxSalaryForSSB || 300000);
  const employeeContribution = Math.round(cappedSalary * (ssbSettings.employeeRate || 2) / 100);
  const employerContribution = Math.round(cappedSalary * (ssbSettings.employerRate || 3) / 100);
  
  return { employee: employeeContribution, employer: employerContribution };
};

// Helper: Calculate Myanmar Income Tax (2024-2025 rates)
const calculateIncomeTax = (annualIncome) => {
  // Myanmar Income Tax Brackets (Annual)
  // 0 - 2,000,000: 0%
  // 2,000,001 - 5,000,000: 5%
  // 5,000,001 - 10,000,000: 10%
  // 10,000,001 - 20,000,000: 15%
  // 20,000,001 - 30,000,000: 20%
  // 30,000,001+: 25%
  
  let tax = 0;
  let remaining = annualIncome;
  
  if (remaining <= 2000000) return { tax: 0, rate: 0 };
  
  // 0% bracket
  remaining -= 2000000;
  
  // 5% bracket (2M - 5M)
  if (remaining > 0) {
    const taxable = Math.min(remaining, 3000000);
    tax += taxable * 0.05;
    remaining -= taxable;
  }
  
  // 10% bracket (5M - 10M)
  if (remaining > 0) {
    const taxable = Math.min(remaining, 5000000);
    tax += taxable * 0.10;
    remaining -= taxable;
  }
  
  // 15% bracket (10M - 20M)
  if (remaining > 0) {
    const taxable = Math.min(remaining, 10000000);
    tax += taxable * 0.15;
    remaining -= taxable;
  }
  
  // 20% bracket (20M - 30M)
  if (remaining > 0) {
    const taxable = Math.min(remaining, 10000000);
    tax += taxable * 0.20;
    remaining -= taxable;
  }
  
  // 25% bracket (30M+)
  if (remaining > 0) {
    tax += remaining * 0.25;
  }
  
  const monthlyTax = Math.round(tax / 12);
  const effectiveRate = annualIncome > 0 ? Math.round((tax / annualIncome) * 100 * 100) / 100 : 0;
  
  return { tax: monthlyTax, rate: effectiveRate };
};

// Helper: Calculate Overtime Pay
const calculateOvertimePay = (basicSalary, workingDays, overtimeHours, settings) => {
  const hourlyRate = basicSalary / workingDays / 8;
  
  const normalAmount = Math.round(overtimeHours.normal * hourlyRate * (settings?.normalRate || 1.5));
  const holidayAmount = Math.round(overtimeHours.holiday * hourlyRate * (settings?.holidayRate || 2));
  const weekendAmount = Math.round(overtimeHours.weekend * hourlyRate * (settings?.weekendRate || 2));
  
  return {
    normalAmount,
    holidayAmount,
    weekendAmount,
    totalAmount: normalAmount + holidayAmount + weekendAmount
  };
};

// Generate Payroll (POST /api/payroll/generate)
const generatePayroll = async (req, res) => {
  try {
    const { userId, month, year, basicSalary, allowances, manualDeductions } = req.body;
    
    // Check existing
    const existing = await Payroll.findOne({ user: userId, month, year });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Payroll already exists for this month' });
    }
    
    // Get company config
    let config = await PaymentConfig.findOne({ company: req.user.company });
    if (!config) {
      config = await PaymentConfig.create({ company: req.user.company });
    }
    
    const workingDays = config.workingHours?.workDaysPerMonth || 22;
    
    // Date range
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    // Attendance Data
    const attendances = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    const presentDays = attendances.filter(a => a.status === 'present').length;
    const lateDays = attendances.filter(a => a.status === 'late').length;
    const totalWorkDays = presentDays + lateDays;
    
    // Leave Data
    const approvedLeaves = await Leave.find({
      user: userId,
      status: 'approved',
      startDate: { $gte: startDate, $lte: endDate }
    });
    
    let leaveDays = 0;
    let casualUsed = 0, earnedUsed = 0, sickUsed = 0;
    approvedLeaves.forEach(leave => {
      leaveDays += leave.totalDays;
      if (leave.leaveType === 'casual') casualUsed += leave.totalDays;
      else if (leave.leaveType === 'annual') earnedUsed += leave.totalDays;
      else if (leave.leaveType === 'sick') sickUsed += leave.totalDays;
    });
    
    const absentDays = Math.max(0, workingDays - totalWorkDays - leaveDays);
    
    // Overtime Data
    const approvedOT = await Overtime.find({
      user: userId,
      status: 'approved',
      date: { $gte: startDate, $lte: endDate }
    });
    
    let normalOTHours = 0, holidayOTHours = 0, weekendOTHours = 0;
    approvedOT.forEach(ot => {
      if (ot.type === 'normal') normalOTHours += ot.hours;
      else if (ot.type === 'holiday') holidayOTHours += ot.hours;
      else if (ot.type === 'weekend') weekendOTHours += ot.hours;
    });
    
    const otPay = calculateOvertimePay(basicSalary, workingDays, {
      normal: normalOTHours,
      holiday: holidayOTHours,
      weekend: weekendOTHours
    }, config.overtimeSettings);
    
    // Allowances
    const transportAllowance = allowances?.transport || 0;
    const mealAllowance = allowances?.meal || 0;
    const housingAllowance = allowances?.housing || 0;
    const phoneAllowance = allowances?.phone || 0;
    const positionAllowance = allowances?.position || 0;
    const otherAllowance = allowances?.other || 0;
    const totalAllowances = transportAllowance + mealAllowance + housingAllowance + phoneAllowance + positionAllowance + otherAllowance;
    
    // SSB Calculation
    const ssb = calculateSSB(basicSalary, config.ssbSettings);
    
    // Gross Salary
    const grossSalary = basicSalary + totalAllowances + otPay.totalAmount;
    
    // Income Tax
    const annualIncome = grossSalary * 12;
    const tax = calculateIncomeTax(annualIncome);
    
    // Advance Salary Check
    const pendingAdvances = await AdvanceSalary.find({
      user: userId,
      status: 'approved',
      deductMonth: month,
      deductYear: year
    });
    
    let advanceDeduction = 0;
    pendingAdvances.forEach(adv => { advanceDeduction += adv.amount; });
    
    // Late Penalty
    const latePenaltyAmount = config.latePenalty?.enabled
      ? Math.min(lateDays * (config.latePenalty?.penaltyPerLate || 2000), config.latePenalty?.maxPenaltyPerMonth || 50000)
      : 0;
    
    // Absent Penalty
    const absentPenaltyAmount = absentDays > 0 ? Math.round(absentDays * (basicSalary / workingDays)) : 0;
    
    // Other manual deductions
    const loanDeduction = manualDeductions?.loan || 0;
    const otherDeduction = manualDeductions?.other || 0;
    
    // Total Deductions
    const totalDeductions = ssb.employee + tax.tax + latePenaltyAmount + absentPenaltyAmount + advanceDeduction + loanDeduction + otherDeduction;
    
    // Net Salary
    const netSalary = grossSalary - totalDeductions;
    
    // Create Payroll
    const payroll = await Payroll.create({
      user: userId,
      company: req.user.company,
      month,
      year,
      basicSalary,
      workingDays,
      presentDays,
      lateDays,
      absentDays,
      leaveDays,
      overtime: {
        normalHours: normalOTHours,
        holidayHours: holidayOTHours,
        normalRate: config.overtimeSettings?.normalRate || 1.5,
        holidayRate: config.overtimeSettings?.holidayRate || 2,
        normalAmount: otPay.normalAmount,
        holidayAmount: otPay.holidayAmount + otPay.weekendAmount,
        totalAmount: otPay.totalAmount
      },
      allowances: {
        transport: transportAllowance,
        meal: mealAllowance,
        housing: housingAllowance,
        phone: phoneAllowance,
        position: positionAllowance,
        other: otherAllowance
      },
      ssb: {
        employeeContribution: ssb.employee,
        employerContribution: ssb.employer,
        isApplicable: config.ssbSettings?.enabled || true
      },
      incomeTax: {
        taxableIncome: grossSalary,
        taxAmount: tax.tax,
        taxRate: tax.rate
      },
      advanceSalary: {
        amount: advanceDeduction
      },
      leaveBalance: {
        casual: { total: config.leaveSettings?.casualLeave || 6, used: casualUsed, remaining: (config.leaveSettings?.casualLeave || 6) - casualUsed },
        earned: { total: config.leaveSettings?.earnedLeave || 10, used: earnedUsed, remaining: (config.leaveSettings?.earnedLeave || 10) - earnedUsed },
        sick: { total: config.leaveSettings?.sickLeave || 30, used: sickUsed, remaining: (config.leaveSettings?.sickLeave || 30) - sickUsed }
      },
      deductions: {
        ssb: ssb.employee,
        tax: tax.tax,
        latePenalty: latePenaltyAmount,
        absentPenalty: absentPenaltyAmount,
        advanceSalary: advanceDeduction,
        loan: loanDeduction,
        other: otherDeduction
      },
      totalAllowances,
      totalOvertimePay: otPay.totalAmount,
      totalDeductions,
      grossSalary,
      netSalary
    });
    
    // Mark advance salaries as deducted
    await AdvanceSalary.updateMany(
      { user: userId, status: 'approved', deductMonth: month, deductYear: year },
      { status: 'deducted' }
    );
    
    return res.status(201).json({
      success: true,
      message: 'Payroll generated with Myanmar SSB & Tax',
      data: payroll
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get Payrolls (GET /api/payroll)
const getPayrolls = async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = { company: req.user.company };
    if (month) filter.month = month;
    if (year) filter.year = year;
    
    const payrolls = await Payroll.find(filter)
      .populate('user', 'name phone role')
      .sort({ createdAt: -1 });
    
    return res.json({ success: true, count: payrolls.length, data: payrolls });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// My Payroll (GET /api/payroll/my)
const getMyPayroll = async (req, res) => {
  try {
    const payrolls = await Payroll.find({ user: req.user._id })
      .sort({ year: -1, month: -1 });
    
    return res.json({ success: true, count: payrolls.length, data: payrolls });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Payroll Detail (GET /api/payroll/:id)
const getPayrollDetail = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('user', 'name phone role')
      .populate('advanceSalary.approvedBy', 'name')
      .populate('paymentDetails.paidBy', 'name');
    
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }
    
    return res.json({ success: true, data: payroll });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Confirm Payroll (PUT /api/payroll/:id/confirm)
const confirmPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll not found' });
    
    payroll.status = 'confirmed';
    await payroll.save();
    
    return res.json({ success: true, message: 'Payroll confirmed', data: payroll });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Pay Salary (PUT /api/payroll/:id/pay)
const markAsPaid = async (req, res) => {
  try {
    const { paymentMethod, transactionId, accountNumber, accountName, note } = req.body;
    
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll not found' });
    
    payroll.status = 'paid';
    payroll.paymentMethod = paymentMethod || 'cash';
    payroll.paymentDetails = {
      transactionId: transactionId || '',
      accountNumber: accountNumber || '',
      accountName: accountName || '',
      paidAt: new Date(),
      paidBy: req.user._id,
      note: note || ''
    };
    
    await payroll.save();
    
    return res.json({ success: true, message: 'Salary paid successfully', data: payroll });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { generatePayroll, getPayrolls, getMyPayroll, getPayrollDetail, confirmPayroll, markAsPaid };