const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// POST /api/auth/register - Owner Register
router.post('/register', register);

// POST /api/auth/login - Login
router.post('/login', login);

// GET /api/auth/profile - Get Profile (Login ဝင်ထားမှ ရမယ်)
router.get('/profile', protect, getProfile);

module.exports = router;