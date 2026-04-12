import express from 'express';
import protect from '../middleware/protect.js';
import {
    initiateDeposit,
    handleCallback,
    initiateWithdrawal,
    handleB2CCallback,
    internalTransfer,
    getAccount,
    getHistory
} from '../controllers/transactionController.js';

const router = express.Router();

router.get('/account', protect, getAccount);
router.get('/history', protect, getHistory);

router.post('/deposit', protect, initiateDeposit);
router.post('/withdraw', protect, initiateWithdrawal);
router.post('/transfer', protect, internalTransfer);

router.post('/callback', handleCallback);
router.post('/b2c-result', handleB2CCallback);

export default router;
