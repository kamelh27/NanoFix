const router = require('express').Router();
const { summary } = require('../controllers/dashboard.controller');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', summary);

module.exports = router;
