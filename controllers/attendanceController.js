const Attendance = require('../models/Attendance');

// Check In (POST /api/attendance/checkin)
const checkIn = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const existing = await Attendance.findOne({
      user: req.user._id,
      date: today
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Already checked in today' });
    }

    const now = new Date();
    const hour = now.getHours();
    let status = 'present';
    if (hour >= 9) status = 'late';

    const attendance = await Attendance.create({
      user: req.user._id,
      company: req.user.company,
      date: today,
      checkIn: {
        time: now,
        note: req.body.note || ''
      },
      status: status
    });

    return res.status(201).json({
      success: true,
      message: status === 'late' ? 'Checked in (Late)' : 'Checked in',
      data: attendance
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Check Out (PUT /api/attendance/checkout)
const checkOut = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: today
    });

    if (!attendance) {
      return res.status(400).json({ success: false, message: 'Not checked in yet' });
    }

    if (attendance.checkOut && attendance.checkOut.time) {
      return res.status(400).json({ success: false, message: 'Already checked out' });
    }

    const now = new Date();
    const checkInTime = new Date(attendance.checkIn.time);
    const workHours = Math.round((now - checkInTime) / (1000 * 60 * 60) * 100) / 100;

    attendance.checkOut = {
      time: now,
      note: req.body.note || ''
    };
    attendance.workHours = workHours;

    await attendance.save();

    return res.json({
      success: true,
      message: 'Checked out',
      data: attendance
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// My Attendance (GET /api/attendance/my)
const getMyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const searchMonth = month || currentDate.getMonth() + 1;
    const searchYear = year || currentDate.getFullYear();

    const startDate = `${searchYear}-${String(searchMonth).padStart(2, '0')}-01`;
    const endDate = `${searchYear}-${String(searchMonth).padStart(2, '0')}-31`;

    const attendances = await Attendance.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    return res.json({
      success: true,
      count: attendances.length,
      data: attendances
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// All Attendance - Owner/HR (GET /api/attendance)
const getAllAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const searchDate = date || new Date().toISOString().split('T')[0];

    const attendances = await Attendance.find({
      company: req.user.company,
      date: searchDate
    })
      .populate('user', 'name phone role')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      date: searchDate,
      count: attendances.length,
      data: attendances
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Today Status (GET /api/attendance/today)
const getTodayStatus = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: today
    });

    return res.json({
      success: true,
      data: {
        checkedIn: attendance ? true : false,
        checkedOut: attendance && attendance.checkOut && attendance.checkOut.time ? true : false,
        attendance: attendance || null
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { checkIn, checkOut, getMyAttendance, getAllAttendance, getTodayStatus };