const Subscription = require('../models/Subscription');
const Company = require('../models/Company');

const getSubscription = async (req, res) => {
  try {
    let subscription = await Subscription.findOne({ company: req.user.company });

    if (!subscription) {
      subscription = await Subscription.create({
        company: req.user.company,
        plan: 'free',
        maxEmployees: 5,
        price: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true
      });
    }

    const daysLeft = Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));

    return res.json({
      success: true,
      data: {
        plan: subscription.plan,
        maxEmployees: subscription.maxEmployees,
        price: subscription.price,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        isActive: subscription.isActive,
        daysLeft: daysLeft > 0 ? daysLeft : 0,
        payments: subscription.payments
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const addPayment = async (req, res) => {
  try {
    const { amount, method, transactionId, plan, note } = req.body;

    const subscription = await Subscription.findOne({ company: req.user.company });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    subscription.payments.push({
      amount,
      method: method || 'bank',
      transactionId: transactionId || '',
      paidAt: new Date(),
      note: note || ''
    });

    if (plan === 'basic') {
      subscription.plan = 'basic';
      subscription.maxEmployees = 50;
      subscription.price = 30000;
    } else if (plan === 'pro') {
      subscription.plan = 'pro';
      subscription.maxEmployees = 9999;
      subscription.price = 80000;
    }

    subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    subscription.isActive = true;

    await subscription.save();

    return res.json({
      success: true,
      message: 'Payment recorded and plan updated',
      data: subscription
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getSubscription, addPayment };