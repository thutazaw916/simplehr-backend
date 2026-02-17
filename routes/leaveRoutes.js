const express = require('express');
const router = express.Router();
const { requestLeave, getMyLeaves, getAllLeaves, approveLeave, rejectLeave } = require('../controllers/leaveController');
const { protect } = require('../middleware/auth');

router.post('/', protect, requestLeave);
router.get('/my', protect, getMyLeaves);
router.get('/', protect, getAllLeaves);
router.put('/:id/approve', protect, approveLeave);
router.put('/:id/reject', protect, rejectLeave);

module.exports = router;