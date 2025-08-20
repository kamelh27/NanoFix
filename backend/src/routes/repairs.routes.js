const router = require('express').Router();
const { body, query, param } = require('express-validator');
const validate = require('../middlewares/validate');
const { list, create, update, addPhotos, addParts } = require('../controllers/repairs.controller');
const { protect, authorize } = require('../middlewares/auth');
const { normalizeStatusRaw, CANONICAL } = require('../utils/status');
const upload = require('../middlewares/upload');

router.use(protect);
router.use(authorize('admin', 'technician'));

router.get('/', [
  query('deviceId').optional().isMongoId(),
], validate, list);

router.post('/', [
  body('device').isMongoId(),
  body('status').customSanitizer(normalizeStatusRaw).isIn(CANONICAL),
  body('comment').optional().isString(),
], validate, create);

router.put('/:id', [
  param('id').isMongoId(),
  body('status').optional().customSanitizer(normalizeStatusRaw).isIn(CANONICAL),
  body('comment').optional().isString(),
], validate, update);

// Upload photos for a specific repair
router.post('/:id/photos', [
  param('id').isMongoId(),
], validate, upload.array('photos', 8), addPhotos);

// Consume parts (products) for a repair, validates stock and logs movements
router.post('/:id/parts', [
  param('id').isMongoId(),
  body('items').isArray({ min: 1 }),
  body('items.*.productId').isMongoId(),
  body('items.*.quantity').isInt({ min: 1 }),
], validate, addParts);

module.exports = router;
