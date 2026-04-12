import axios from 'axios'
import logger from './logger.js'

export const getAccessToken = async() => {
	const consumerKey = process.env.MPESA_CONSUMER_KEY;
	const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

	const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

	try{
		const response = await axios.get(
			'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
			{
				headers: {
					Authorization: `Basic ${auth}`,
				},
			}
		);

		logger.info('Daraja Access Token generated successfully');
		return response.data.access_token;
	} catch(error){
		logger.error({ error: error.response?.data || error.message }, 'Failed to generate Daraja Access Token');
		throw new Error('M-Pesa authentication failed');
	}
};
