import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;

if (!GEMINI_API_KEY || !SERPER_API_KEY) {
    throw new Error("Satu atau lebih API key tidak dikonfigurasi.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function extractJson(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch (e) {
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { prompt, history, file } = req.body;
        const content = [];
        let userPrompt = prompt;

        if (file && file.data) {
            content.push({
                inlineData: {
                    mimeType: file.mimeType,
                    data: file.data
                }
            });
            if (!userPrompt) {
                userPrompt = "Analisis dan jelaskan file ini secara detail.";
            }
        }
        content.push({ text: userPrompt });

        let searchResultsContext = "";
        if (!file && prompt) {
            const decisionPrompt = `Analisis pesan: "${prompt}". Apakah ini butuh info terkini? Balas HANYA JSON: {"searchQuery": "kata kunci"} atau {"searchQuery": null}.`;
            const decisionResult = await model.generateContent(decisionPrompt);
            const decision = extractJson(decisionResult.response.text());

            if (decision && decision.searchQuery) {
                console.log(`Mencari: "${decision.searchQuery}"`);
                const searchResponse = await fetch('https://google.serper.dev/search', {
                    method: 'POST',
                    headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ q: decision.searchQuery })
                });

                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    const topResults = searchData.organic?.slice(0, 4) || [];
                    if (topResults.length > 0) {
                        searchResultsContext = "Konteks dari pencarian web:\n" + 
                            topResults.map((r, i) => `[Sumber ${i+1}] Judul: ${r.title}\nLink: ${r.link}\nKutipan: ${r.snippet}`).join("\n\n");
                    }
                }
            }
        }
        
        const finalSystemPrompt = `
            Anda adalah Qwen, AI Assistant canggih, ramah, dan membantu. 😊
            - Selalu gunakan format Markdown.
            - Gunakan emoji yang relevan. 👍
            - Jika diberi file, fokus utama Anda adalah menganalisisnya.
            - Ingat dan gunakan konteks dari riwayat percakapan.
            ${searchResultsContext ? `\n- Gunakan info pencarian ini dan sertakan sumbernya: ${searchResultsContext}` : ""}
        `;

        const chat = model.startChat({ 
            history: [...history, { role: 'user', parts: [{ text: finalSystemPrompt }] }]
        });
        
        const result = await chat.sendMessage({ parts: content });
        const text = result.response.text();

        return res.status(200).json({ reply: text });

    } catch (error) {
        console.error('Error in handler:', error);
        return res.status(500).json({ error: 'Gagal merespon', details: error.message });
    }
}