import mongoose from 'mongoose';
import logger from './logger.js'

const connectDB = async() => {
	try{
		const conn = await mongoose.connect(process.env.MONGODB_URI);
		logger.info("Connected to MongoDB");
	} catch(error){
		logger.error({error}, 'Error connecting to MongoDB');
	}
};

export default connectDB;
