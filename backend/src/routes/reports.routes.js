const router = require('express').Router();
const { query } = require('express-validator');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/auth');
const ctrl = require('../controllers/reports.controller');

router.use(protect);

const rangeValidators = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
];

router.get('/summary', [
  ...rangeValidators,
  query('granularity').optional().isIn(['day','week','month']),
], validate, ctrl.summary);

router.get('/summary.csv', [
  ...rangeValidators,
  query('granularity').optional().isIn(['day','week','month']),
], validate, ctrl.summaryCsv);

router.get('/summary.pdf', [
  ...rangeValidators,
  query('granularity').optional().isIn(['day','week','month']),
], validate, ctrl.summaryPdf);

router.get('/top-products', [
  ...rangeValidators,
  query('sortBy').optional().isIn(['quantity','value']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, ctrl.topProducts);

router.get('/top-products.csv', [
  ...rangeValidators,
  query('sortBy').optional().isIn(['quantity','value']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, ctrl.topProductsCsv);

router.get('/expenses-by-category', rangeValidators, validate, ctrl.expensesByCategory);
router.get('/expenses-by-category.csv', rangeValidators, validate, ctrl.expensesCsv);

module.exports = router;
