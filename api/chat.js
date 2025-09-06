const { GoogleGenerativeAI } = require("@google/generative-ai");
const { formidable } = require('formidable');
const fs = require('fs');
const pdf = require('pdf-parse');

// Helper function untuk mengubah file buffer menjadi base64
function fileToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType
        },
    };
}

// Konfigurasi untuk Vercel agar bisa memproses body sebagai file
export const config = {
    api: {
        bodyParser: false,
    },
};

module.exports = async (req, res) => {
    // Pengaturan header CORS (tetap sama)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            throw new Error("GEMINI_API_KEY tidak ditemukan.");
        }

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        
        // Menggunakan Formidable untuk mem-parse multipart/form-data
        const form = formidable({});
        const [fields, files] = await form.parse(req);
        
        const userPrompt = fields.prompt?.[0] || '';
        const history = JSON.parse(fields.history?.[0] || '[]');
        const uploadedFile = files.file?.[0];

        let model;
        const generationConfig = { temperature: 0.7, topP: 1, topK: 1 };

        let promptParts = [userPrompt];
        
        if (uploadedFile) {
            // Jika ada file, gunakan model vision
            model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
            
            const fileBuffer = fs.readFileSync(uploadedFile.filepath);
            const mimeType = uploadedFile.mimetype;

            if (mimeType.startsWith("image/")) {
                promptParts.push(fileToGenerativePart(fileBuffer, mimeType));
            } else if (mimeType === 'application/pdf') {
                const data = await pdf(fileBuffer);
                promptParts.push(`\n\n--- KONTEKS DARI DOKUMEN PDF ---\n${data.text}\n--- AKHIR DOKUMEN ---`);
            }
        } else {
            // Jika hanya teks, gunakan model pro biasa
            model = genAI.getGenerativeModel({ model: "gemini-pro" });
        }
        
        const chat = model.startChat({ history, generationConfig });
        
        // Instruksi sistem untuk memandu AI
        const fullPrompt = {
            role: "user",
            parts: [{
                text: `Sistem: Anda adalah Qwen 3.5, asisten AI canggih. Berikan jawaban yang profesional, terstruktur, dan informatif. Selalu gunakan format Markdown (seperti **bold**, *italic*, list, dll.) untuk menyusun jawaban agar rapi dan mudah dibaca. Mampu melakukan tugas-tugas seperti merangkum, menulis cerita, menganalisis, dan memberikan masukan yang membangun.\n\nPertanyaan Pengguna: ${promptParts.filter(p => typeof p === 'string').join(' ')}`
            }].concat(promptParts.filter(p => typeof p !== 'string'))
        };
        
        const result = await chat.sendMessageStream(fullPrompt.parts);
        
        // Stream respon kembali ke client
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }
        res.end();

    } catch (error) {
        console.error("Error di API:", error);
        // Pastikan tidak mengirim header lagi jika sudah dikirim
        if (!res.headersSent) {
            res.status(500).json({ error: "Terjadi kesalahan saat memproses permintaan." });
        } else {
            res.end();
        }
    }
};