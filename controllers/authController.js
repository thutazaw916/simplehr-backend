const User = require('../models/User');
const Company = require('../models/Company');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const register = async (req, res) => {
  try {
    const { name, phone, password, companyName, companyPhone, companyAddress } = req.body;

    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Phone already exists' });
    }

    const user = await User.create({ name, phone, password, role: 'owner' });

    const company = await Company.create({
      name: companyName,
      phone: companyPhone || phone,
      address: companyAddress || '',
      owner: user._id
    });

    user.company = company._id;
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Register success',
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

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone }).populate('company', 'name');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Wrong phone or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Wrong phone or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account disabled' });
    }

    return res.json({
      success: true,
      message: 'Login success',
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

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('company', 'name phone address');
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { register, login, getProfile };