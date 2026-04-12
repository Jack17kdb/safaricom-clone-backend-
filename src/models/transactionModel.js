import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	recieverId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	amount: {
		type: Number,
		min: 0,
		required: true
	},
	fee: {
		type: Number,
		min: 0,
		required: true
	},
	transactionType: {
		type: String,
		enum: ['deposit', 'withdraw', 'transfer'],
		default: 'deposit'
	},
	status: {
		type: String,
		enum: ['pending', 'failed', 'completed'],
		default: 'pending'
	},
	mpesaReceiptNumber: {
		type: String,
		unique: true,
		sparse: true
	},
	checkoutRequestId: {
		type: String,
		index: true
	},
	merchantRequestId: {
		type: String
	}
}, { timestamps: true });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
