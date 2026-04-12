import cors from 'cors'
import helmet from 'helmet'
import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import connectDB from './lib/db.js'
import logger from './lib/logger.js'
import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js'

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors({
	origin: process.env.CLIENT_URL || "http://localhost:3000",
	credentials: true
}));

app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			"default-src": ["'self'"],
			"img-src": ["'self'", "data:", "https://res.cloudinary.com/"],
			"connect-src": ["'self'", "data:", "https://res.cloudinary.com", "http://localhost:3000"],
			"script-src": ["'self'", "'unsafe-inline'"]
		}
	}
}));

app.use(express.json());
app.use(cookieParser());

app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
	stream: {
		write: (message) => logger.info(message.trim())
	}
}));

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

app.listen(PORT, () => {
	connectDB();
	logger.info(`Server listening on port: ${PORT}`);
});

