const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios'); // Tambahkan axios untuk request API

// Daftar kata kunci yang akan memicu pencarian Google
const SEARCH_TRIGGERS = [
    'siapa', 'kapan', 'dimana', 'apa itu', 'harga', 'berita', 'terkini', 
    'jelaskan tentang', 'berapa', 'statistik', 'definisi'
];

async function performGoogleSearch(query, apiKey) {
    try {
        const response = await axios.post('https://google.serper.dev/search', {
            q: query
        }, {
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            }
        });
        
        // Mengambil cuplikan dari beberapa hasil pencarian teratas
        return response.data.organic.slice(0, 5).map(item => item.snippet).join('\n');
    } catch (error) {
        console.error('Error saat melakukan Google Search:', error);
        return "Gagal mendapatkan informasi dari pencarian.";
    }
}

module.exports = async (req, res) => {
    // Pengaturan header CORS (tetap sama)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        const serperApiKey = process.env.SERPER_API_KEY; // Ambil API key Serper
        
        if (!geminiApiKey || !serperApiKey) {
            throw new Error("API Key untuk Gemini atau Serper tidak ditemukan.");
        }

        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
        }
        
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const lowerCaseMessage = message.toLowerCase();
        const requiresSearch = SEARCH_TRIGGERS.some(keyword => lowerCaseMessage.includes(keyword));

        let prompt = message;

        // --- LOGIKA BARU UNTUK GOOGLE SEARCH ---
        if (requiresSearch) {
            console.log("Memicu Google Search...");
            const searchResults = await performGoogleSearch(message, serperApiKey);
            
            // Membuat prompt baru dengan konteks hasil pencarian
            prompt = `Berdasarkan informasi dari internet berikut:
            ---
            ${searchResults}
            ---
            Jawab pertanyaan pengguna secara akurat dan relevan: "${message}"`;
        }
        
        // Meminta respon dari model Gemini dengan prompt yang sesuai
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        res.status(200).json({ reply: text });

    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: "Terjadi kesalahan saat memproses permintaan." });
    }
};