const Overtime = require('../models/Overtime');

// Request OT (POST /api/overtime)
const requestOvertime = async (req, res) => {
  try {
    const { date, hours, type, reason } = req.body;
    
    const ot = await Overtime.create({
      user: req.user._id,
      company: req.user.company,
      date,
      hours,
      type: type || 'normal',
      reason: reason || ''
    });
    
    return res.status(201).json({ success: true, message: 'Overtime requested', data: ot });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get All OT (GET /api/overtime)
const getOvertimes = async (req, res) => {
  try {
    const { status, month, year } = req.query;
    const filter = { company: req.user.company };
    if (status) filter.status = status;
    
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      filter.date = { $gte: startDate, $lte: endDate };
    }
    
    const overtimes = await Overtime.find(filter)
      .populate('user', 'name phone role')
      .sort({ createdAt: -1 });
    
    return res.json({ success: true, count: overtimes.length, data: overtimes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// My OT (GET /api/overtime/my)
const getMyOvertimes = async (req, res) => {
  try {
    const overtimes = await Overtime.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    return res.json({ success: true, count: overtimes.length, data: overtimes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Approve OT (PUT /api/overtime/:id/approve)
const approveOvertime = async (req, res) => {
  try {
    const ot = await Overtime.findById(req.params.id);
    if (!ot) return res.status(404).json({ success: false, message: 'Not found' });
    
    ot.status = 'approved';
    ot.approvedBy = req.user._id;
    ot.approvedAt = new Date();
    await ot.save();
    
    return res.json({ success: true, message: 'Overtime approved', data: ot });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Reject OT (PUT /api/overtime/:id/reject)
const rejectOvertime = async (req, res) => {
  try {
    const ot = await Overtime.findById(req.params.id);
    if (!ot) return res.status(404).json({ success: false, message: 'Not found' });
    
    ot.status = 'rejected';
    ot.approvedBy = req.user._id;
    await ot.save();
    
    return res.json({ success: true, message: 'Overtime rejected', data: ot });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { requestOvertime, getOvertimes, getMyOvertimes, approveOvertime, rejectOvertime };