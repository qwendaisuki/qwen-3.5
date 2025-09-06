import { GoogleGenerativeAI } from "@google/generative-ai";

// Mengambil API Keys dari environment variables Vercel
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY; // <-- KEY BARU DITAMBAHKAN

// Pastikan semua API Key tersedia
if (!GEMINI_API_KEY || !SERPER_API_KEY) {
    const missingKeys = [!GEMINI_API_KEY && "GEMINI_API_KEY", !SERPER_API_KEY && "SERPER_API_KEY"].filter(Boolean).join(", ");
    console.error(`${missingKeys} is not set in environment variables.`);
    throw new Error(`API Key is missing: ${missingKeys}`);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Kita tetap gunakan model yang stabil seperti gemini-1.5-flash
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Fungsi bantuan untuk mengekstrak JSON secara aman dari teks balasan AI
function extractJson(text) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // Sekarang kita juga menerima 'history' dari frontend
        const { prompt, history } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // --- TAHAP 1: AI MEMUTUSKAN APAKAH PERLU MENCARI ---
        const decisionPrompt = `Analisis pesan pengguna: "${prompt}". Apakah ini membutuhkan informasi terkini (setelah 2023) atau berita? Balas HANYA dengan JSON: {"searchQuery": "kata kunci pencarian"} atau {"searchQuery": null}.`;
        
        const decisionResult = await model.generateContent(decisionPrompt);
        const decision = extractJson(decisionResult.response.text());
        
        let searchResultsContext = "";
        
        // --- TAHAP 2: LAKUKAN PENCARIAN JIKA DIPUTUSKAN PERLU ---
        if (decision && decision.searchQuery) {
            console.log(`AI memutuskan untuk mencari: "${decision.searchQuery}"`);
            
            // Menggunakan fetch bawaan, BUKAN axios
            const searchResponse = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: decision.searchQuery })
            });

            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                const topResults = searchData.organic?.slice(0, 4) || []; // Ambil 4 hasil teratas
                if (topResults.length > 0) {
                    searchResultsContext = "Konteks dari pencarian web:\n" + 
                        topResults.map((r, i) => `[Sumber ${i+1}] Judul: ${r.title}\nLink: ${r.link}\nKutipan: ${r.snippet}`).join("\n\n");
                }
            } else {
                console.error(`Serper API error: ${searchResponse.status}`);
            }
        }

        // --- TAHAP 3: BUAT JAWABAN FINAL DENGAN KONTEKS (JIKA ADA) ---
        const finalSystemPrompt = `
            Anda adalah Qwen, AI Assistant. Jawab pertanyaan pengguna dengan format Markdown yang rapi.
            ${searchResultsContext 
                ? `Gunakan informasi dari konteks pencarian web berikut untuk menjawab. Sertakan link sumber yang relevan di akhir jawaban Anda dalam format [Nama Sumber](link).\n\n${searchResultsContext}` 
                : "Jawab berdasarkan pengetahuan Anda dan riwayat percakapan."
            }
        `;

        // Memulai chat dengan riwayat dan prompt sistem yang baru
        const chat = model.startChat({ history: [...history, { role: 'user', parts: [{ text: finalSystemPrompt }] }] });
        const result = await chat.sendMessage(prompt);
        const text = result.response.text();

        // Kunci respons diubah menjadi 'reply' agar sesuai dengan script.js frontend
        return res.status(200).json({ reply: text });

    } catch (error) {
        console.error('Error in handler:', error);
        return res.status(500).json({ error: 'Failed to get response from AI', details: error.message });
    }
    }
