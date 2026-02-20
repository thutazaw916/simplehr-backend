const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requestOvertime, getOvertimes, getMyOvertimes, approveOvertime, rejectOvertime } = require('../controllers/overtimeController');

router.use(protect);

router.post('/', requestOvertime);
router.get('/', getOvertimes);
router.get('/my', getMyOvertimes);
router.put('/:id/approve', approveOvertime);
router.put('/:id/reject', rejectOvertime);

module.exports = router;