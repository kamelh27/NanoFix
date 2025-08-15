const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middlewares/validate');
const { list, create, get, update, remove, adjustStock } = require('../controllers/inventory.controller');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.get('/', list);

router.post('/', [
  authorize('admin'),
  body('name').notEmpty(),
  body('quantity').isInt({ min: 0 }),
  body('price').isFloat({ min: 0 }),
  body('supplier').optional().isString(),
  body('minStock').optional().isInt({ min: 0 }),
], validate, create);

router.get('/:id', [param('id').isMongoId()], validate, get);

router.put('/:id', [
  authorize('admin'),
  param('id').isMongoId(),
], validate, update);

router.delete('/:id', [
  authorize('admin'),
  param('id').isMongoId(),
], validate, remove);

router.post('/adjust', [
  // technicians can adjust stock after a repair as well
  authorize('admin', 'technician'),
  body('items').isArray({ min: 1 }),
  body('items.*.productId').isMongoId(),
  body('items.*.quantityUsed').isInt({ min: 1 }),
], validate, adjustStock);

module.exports = router;
