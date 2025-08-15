const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { register, login, me } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');

router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], validate, register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], validate, login);

router.get('/me', protect, me);

module.exports = router;
