import pino from 'pino';

const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	redact: ['password', 'number', 'mpesaPIN', 'token'],
	transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true } } : undefined
});

export default logger;
