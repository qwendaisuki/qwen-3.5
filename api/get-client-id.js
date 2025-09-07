export default function handler(req, res) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId) {
        res.status(200).json({ clientId });
    } else {
        res.status(500).json({ error: 'Google Client ID not configured on server.' });
    }
}