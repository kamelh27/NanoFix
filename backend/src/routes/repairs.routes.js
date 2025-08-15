const router = require('express').Router();
const { body, query } = require('express-validator');
const validate = require('../middlewares/validate');
const { list, create } = require('../controllers/repairs.controller');
const { protect } = require('../middlewares/auth');
const { normalizeStatusRaw, CANONICAL } = require('../utils/status');

router.use(protect);

router.get('/', [
  query('deviceId').optional().isMongoId(),
], validate, list);

router.post('/', [
  body('device').isMongoId(),
  body('status').customSanitizer(normalizeStatusRaw).isIn(CANONICAL),
  body('comment').optional().isString(),
], validate, create);

module.exports = router;
