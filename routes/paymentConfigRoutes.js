const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const PaymentConfig = require('../models/PaymentConfig');

router.use(protect);

// GET config
router.get('/', async (req, res) => {
  try {
    let config = await PaymentConfig.findOne({ company: req.user.company });
    if (!config) {
      config = await PaymentConfig.create({ company: req.user.company });
    }
    return res.json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE config
router.put('/', async (req, res) => {
  try {
    let config = await PaymentConfig.findOne({ company: req.user.company });

    if (!config) {
      config = new PaymentConfig({ company: req.user.company });
    }

    if (req.body.officeLocation !== undefined) {
      config.officeLocation = req.body.officeLocation;
      config.markModified('officeLocation');
    }
    if (req.body.kbzpay !== undefined) config.kbzpay = req.body.kbzpay;
    if (req.body.wavepay !== undefined) config.wavepay = req.body.wavepay;
    if (req.body.cbpay !== undefined) config.cbpay = req.body.cbpay;
    if (req.body.ayapay !== undefined) config.ayapay = req.body.ayapay;
    if (req.body.bankAccounts !== undefined) config.bankAccounts = req.body.bankAccounts;
    if (req.body.ssbSettings !== undefined) config.ssbSettings = req.body.ssbSettings;
    if (req.body.overtimeSettings !== undefined) config.overtimeSettings = req.body.overtimeSettings;
    if (req.body.leaveSettings !== undefined) config.leaveSettings = req.body.leaveSettings;
    if (req.body.workingHours !== undefined) config.workingHours = req.body.workingHours;
    if (req.body.latePenalty !== undefined) config.latePenalty = req.body.latePenalty;
    if (req.body.attendanceBonus !== undefined) config.attendanceBonus = req.body.attendanceBonus;
    if (req.body.positions !== undefined) config.positions = req.body.positions;

    await config.save();

    return res.json({ success: true, message: 'Config updated', data: config });
  } catch (error) {
    console.log('Config update error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET positions
router.get('/positions', async (req, res) => {
  try {
    let config = await PaymentConfig.findOne({ company: req.user.company });
    if (!config) {
      config = await PaymentConfig.create({ company: req.user.company });
    }
    return res.json({ success: true, data: config.positions || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;