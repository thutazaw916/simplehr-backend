const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getMyAttendance, getAllAttendance, getTodayStatus } = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');

router.post('/checkin', protect, checkIn);
router.put('/checkout', protect, checkOut);
router.get('/my', protect, getMyAttendance);
router.get('/today', protect, getTodayStatus);
router.get('/', protect, getAllAttendance);

module.exports = router;