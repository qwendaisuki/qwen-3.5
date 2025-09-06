import { GoogleGenerativeAI } from "@google/generative-ai";

// Fungsi untuk mengekstrak JSON secara aman dari teks
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
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const serperApiKey = process.env.SERPER_API_KEY;

    if (!geminiApiKey || !serperApiKey) {
        return res.status(500).json({ error: "Satu atau lebih API key tidak dikonfigurasi." });
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Metode tidak diizinkan." });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const { prompt, history } = req.body;
        if (!prompt) return res.status(400).json({ error: "Prompt dibutuhkan." });

        const decisionPrompt = `
            Analisis pesan terakhir pengguna: "${prompt}".
            Apakah pertanyaan ini secara eksplisit atau implisit memerlukan informasi terkini (setelah tahun 2023), berita, atau data real-time dari internet?
            Contoh:
            - "hallo" -> {"searchQuery": null}
            - "siapa presiden indonesia sekarang?" -> {"searchQuery": "presiden Indonesia sekarang 2025"}
            - "buatkan aku puisi" -> {"searchQuery": null}
            - "apa berita terbaru tentang teknologi AI?" -> {"searchQuery": "berita terbaru teknologi AI 2025"}
            Balas HANYA dengan format JSON.
        `;
        
        const decisionResult = await model.generateContent(decisionPrompt);
        const decision = extractJson(decisionResult.response.text());
        
        let searchResultsContext = "";
        let isSearching = decision && decision.searchQuery;

        if (isSearching) {
            console.log(`AI memutuskan untuk mencari: "${decision.searchQuery}"`);
            try {
                // =======================================================
                // MENGGANTI AXIOS DENGAN FETCH BAWAAN NODE.JS
                // =======================================================
                const searchResponse = await fetch('https://google.serper.dev/search', {
                    method: 'POST',
                    headers: {
                        'X-API-KEY': serperApiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ q: decision.searchQuery })
                });

                if (!searchResponse.ok) {
                    throw new Error(`Serper API merespon dengan status: ${searchResponse.status}`);
                }

                const searchData = await searchResponse.json();
                // =======================================================

                const topResults = searchData.organic?.slice(0, 5) || [];
                if (topResults.length > 0) {
                    searchResultsContext = "Berikut adalah hasil pencarian web relevan:\n" + 
                        topResults.map((r, i) => `[Sumber ${i+1}] Judul: ${r.title}\nLink: ${r.link}\nKutipan: ${r.snippet}`).join("\n\n");
                }
            } catch (searchError) {
                console.error("Gagal melakukan pencarian:", searchError.message);
                searchResultsContext = "Info: Gagal mendapatkan hasil pencarian, jawab berdasarkan pengetahuan yang ada saja.";
            }
        } else {
            console.log(`AI memutuskan TIDAK perlu mencari.`);
        }

        const finalSystemPrompt = `
            Anda adalah Qwen, AI Assistant yang sangat membantu.
            Selalu berikan jawaban yang rapi dan terstruktur menggunakan format Markdown.
            ${searchResultsContext 
                ? `Gunakan informasi dari hasil pencarian web berikut untuk menyusun jawaban Anda. PENTING: Sertakan link sumber yang relevan di akhir jawaban Anda dalam format Markdown, contoh: [Nama Sumber](link). Contoh: "Menurut [Sumber 1], ..."\n\n${searchResultsContext}` 
                : "Jawab pertanyaan pengguna berdasarkan pengetahuan Anda dan riwayat percakapan."
            }
        `;

        const chat = model.startChat({ 
            history: [
                ...history,
                { role: 'user', parts: [{ text: finalSystemPrompt }] },
                { role: 'model', parts: [{ text: "Siap, saya mengerti instruksi saya." }] }
            ]
        });
        
        const result = await chat.sendMessage(prompt);
        const text = result.response.text();

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error("Error saat menghasilkan konten:", error.message);
        res.status(500).json({ error: 'Gagal menghasilkan konten di server.' });
    }
}```

### Langkah Terakhir (Paling Penting)

1.  **Ganti isi file `package.json`** Anda dengan kode baru yang sudah disederhanakan.
2.  **Ganti isi file `api/chat.js`** Anda dengan kode baru yang menggunakan `fetch`.
3.  **Commit dan Push** kedua perubahan ini ke repositori Anda.
4.  **Redeploy** proyek Anda di Vercel.

Dengan cara ini, kita sama sekali tidak bergantung pada `axios`, dan error `Cannot find module` itu **pasti akan hilang**. Ini adalah solusi yang paling bersih dan stabil.
