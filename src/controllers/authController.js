import bcrypt from 'bcryptjs'
import User from '../models/userModel.js'
import Account from '../models/accountModel.js'
import logger from '../lib/logger.js'
import generateToken from '../utils/generateToken.js'
import formatNumber from '../utils/formatNumber.js'

const register = async(req, res) => {
	try{
		const { email, password, number } = req.body;

		if(!email || !number || !password){
                        return res.status(400).json({ message: "Please fill all fields" });
                }

		const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
		if(!emailRegex.test(email)){
			return res.status(400).json({message: 'Please enter a valid email address'});
		}

                if(password.length < 6){
                        return res.status(400).json({ message: "Password should not be less that 6 characters" });
                }

		const phoneNo = formatNumber(number);

		const emailExists = await User.findOne({email});
		if(emailExists) return res.status(400).json({ message: "Email already exists" });

		const numExists = await User.findOne({phoneNo});
		if(numExists) return res.status(400).json({ message: "Phone number already exists" });

		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(password, salt);

		const newUser = await User.create({
			email,
			password: hash,
			number: phoneNo
		});

		await generateToken(newUser._id, res);

		const newAccount = await Account.create({
			userId: newUser._id,
			balance: 0
		});

		return res.status(201).json({ message: "User created successfully" });
	} catch(error) {
		logger.error({error}, "Error creating User");
		res.status(500).json({ message: "Error creating User" });
	}
};

const login = async(req, res) => {
	try{
		const { email, password } = req.body;

		if(!email || !password) return res.status(400).json({ message: "Please fill all fields" });

		const user = await User.findOne({email});
		if(!user) return res.status(400).json({ message: "Invalid credentials" });

		const isMatch = await bcrypt.compare(password, user.password);
		if(!isMatch) return res.status(400).json({ message: "Invalid credentials" });

		await generateToken(user._id, res);

		return res.status(200).json({ message: "Logged in successfully" });
	} catch(error) {
		logger.error({error}, 'Error logging in user');
		res.status(500).json({ message: "Error logging in user" });
	}
};

const authCheck = async(req, res) => {
	try{
		return res.status(200).json(req.user);
	} catch(error) {
		logger.error({error}, 'Error checking auth');
		res.status(500).json({ message: "Error checking auth" });
	}
};

export default { register, login, authCheck }
