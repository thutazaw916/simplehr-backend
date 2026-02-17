const express = require('express');
const router = express.Router();
const { generatePayroll, getPayrolls, getMyPayroll, getPayrollDetail, confirmPayroll, markAsPaid } = require('../controllers/payrollController');
const { protect } = require('../middleware/auth');

router.post('/generate', protect, generatePayroll);
router.get('/', protect, getPayrolls);
router.get('/my', protect, getMyPayroll);
router.get('/:id', protect, getPayrollDetail);
router.put('/:id/confirm', protect, confirmPayroll);
router.put('/:id/pay', protect, markAsPaid);

module.exports = router;