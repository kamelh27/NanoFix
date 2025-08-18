const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middlewares/validate');
const { protect, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/accounting.controller');

router.use(protect);

// List transactions
router.get('/transactions', [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('type').optional().isIn(['income','expense']),
  query('category').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
], validate, ctrl.list);

// Create transaction
router.post('/transactions', [
  body('date').optional().isISO8601(),
  body('type').isIn(['income','expense']),
  body('amount').isFloat({ gt: 0 }),
  body('description').notEmpty(),
  body('category').optional().isString(),
], validate, ctrl.create);

// Delete transaction (admin only)
router.delete('/transactions/:id', [
  authorize('admin'),
  param('id').isMongoId(),
], validate, ctrl.remove);

// Daily summary
router.get('/daily', [
  query('date').optional().isISO8601(), // YYYY-MM-DD or ISO
], validate, ctrl.dailySummary);

// Range summary (per day)
router.get('/range', [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
], validate, ctrl.rangeSummary);

// Cash session (opening balance)
router.get('/cash-session', [
  query('date').optional().isISO8601(),
], validate, ctrl.getCashSession);

router.post('/cash-session', [
  body('date').optional().isISO8601(),
  body('dateKey').optional().isString(),
  body('openingBalance').isFloat({ min: 0 }),
  body('notes').optional().isString(),
], validate, ctrl.setCashSession);

module.exports = router;
