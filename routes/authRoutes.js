const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { register, login, requestOTP, verifyOTP, getProfile } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/otp/request', requestOTP);
router.post('/otp/verify', verifyOTP);
router.get('/profile', protect, getProfile);

module.exports = router;