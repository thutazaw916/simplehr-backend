const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Login required' });
    }

    console.log('TOKEN RECEIVED');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('DECODED OK');

    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    console.log('AUTH SUCCESS');
    next();
  } catch (error) {
    console.log('AUTH ERROR:', error.message);
    return res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

module.exports = { protect };