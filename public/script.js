import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("GEMINI_API_KEY is not set in environment variables.");
    throw new Error("GEMINI_API_KEY is not set.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
// Gunakan model yang terbukti berhasil untukmu, misalnya "gemini-1.5-flash" atau "gemini-2.5-flash"
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        try {
            // Menggunakan generateContentStream untuk mendapatkan respons yang di-stream
            const result = await model.generateContentStream(prompt);

            // Set header untuk streaming
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no'); // Penting untuk Nginx/Vercel agar tidak buffer

            // Iterasi melalui stream dan kirim setiap chunk sebagai Server-Sent Events (SSE)
            for await (const chunk of result.stream) {
                const candidate = chunk.candidates[0];
                if (candidate && candidate.content && candidate.content.parts) {
                    const text = candidate.content.parts.map(part => part.text).join('');
                    if (text) {
                        // Kirim setiap chunk sebagai data SSE
                        res.write(`data: ${JSON.stringify({ text })}\n\n`);
                    }
                }
            }
            res.end(); // Akhiri stream setelah semua chunk terkirim

        } catch (error) {
            console.error('Error calling Gemini API:', error);
            // Tangani error dan kirim sebagai pesan tunggal jika streaming gagal di awal
            // Pastikan tidak mencoba mengirim header SSE jika respons sudah dimulai
            if (!res.headersSent) {
                if (error.response && error.response.data) {
                    console.error("Gemini API Error Details:", error.response.data);
                    return res.status(500).json({ error: 'Failed to get response from AI', details: error.response.data.message });
                }
                return res.status(500).json({ error: 'Failed to get response from AI', details: error.message });
            } else {
                // Jika headers sudah terkirim, kita hanya bisa log errornya
                console.error("Error occurred after headers sent, cannot send JSON error:", error.message);
            }
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}