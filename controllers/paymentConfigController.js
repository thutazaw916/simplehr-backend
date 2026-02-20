const PaymentConfig = require('../models/PaymentConfig');

const getPaymentConfig = async (req, res) => {
  try {
    let config = await PaymentConfig.findOne({ company: req.user.company });
    if (!config) {
      config = await PaymentConfig.create({ company: req.user.company });
    }
    return res.json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const updatePaymentConfig = async (req, res) => {
  try {
    let config = await PaymentConfig.findOne({ company: req.user.company });

    if (!config) {
      config = new PaymentConfig({ company: req.user.company });
    }

    // Update each field from request body
    const fields = [
      'officeLocation', 'kbzpay', 'wavepay', 'cbpay', 'ayapay',
      'bankAccounts', 'ssbSettings', 'overtimeSettings', 'leaveSettings',
      'workingHours', 'latePenalty', 'attendanceBonus', 'positions'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        config[field] = req.body[field];
      }
    });

    config.markModified('officeLocation');
    await config.save();

    return res.json({ success: true, message: 'Config updated', data: config });
  } catch (error) {
    console.log('PaymentConfig update error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getPositions = async (req, res) => {
  try {
    let config = await PaymentConfig.findOne({ company: req.user.company });
    if (!config) {
      config = await PaymentConfig.create({ company: req.user.company });
    }
    return res.json({ success: true, data: config.positions || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getPaymentConfig, updatePaymentConfig, getPositions };