const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middlewares/validate');
const { list, create, get, remove, pdf, income } = require('../controllers/invoices.controller');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', list);

router.post('/', [
  body('client').isMongoId(),
  body('device').optional().isMongoId(),
  body('items').isArray({ min: 1 }),
  body('items.*.description').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unitPrice').isFloat({ min: 0 }),
  body('items.*.product').optional().isMongoId(),
  body('date').optional().isISO8601(),
  body('notes').optional().isString(),
], validate, create);

router.get('/:id', [param('id').isMongoId()], validate, get);
router.delete('/:id', [param('id').isMongoId()], validate, remove);
router.get('/:id/pdf', [param('id').isMongoId()], validate, pdf);

router.get('/income/range', [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
], validate, income);

module.exports = router;
