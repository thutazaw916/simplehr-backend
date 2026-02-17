const Payroll = require('../models/Payroll');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const User = require('../models/User');

// လစာတွက် (POST /api/payroll/generate)
const generatePayroll = async (req, res) => {
  try {
    const { userId, month, year, basicSalary, allowances, deductions } = req.body;

    const existing = await Payroll.findOne({ user: userId, month, year });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Payroll already exists for this month' });
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const attendances = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    });

    const presentDays = attendances.filter(a => a.status === 'present').length;
    const lateDays = attendances.filter(a => a.status === 'late').length;
    const totalWorkDays = presentDays + lateDays;

    const approvedLeaves = await Leave.find({
      user: userId,
      status: 'approved',
      startDate: { $gte: startDate, $lte: endDate }
    });

    let leaveDays = 0;
    approvedLeaves.forEach(leave => {
      leaveDays += leave.totalDays;
    });

    const workingDays = 26;
    const absentDays = workingDays - totalWorkDays - leaveDays;

    const transportAllowance = (allowances && allowances.transport) || 0;
    const mealAllowance = (allowances && allowances.meal) || 0;
    const otherAllowance = (allowances && allowances.other) || 0;
    const totalAllowances = transportAllowance + mealAllowance + otherAllowance;

    const taxDeduction = (deductions && deductions.tax) || 0;
    const latePenalty = lateDays * 2000;
    const absentPenalty = absentDays > 0 ? absentDays * (basicSalary / workingDays) : 0;
    const otherDeduction = (deductions && deductions.other) || 0;
    const totalDeductions = taxDeduction + latePenalty + Math.round(absentPenalty) + otherDeduction;

    const netSalary = basicSalary + totalAllowances - totalDeductions;

    const payroll = await Payroll.create({
      user: userId,
      company: req.user.company,
      month,
      year,
      basicSalary,
      workingDays,
      presentDays,
      lateDays,
      absentDays: absentDays > 0 ? absentDays : 0,
      leaveDays,
      allowances: {
        transport: transportAllowance,
        meal: mealAllowance,
        other: otherAllowance
      },
      deductions: {
        tax: taxDeduction,
        latePenalty,
        absentPenalty: Math.round(absentPenalty),
        other: otherDeduction
      },
      totalAllowances,
      totalDeductions,
      netSalary
    });

    return res.status(201).json({
      success: true,
      message: 'Payroll generated',
      data: payroll
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// လစာစာရင်း (GET /api/payroll)
const getPayrolls = async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = { company: req.user.company };
    if (month) filter.month = month;
    if (year) filter.year = year;

    const payrolls = await Payroll.find(filter)
      .populate('user', 'name phone role')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: payrolls.length,
      data: payrolls
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ကိုယ့်လစာ (GET /api/payroll/my)
const getMyPayroll = async (req, res) => {
  try {
    const payrolls = await Payroll.find({ user: req.user._id })
      .sort({ year: -1, month: -1 });

    return res.json({
      success: true,
      count: payrolls.length,
      data: payrolls
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// လစာ detail (GET /api/payroll/:id)
const getPayrollDetail = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('user', 'name phone role');

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    return res.json({ success: true, data: payroll });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// လစာ confirm (PUT /api/payroll/:id/confirm)
const confirmPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    payroll.status = 'confirmed';
    await payroll.save();

    return res.json({ success: true, message: 'Payroll confirmed', data: payroll });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// လစာ paid (PUT /api/payroll/:id/pay)
const markAsPaid = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    payroll.status = 'paid';
    payroll.paidAt = new Date();
    await payroll.save();

    return res.json({ success: true, message: 'Payroll marked as paid', data: payroll });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { generatePayroll, getPayrolls, getMyPayroll, getPayrollDetail, confirmPayroll, markAsPaid };