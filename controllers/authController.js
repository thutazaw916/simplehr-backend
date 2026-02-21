const User = require('../models/User');
const OTP = require('../models/OTP');
const Company = require('../models/Company');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Generate 6-digit OTP
const generateOTPCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Normalize phone number
const normalizePhone = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('959')) cleaned = '0' + cleaned.slice(2);
  if (cleaned.startsWith('9') && cleaned.length <= 10) cleaned = '0' + cleaned;
  if (!cleaned.startsWith('0')) cleaned = '0' + cleaned;
  return cleaned;
};

// Validate Myanmar phone format
const isValidMyanmarPhone = (phone) => {
  const normalized = normalizePhone(phone);
  return /^09\d{7,9}$/.test(normalized);
};

// ============ OWNER REGISTER (Password based) ============
const register = async (req, res) => {
  try {
    const { name, phone, password, companyName } = req.body;

    if (!name || !phone || !password || !companyName) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const normalizedPhone = normalizePhone(phone);

    if (!isValidMyanmarPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid Myanmar phone number format' });
    }

    const userExists = await User.findOne({ phone: normalizedPhone });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Phone already registered' });
    }

    const company = await Company.create({ name: companyName });

    const user = await User.create({
      name,
      phone: normalizedPhone,
      password,
      role: 'owner',
      company: company._id,
      accountStatus: 'active',
      loginMethod: 'password'
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        company: { _id: company._id, name: company.name },
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ============ OWNER/HR LOGIN (Password based) ============
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password required' });
    }

    const normalizedPhone = normalizePhone(phone);
    const user = await User.findOne({ phone: normalizedPhone }).populate('company', 'name');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    // Check account status
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account suspended. Contact your admin.' });
    }
    if (user.accountStatus === 'deleted') {
      return res.status(403).json({ success: false, message: 'Account deleted.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    if (user.accountStatus === 'pending') user.accountStatus = 'active';
    await user.save();

    return res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        company: user.company,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ============ EMPLOYEE OTP REQUEST ============
const requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number required' });
    }

    const normalizedPhone = normalizePhone(phone);

    if (!isValidMyanmarPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid Myanmar phone number' });
    }

    const user = await User.findOne({ phone: normalizedPhone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Phone not registered. Contact your admin.' });
    }

    // Check account status
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });
    }
    if (user.accountStatus === 'deleted') {
      return res.status(403).json({ success: false, message: 'Account not found.' });
    }

    // Rate limiting - 60 second cooldown
    if (user.otpResendCooldown && new Date() < user.otpResendCooldown) {
      const remaining = Math.ceil((user.otpResendCooldown - new Date()) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${remaining}s before requesting new OTP` });
    }

    // Delete old OTPs for this phone
    await OTP.deleteMany({ phone: normalizedPhone });

    // Generate new OTP
    const otpCode = generateOTPCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await OTP.create({
      phone: normalizedPhone,
      otp: otpCode,
      expiresAt,
      attempts: 0,
      maxAttempts: 5
    });

    // Set resend cooldown
    user.otpResendCooldown = new Date(Date.now() + 60 * 1000); // 60 seconds
    await user.save();

    // TODO: Send OTP via SMS API (Twilio, MessageBird, etc)
    // For now, return OTP in response (DEVELOPMENT ONLY)
    console.log(`OTP for ${normalizedPhone}: ${otpCode}`);

    return res.json({
      success: true,
      message: 'OTP sent to your phone',
      // REMOVE THIS IN PRODUCTION:
      devOTP: process.env.NODE_ENV === 'production' ? undefined : otpCode,
      expiresIn: '5 minutes'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ============ EMPLOYEE OTP VERIFY ============
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP required' });
    }

    const normalizedPhone = normalizePhone(phone);

    const otpRecord = await OTP.findOne({
      phone: normalizedPhone,
      used: false
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'No OTP found. Request a new one.' });
    }

    // Check expiry
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({ success: false, message: 'Too many attempts. Request a new OTP.' });
    }

    // Increment attempts
    otpRecord.attempts += 1;

    // Verify OTP
    if (otpRecord.otp !== otp) {
      await otpRecord.save();
      const remaining = otpRecord.maxAttempts - otpRecord.attempts;
      return res.status(400).json({ success: false, message: `Invalid OTP. ${remaining} attempts remaining.` });
    }

    // Mark as used
    otpRecord.used = true;
    await otpRecord.save();

    // Get user
    const user = await User.findOne({ phone: normalizedPhone }).populate('company', 'name');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Activate if pending
    if (user.accountStatus === 'pending') user.accountStatus = 'active';
    user.lastLogin = new Date();
    user.loginMethod = 'otp';
    await user.save();

    // Delete all OTPs for this phone
    await OTP.deleteMany({ phone: normalizedPhone });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        company: user.company,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ============ GET PROFILE ============
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('company', 'name')
      .populate('department', 'name');

    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { register, login, requestOTP, verifyOTP, getProfile };