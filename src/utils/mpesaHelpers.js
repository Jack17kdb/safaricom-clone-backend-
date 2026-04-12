export const getTimestamp = () => {
    const date = new Date();
    return date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);
};

export const getPassword = (timestamp) => {
    const shortCode = process.env.MPESA_SHORTCODE;
    const passKey = process.env.MPESA_PASSKEY;
    const rawPassword = shortCode + passKey + timestamp;
    return Buffer.from(rawPassword).toString('base64');
};
