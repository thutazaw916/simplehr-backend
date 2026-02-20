const Leave = require('../models/Leave');

// ခွင့်တောင်း (POST /api/leaves)
const requestLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid date range' });
    }

    // Check leave balance
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    const approvedLeaves = await Leave.find({
      user: req.user._id,
      status: 'approved',
      startDate: { $gte: yearStart, $lte: yearEnd },
      leaveType: leaveType
    });

    let usedDays = 0;
    approvedLeaves.forEach(l => { usedDays += l.totalDays; });

    // Myanmar Labor Law limits
    const limits = { casual: 6, sick: 30, annual: 10 };
    const limit = limits[leaveType];

    if (limit && (usedDays + totalDays) > limit) {
      return res.status(400).json({
        success: false,
        message: `${leaveType} leave limit exceeded. Used: ${usedDays}, Requesting: ${totalDays}, Max: ${limit}`
      });
    }

    const leave = await Leave.create({
      user: req.user._id,
      company: req.user.company,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason
    });

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted',
      data: leave
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ကိုယ့်ခွင့်စာရင်း (GET /api/leaves/my)
const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ user: req.user._id })
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ခွင့်ရက်ကျန် (GET /api/leaves/balance)
const getLeaveBalance = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    const approvedLeaves = await Leave.find({
      user: req.user._id,
      status: 'approved',
      startDate: { $gte: yearStart, $lte: yearEnd }
    });

    let casualUsed = 0, sickUsed = 0, annualUsed = 0, unpaidUsed = 0, otherUsed = 0;

    approvedLeaves.forEach(l => {
      if (l.leaveType === 'casual') casualUsed += l.totalDays;
      else if (l.leaveType === 'sick') sickUsed += l.totalDays;
      else if (l.leaveType === 'annual') annualUsed += l.totalDays;
      else if (l.leaveType === 'unpaid') unpaidUsed += l.totalDays;
      else otherUsed += l.totalDays;
    });

    // Myanmar Labor Law Leave Entitlements
    const casualTotal = 6;
    const earnedTotal = 10;
    const sickTotal = 30;
    const maternityTotal = 98;  // 14 weeks
    const paternityTotal = 15;

    const balance = {
      casual: {
        total: casualTotal,
        used: casualUsed,
        remaining: Math.max(0, casualTotal - casualUsed)
      },
      earned: {
        total: earnedTotal,
        used: annualUsed,
        remaining: Math.max(0, earnedTotal - annualUsed)
      },
      sick: {
        total: sickTotal,
        used: sickUsed,
        remaining: Math.max(0, sickTotal - sickUsed)
      },
      maternity: {
        total: maternityTotal,
        used: 0,
        remaining: maternityTotal
      },
      paternity: {
        total: paternityTotal,
        used: 0,
        remaining: paternityTotal
      },
      unpaid: {
        total: 0,
        used: unpaidUsed,
        remaining: 0
      },
      totalUsed: casualUsed + sickUsed + annualUsed + unpaidUsed + otherUsed,
      totalRemaining: Math.max(0, casualTotal - casualUsed) + Math.max(0, earnedTotal - annualUsed) + Math.max(0, sickTotal - sickUsed),
      year: currentYear
    };

    return res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ခွင့်စာရင်းအကုန် - Owner/HR (GET /api/leaves)
const getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { company: req.user.company };
    if (status) filter.status = status;

    const leaves = await Leave.find(filter)
      .populate('user', 'name phone role')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ခွင့်ခွင့်ပြု (PUT /api/leaves/:id/approve)
const approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Leave already processed' });
    }

    leave.status = 'approved';
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();

    await leave.save();

    return res.json({
      success: true,
      message: 'Leave approved',
      data: leave
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ခွင့်ပယ်ချ (PUT /api/leaves/:id/reject)
const rejectLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Leave already processed' });
    }

    leave.status = 'rejected';
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    leave.rejectReason = req.body.reason || '';

    await leave.save();

    return res.json({
      success: true,
      message: 'Leave rejected',
      data: leave
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { requestLeave, getMyLeaves, getLeaveBalance, getAllLeaves, approveLeave, rejectLeave };