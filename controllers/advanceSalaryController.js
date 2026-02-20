const AdvanceSalary = require('../models/AdvanceSalary');

// Request Advance (POST /api/advance-salary)
const requestAdvance = async (req, res) => {
  try {
    const { amount, reason, deductMonth, deductYear } = req.body;
    
    const advance = await AdvanceSalary.create({
      user: req.user._id,
      company: req.user.company,
      amount,
      reason,
      deductMonth: deductMonth || new Date().getMonth() + 2,
      deductYear: deductYear || new Date().getFullYear()
    });
    
    return res.status(201).json({
      success: true,
      message: 'Advance salary requested',
      data: advance
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get All Advances (GET /api/advance-salary)
const getAdvances = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { company: req.user.company };
    if (status) filter.status = status;
    
    const advances = await AdvanceSalary.find(filter)
      .populate('user', 'name phone role')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });
    
    return res.json({ success: true, count: advances.length, data: advances });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// My Advances (GET /api/advance-salary/my)
const getMyAdvances = async (req, res) => {
  try {
    const advances = await AdvanceSalary.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    return res.json({ success: true, count: advances.length, data: advances });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Approve Advance (PUT /api/advance-salary/:id/approve)
const approveAdvance = async (req, res) => {
  try {
    const advance = await AdvanceSalary.findById(req.params.id);
    if (!advance) return res.status(404).json({ success: false, message: 'Not found' });
    
    advance.status = 'approved';
    advance.approvedBy = req.user._id;
    advance.approvedAt = new Date();
    await advance.save();
    
    return res.json({ success: true, message: 'Advance approved', data: advance });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Reject Advance (PUT /api/advance-salary/:id/reject)
const rejectAdvance = async (req, res) => {
  try {
    const advance = await AdvanceSalary.findById(req.params.id);
    if (!advance) return res.status(404).json({ success: false, message: 'Not found' });
    
    advance.status = 'rejected';
    advance.approvedBy = req.user._id;
    advance.rejectReason = req.body.reason || '';
    await advance.save();
    
    return res.json({ success: true, message: 'Advance rejected', data: advance });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { requestAdvance, getAdvances, getMyAdvances, approveAdvance, rejectAdvance };