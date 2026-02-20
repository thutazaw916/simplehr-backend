const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requestAdvance, getAdvances, getMyAdvances, approveAdvance, rejectAdvance } = require('../controllers/advanceSalaryController');

router.use(protect);

router.post('/', requestAdvance);
router.get('/', getAdvances);
router.get('/my', getMyAdvances);
router.put('/:id/approve', approveAdvance);
router.put('/:id/reject', rejectAdvance);

module.exports = router;