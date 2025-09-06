import { GoogleGenerativeAI } from "@google/generative-ai";

// Mengambil API Key dari environment variable Vercel
const API_KEY = process.env.GEMINI_API_KEY;

// Pastikan API Key tersedia
if (!API_KEY) {
    console.error("GEMINI_API_KEY is not set in environment variables.");
    // Ini akan melempar error saat deploy jika key tidak ada
    throw new Error("GEMINI_API_KEY is not set.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Model ID untuk Gemini 2.5 Flash.
// Pastikan ini sesuai dengan model yang ingin Anda gunakan.
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Atau "gemini-1.5-flash"

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return res.status(200).json({ response: text });
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            // Log detail error dari Google API jika ada
            if (error.response && error.response.data) {
                console.error("Gemini API Error Details:", error.response.data);
            }
            return res.status(500).json({ error: 'Failed to get response from AI', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
