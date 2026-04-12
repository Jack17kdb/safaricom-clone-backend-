import express from 'express';
import authController from '../controllers/authController.js';
import protect from '../middleware/protect.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/authcheck', protect, authController.authCheck);

export default router;
