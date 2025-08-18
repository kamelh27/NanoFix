const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middlewares/validate');
const { list, create, get, update, remove, addPhotos } = require('../controllers/devices.controller');
const { protect } = require('../middlewares/auth');
const { normalizeStatusRaw, CANONICAL } = require('../utils/status');
const upload = require('../middlewares/upload');

router.use(protect);

router.get('/', list);
router.post('/', [
  body('client').isMongoId(),
  body('brand').notEmpty(),
  body('model').notEmpty(),
  body('issue').notEmpty(),
  body('status').optional().customSanitizer(normalizeStatusRaw).isIn(CANONICAL),
  body('fechaIngreso').optional().isISO8601(),
], validate, create);

router.get('/:id', [param('id').isMongoId()], validate, get);
router.put('/:id', [param('id').isMongoId()], validate, update);
router.delete('/:id', [param('id').isMongoId()], validate, remove);

// Upload evidence photos for a device
router.post('/:id/photos', [param('id').isMongoId()], validate, upload.array('photos', 8), addPhotos);

module.exports = router;
