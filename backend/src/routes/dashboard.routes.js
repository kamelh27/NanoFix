const router = require('express').Router();
const { summary } = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/', summary);

module.exports = router;
