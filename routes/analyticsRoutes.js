const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getLeaveAnalytics, getKPIAnalytics, getSalaryAnalytics } = require('../controllers/analyticsController');

router.use(protect);

router.get('/leaves', getLeaveAnalytics);
router.get('/kpi', getKPIAnalytics);
router.get('/salary', getSalaryAnalytics);

module.exports = router;