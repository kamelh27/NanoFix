const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middlewares/validate');
const { list, create, get, update, remove, adjustStock, purchase, sell } = require('../controllers/inventory.controller');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.get('/', list);

router.post('/', [
  authorize('admin'),
  body('name').notEmpty(),
  body('quantity').isInt({ min: 0 }),
  body('price').isFloat({ min: 0 }),
  body('supplier').optional().isString(),
  body('barcode').optional().isString(),
  body('category').optional().isString(),
  body('minStock').optional().isInt({ min: 0 }),
], validate, create);

router.get('/:id', [param('id').isMongoId()], validate, get);

router.put('/:id', [
  authorize('admin'),
  param('id').isMongoId(),
  body('name').optional().isString(),
  body('supplier').optional().isString(),
  body('quantity').optional().isInt({ min: 0 }),
  body('price').optional().isFloat({ min: 0 }),
  body('barcode').optional().isString(),
  body('category').optional().isString(),
  body('minStock').optional().isInt({ min: 0 }),
], validate, update);

router.delete('/:id', [
  authorize('admin'),
  param('id').isMongoId(),
], validate, remove);

router.post('/adjust', [
  authorize('admin'),
  body('items').isArray({ min: 1 }),
  body('items.*.productId').isMongoId(),
  body('items.*.quantityUsed').isInt({ min: 1 }),
], validate, adjustStock);

// Register a purchase adding stock and creating an expense transaction
router.post('/purchase', [
  authorize('admin'),
  body('productId').isMongoId(),
  body('quantity').isInt({ min: 1 }),
  body('unitCost').isFloat({ min: 0 }),
  body('supplier').optional().isString(),
  body('notes').optional().isString(),
], validate, purchase);

// Register a sale: decreases product stock and creates an income transaction
router.post('/sell', [
  authorize('admin'),
  body('productId').isMongoId(),
  body('quantity').isInt({ min: 1 }),
  body('unitPrice').isFloat({ min: 0 }),
  body('notes').optional().isString(),
], validate, sell);

module.exports = router;
