import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
	email: {
		type: String,
		trim: true,
		unique: true,
		required: true
	},
	password: {
		type: String,
		required: true
	},
	number: {
		type: String,
		required: true,
		unique: true,
		trim: true
	},
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;
