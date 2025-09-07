import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'Credential token is required.' });
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(401).json({ error: 'Invalid token.' });
        }

        const userData = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
        };

        return res.status(200).json(userData);

    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ error: 'Authentication failed.', details: error.message });
    }
}