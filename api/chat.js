import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

// Handler utama untuk serverless function
export default async function handler(req, res) {
    // 1. Periksa semua API Key di environment variables Vercel
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const serperApiKey = process.env.SERPER_API_KEY; // KEY BARU!

    if (!geminiApiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY tidak dikonfigurasi." });
    }
    if (!serperApiKey) {
        return res.status(500).json({ error: "SERPER_API_KEY tidak dikonfigurasi." });
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Metode tidak diizinkan." });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const { prompt, history } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "Prompt dibutuhkan." });
        }

        // --- TAHAP 1: ANALISIS KEBUTUHAN PENCARIAN ---
        const decisionPrompt = `
            Berdasarkan pesan terakhir pengguna dan riwayat percakapan, putuskan apakah pencarian web diperlukan untuk memberikan jawaban yang akurat dan terkini.
            Riwayat: ${JSON.stringify(history)}
            Pesan terakhir: "${prompt}"

            Jika pencarian diperlukan (misalnya untuk berita, data real-time, atau informasi spesifik pasca-2023), balas HANYA dengan JSON: {"searchQuery": "kata kunci pencarian yang relevan"}.
            Jika tidak perlu pencarian (misalnya pertanyaan umum, kreatif, atau percakapan biasa), balas HANYA dengan JSON: {"searchQuery": null}.
        `;

        const decisionResult = await model.generateContent(decisionPrompt);
        const decisionText = decisionResult.response.text().trim();
        let decision;
        try {
            decision = JSON.parse(decisionText);
        } catch {
            decision = { searchQuery: null }; // Anggap tidak perlu search jika AI gagal format JSON
        }
        
        let searchResultsContext = "";
        
        // --- TAHAP 2: EKSEKUSI PENCARIAN (JIKA PERLU) ---
        if (decision.searchQuery) {
            console.log(`Melakukan pencarian untuk: "${decision.searchQuery}"`);
            try {
                const searchResponse = await axios.post('https://google.serper.dev/search', {
                    q: decision.searchQuery
                }, {
                    headers: {
                        'X-API-KEY': serperApiKey,
                        'Content-Type': 'application/json'
                    }
                });

                const topResults = searchResponse.data.organic.slice(0, 5); // Ambil 5 hasil teratas
                searchResultsContext = "Berikut adalah hasil pencarian web yang relevan: \n" + 
                    topResults.map(r => `Judul: ${r.title}\nLink: ${r.link}\nKutipan: ${r.snippet}\n---`).join("\n\n");
            } catch (searchError) {
                console.error("Gagal melakukan pencarian:", searchError.message);
                searchResultsContext = "Gagal mendapatkan hasil pencarian, jawab berdasarkan pengetahuan yang ada.";
            }
        }

        // --- TAHAP 3: GENERASI JAWABAN FINAL ---
        const finalPromptParts = [
            ...history,
            { role: 'user', parts: [{ text: prompt }] }
        ];

        const augmentedPrompt = `
            Anda adalah Qwen, AI Assistant yang sangat membantu.
            Tugas Anda adalah memberikan jawaban yang rapi, terstruktur, dan akurat. Selalu gunakan format Markdown (seperti **tebal**, *miring*, list, dan judul) untuk membuat jawaban mudah dibaca.
            
            ${searchResultsContext ? `Gunakan informasi dari hasil pencarian web berikut untuk menyusun jawaban Anda:\n${searchResultsContext}\n\n` : ''}

            Jawab pertanyaan terakhir dari pengguna berdasarkan riwayat percakapan dan konteks pencarian (jika ada).
        `;

        // Mengirim riwayat dan prompt gabungan ke model
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(augmentedPrompt + "\n\n Pertanyaan Pengguna: " + prompt);
        const finalResponse = await result.response;
        const text = finalResponse.text();

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error("Error saat menghasilkan konten:", error);
        res.status(500).json({ error: 'Gagal menghasilkan konten.' });
    }
}