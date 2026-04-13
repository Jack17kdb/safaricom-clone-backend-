const formatNumber = (number) => {
	let phoneNo = String(number).trim();

	if(phoneNo.startsWith('254') && phoneNo.length === 12) {
		return phoneNo;
	} else if(phoneNo.startsWith('0') && phoneNo.length === 10) {
		return '254' + phoneNo.substring(1);
	} else {
		throw new Error("Number must be in format 254712345678 or 0712345678");
	}
};

export default formatNumber;
