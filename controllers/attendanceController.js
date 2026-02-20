const Attendance = require('../models/Attendance');
const PaymentConfig = require('../models/PaymentConfig');

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const checkIn = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const existing = await Attendance.findOne({ user: req.user._id, date: today });
    if (existing) return res.status(400).json({ success: false, message: 'Already checked in today' });

    const { latitude, longitude, note } = req.body;
    let config = await PaymentConfig.findOne({ company: req.user.company });

    let locationVerified = false;
    let distanceFromOffice = null;

    if (config && config.officeLocation && config.officeLocation.latitude && config.officeLocation.longitude) {
      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Location required. Please enable GPS.' });
      }
      distanceFromOffice = getDistanceKm(latitude, longitude, config.officeLocation.latitude, config.officeLocation.longitude);
      const maxDistanceKm = (config.officeLocation.radiusMeters || 200) / 1000;
      if (distanceFromOffice > maxDistanceKm) {
        return res.status(400).json({
          success: false,
          message: `You are ${Math.round(distanceFromOffice * 1000)}m away from office. Must be within ${config.officeLocation.radiusMeters || 200}m.`
        });
      }
      locationVerified = true;
    }

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    let workStartHour = 9, workStartMinute = 0;
    if (config && config.workingHours && config.workingHours.startTime) {
      const parts = config.workingHours.startTime.split(':');
      workStartHour = parseInt(parts[0]);
      workStartMinute = parseInt(parts[1] || 0);
    }
    const graceMinutes = config?.latePenalty?.graceMinutes || 15;
    const totalMinutes = hour * 60 + minute;
    const startMinutes = workStartHour * 60 + workStartMinute + graceMinutes;
    let status = totalMinutes > startMinutes ? 'late' : 'present';

    const attendance = await Attendance.create({
      user: req.user._id,
      company: req.user.company,
      date: today,
      checkIn: {
        time: now,
        note: note || '',
        location: { latitude: latitude || null, longitude: longitude || null },
        locationVerified,
        distanceFromOffice: distanceFromOffice ? Math.round(distanceFromOffice * 1000) : null
      },
      status
    });

    return res.status(201).json({
      success: true,
      message: status === 'late' ? `Checked in (Late)` : 'Checked in successfully',
      data: attendance
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const checkOut = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { latitude, longitude, note } = req.body;
    const attendance = await Attendance.findOne({ user: req.user._id, date: today });
    if (!attendance) return res.status(400).json({ success: false, message: 'Not checked in yet' });
    if (attendance.checkOut && attendance.checkOut.time) return res.status(400).json({ success: false, message: 'Already checked out' });

    let locationVerified = false;
    let distanceFromOffice = null;
    let config = await PaymentConfig.findOne({ company: req.user.company });
    if (config && config.officeLocation && config.officeLocation.latitude && latitude && longitude) {
      distanceFromOffice = getDistanceKm(latitude, longitude, config.officeLocation.latitude, config.officeLocation.longitude);
      locationVerified = distanceFromOffice <= ((config.officeLocation.radiusMeters || 500) / 1000);
    }

    const now = new Date();
    const workHours = Math.round((now - new Date(attendance.checkIn.time)) / (1000 * 60 * 60) * 100) / 100;

    attendance.checkOut = {
      time: now,
      note: note || '',
      location: { latitude: latitude || null, longitude: longitude || null },
      locationVerified,
      distanceFromOffice: distanceFromOffice ? Math.round(distanceFromOffice * 1000) : null
    };
    attendance.workHours = workHours;
    await attendance.save();

    return res.json({ success: true, message: `Checked out. ${workHours}h`, data: attendance });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const m = month || currentDate.getMonth() + 1;
    const y = year || currentDate.getFullYear();
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = `${y}-${String(m).padStart(2, '0')}-31`;
    const attendances = await Attendance.find({ user: req.user._id, date: { $gte: startDate, $lte: endDate } }).sort({ date: -1 });
    return res.json({ success: true, count: attendances.length, data: attendances });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getAllAttendance = async (req, res) => {
  try {
    const searchDate = req.query.date || new Date().toISOString().split('T')[0];
    const attendances = await Attendance.find({ company: req.user.company, date: searchDate })
      .populate('user', 'name phone role position').sort({ createdAt: -1 });
    return res.json({ success: true, date: searchDate, count: attendances.length, data: attendances });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getTodayStatus = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({ user: req.user._id, date: today });
    return res.json({
      success: true,
      data: {
        checkedIn: !!attendance,
        checkedOut: !!(attendance && attendance.checkOut && attendance.checkOut.time),
        attendance: attendance || null
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { checkIn, checkOut, getMyAttendance, getAllAttendance, getTodayStatus };