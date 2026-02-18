const express = require('express');
const router = express.Router();
const { getSubscription, addPayment } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getSubscription);
router.post('/payment', protect, addPayment);

module.exports = router;