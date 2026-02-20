const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generatePayroll, getPayrolls, getMyPayroll, getPayrollDetail, confirmPayroll, markAsPaid } = require('../controllers/payrollController');

router.use(protect);

router.post('/generate', generatePayroll);
router.get('/', getPayrolls);
router.get('/my', getMyPayroll);
router.get('/:id', getPayrollDetail);
router.put('/:id/confirm', confirmPayroll);
router.put('/:id/pay', markAsPaid);

module.exports = router;