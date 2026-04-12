import axios from 'axios';
import mongoose from 'mongoose';
import Transaction from '../models/transactionModel.js';
import Ledger from '../models/ledgerModel.js';
import Account from '../models/accountModel.js';
import { getAccessToken } from '../lib/daraja.js';
import { getTimestamp, getPassword } from '../utils/mpesaHelpers.js';
import logger from '../lib/logger.js';

const initiateDeposit = async (req, res) => {
    const { number, amount } = req.body;
    const userId = req.user._id;
    const timestamp = getTimestamp();
    const password = getPassword(timestamp);
    const accessToken = await getAccessToken();

    const data = {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: number,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: number,
        CallBackURL: `${process.env.MPESA_CALLBACK_URL}/api/transactions/callback`,
        AccountReference: `WalletTopup_${userId}`,
        TransactionDesc: "Depositing funds"
    };

    try {
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            data,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        await Transaction.create({
            userId,
            amount,
            fee: 0,
            transactionType: 'deposit',
            status: 'pending',
            checkoutRequestId: response.data.CheckoutRequestID
        });

        logger.info({ checkoutRequestId: response.data.CheckoutRequestID, userId }, "STK Push Initiated");
        res.status(200).json(response.data);
    } catch (error) {
        logger.error(error.response?.data || error.message, "STK Push Failed");
        res.status(500).json({ message: "Failed to initiate deposit" });
    }
};

const handleCallback = async (req, res) => {
    const { Body } = req.body;
    const { ResultCode, ResultDesc, CallbackMetadata, CheckoutRequestID } = Body.stkCallback;

    if (ResultCode !== 0) {
        logger.warn({ CheckoutRequestID, ResultDesc }, "Deposit Failed/Cancelled");
        await Transaction.findOneAndUpdate({ checkoutRequestId: CheckoutRequestID }, { status: 'failed' });
        return res.status(200).send("OK");
    }

    const metadata = CallbackMetadata.Item;
    const amount = metadata.find(i => i.Name === 'Amount').Value;
    const receipt = metadata.find(i => i.Name === 'MpesaReceiptNumber').Value;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transaction = await Transaction.findOneAndUpdate(
            { checkoutRequestId: CheckoutRequestID },
            { status: 'completed', mpesaReceiptNumber: receipt },
            { session, new: true }
        );

        const account = await Account.findOneAndUpdate(
            { userId: transaction.userId },
            { $inc: { balance: amount } },
            { session, new: true }
        );

        await Ledger.create([{
            accountId: account._id,
            transactionId: transaction._id,
            entryType: 'credit',
            accountBalance: account.balance
        }], { session });

        await session.commitTransaction();
        logger.info({ receipt, userId: transaction.userId }, "Deposit Successful");
    } catch (error) {
        await session.abortTransaction();
        logger.error(error, "Callback Database Error");
    } finally {
        session.endSession();
        res.status(200).send("OK");
    }
};

const initiateWithdrawal = async (req, res) => {
    const { amount, number } = req.body;
    const userId = req.user._id;
    const fee = 10;
    const totalDeduction = Number(amount) + fee;

    try {
        const account = await Account.findOne({ userId });
        if (!account || account.balance < totalDeduction) {
            return res.status(400).json({ message: "Insufficient balance" });
        }

        const accessToken = await getAccessToken();

        const data = {
            InitiatorName: process.env.MPESA_INITIATOR_NAME,
            SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
            CommandID: "BusinessPayment",
            Amount: amount,
            PartyA: process.env.MPESA_SHORTCODE,
            PartyB: number,
            Remarks: "Withdrawal",
            QueueTimeOutURL: `${process.env.MPESA_CALLBACK_URL}/timeout`,
            ResultURL: `${process.env.MPESA_CALLBACK_URL}/api/transactions/b2c-result`,
            Occasion: "Withdrawal"
        };

        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
            data,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        await Transaction.create({
            userId,
            amount,
            fee,
            transactionType: 'withdraw',
            status: 'pending',
            checkoutRequestId: response.data.OriginatorConversationID
        });

        res.status(200).json(response.data);
    } catch (error) {
        logger.error(error.response?.data || error.message);
        res.status(500).json({ message: "Withdrawal initiation failed" });
    }
};

const handleB2CCallback = async (req, res) => {
    const { Result } = req.body;
    const conversationId = Result.OriginatorConversationID;

    if (Result.ResultCode !== 0) {
        await Transaction.findOneAndUpdate({ checkoutRequestId: conversationId }, { status: 'failed' });
        return res.status(200).send("OK");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transaction = await Transaction.findOneAndUpdate(
            { checkoutRequestId: conversationId },
            { status: 'completed' },
            { session, new: true }
        );

        const account = await Account.findOneAndUpdate(
            { userId: transaction.userId },
            { $inc: { balance: -(transaction.amount + transaction.fee) } },
            { session, new: true }
        );

        await Ledger.create([{
            accountId: account._id,
            transactionId: transaction._id,
            entryType: 'debit',
            accountBalance: account.balance
        }], { session });

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
    } finally {
        session.endSession();
        res.status(200).send("OK");
    }
};

const internalTransfer = async (req, res) => {
    const { receiverId, amount } = req.body;
    const senderId = req.user._id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const senderAccount = await Account.findOneAndUpdate(
            { userId: senderId, balance: { $gte: amount } },
            { $inc: { balance: -amount } },
            { session, new: true }
        );

        if (!senderAccount) throw new Error("Insufficient funds");

        const receiverAccount = await Account.findOneAndUpdate(
            { userId: receiverId },
            { $inc: { balance: amount } },
            { session, new: true }
        );

        const transaction = await Transaction.create([{
            userId: senderId,
            recieverId: receiverId,
            amount,
            fee: 0,
            transactionType: 'transfer',
            status: 'completed'
        }], { session });

        await Ledger.create([
            { accountId: senderAccount._id, transactionId: transaction[0]._id, entryType: 'debit', accountBalance: senderAccount.balance },
            { accountId: receiverAccount._id, transactionId: transaction[0]._id, entryType: 'credit', accountBalance: receiverAccount.balance }
        ], { session });

        await session.commitTransaction();
        res.status(200).json({ message: "Transfer successful" });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};


const getAccount = async (req, res) => {
    try {
        const account = await Account.findOne({ userId: req.user._id });
        if (!account) return res.status(404).json({ message: 'Account not found' });
        res.status(200).json(account);
    } catch (error) {
        logger.error(error, 'Error fetching account');
        res.status(500).json({ message: 'Error fetching account' });
    }
};

const getHistory = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.status(200).json(transactions);
    } catch (error) {
        logger.error(error, 'Error fetching transactions');
        res.status(500).json({ message: 'Error fetching transactions' });
    }
};

export { initiateDeposit, handleCallback, initiateWithdrawal, handleB2CCallback, internalTransfer, getAccount, getHistory };
