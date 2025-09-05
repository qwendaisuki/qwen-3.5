import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const serperApiKey = process.env.SERPER_API_KEY;

// Konfigurasi Vercel untuk streaming
export const config = {
    runtime: 'edge',
};

// [BARU] Definisikan "alat" yang bisa digunakan oleh Gemini
const tools = [
    {
        functionDeclarations: [
            {
                name: "google_search",
                description: "Gunakan alat ini untuk mencari informasi terkini atau topik spesifik di internet. Sangat berguna untuk pertanyaan tentang berita, peristiwa terkini, atau informasi yang tidak mungkin ada dalam data pelatihan.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: {
                            type: "STRING",
                            description: "Kata kunci pencarian yang sangat deskriptif.",
                        },
                    },
                    required: ["query"],
                },
            },
        ],
    },
];

// [BARU] Fungsi untuk menjalankan pencarian Google via Serper
async function googleSearch(query) {
    const url = 'https://google.serper.dev/search';
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'X-API-KEY': serperApiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query }),
    });
    if (!response.ok) {
        return `Error searching: ${response.statusText}`;
    }
    const data = await response.json();
    // Ambil ringkasan hasil pencarian untuk dijadikan konteks
    return JSON.stringify(data.organic.map(r => ({ title: r.title, link: r.link, snippet: r.snippet })).slice(0, 5));
}

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const { prompt, history } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            tools: tools, // Beri tahu model tentang alat yang kita punya
        });

        const chat = model.startChat({ history: history || [] });
        const result = await chat.sendMessageStream(prompt);

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                for await (const chunk of result.stream) {
                    const functionCalls = chunk.functionCalls();
                    
                    if (functionCalls && functionCalls.length > 0) {
                        // AI memutuskan untuk menggunakan alat
                        const call = functionCalls[0];
                        if (call.name === "google_search") {
                            // Kirim sinyal ke frontend bahwa kita sedang mencari
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_code', tool: 'google_search', query: call.args.query })}\n\n`));
                            
                            // Jalankan pencarian
                            const searchResult = await googleSearch(call.args.query);
                            
                            // Kirim hasil pencarian kembali ke Gemini untuk dirangkum
                            const finalResult = await chat.sendMessageStream([
                                { functionResponse: { name: "google_search", response: { content: searchResult } } }
                            ]);

                            // Lanjutkan streaming jawaban akhir dari Gemini
                            for await (const finalChunk of finalResult.stream) {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: finalChunk.text() })}\n\n`));
                            }
                        }
                    } else if (chunk.text()) {
                        // Jika AI langsung menjawab tanpa alat, kirim teksnya
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk.text() })}\n\n`));
                    }
                }
                controller.close();
            },
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return new Response(JSON.stringify({ error: 'Failed to generate content from AI', details: error.message }), { status: 500 });
    }
}