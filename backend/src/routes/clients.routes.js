const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middlewares/validate');
const { list, create, get, update, remove } = require('../controllers/clients.controller');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', list);
router.post('/', [
  body('name').notEmpty(),
  body('phone').notEmpty(),
  body('email').optional().isEmail(),
], validate, create);

router.get('/:id', [param('id').isMongoId()], validate, get);
router.put('/:id', [param('id').isMongoId()], validate, update);
router.delete('/:id', [param('id').isMongoId()], validate, remove);

module.exports = router;
