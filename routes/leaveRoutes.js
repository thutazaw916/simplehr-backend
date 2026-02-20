const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  requestLeave,
  getMyLeaves,
  getLeaveBalance,
  getAllLeaves,
  approveLeave,
  rejectLeave
} = require('../controllers/leaveController');

router.use(protect);

router.post('/', requestLeave);
router.get('/my', getMyLeaves);
router.get('/balance', getLeaveBalance);
router.get('/', getAllLeaves);
router.put('/:id/approve', approveLeave);
router.put('/:id/reject', rejectLeave);

module.exports = router;