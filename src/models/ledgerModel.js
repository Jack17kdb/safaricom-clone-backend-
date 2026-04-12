import mongoose from 'mongoose';

const ledgerSchema = new mongoose.Schema({
	entryType: {
		type: String,
		enum: ['credit', 'debit'],
		default: 'credit'
	},
	accountId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Account',
		required: true
	},
	transactionId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Transaction',
		required: true
	},
	accountBalance: {
		type: Number,
		min: 0
	}
}, { timestamps: true });

const Ledger = mongoose.model("Ledger", ledgerSchema);

export default Ledger;
