import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function fileToGenerativePart(fileData, mimeType) {
    return {
        inlineData: { data: fileData.replace(/^data:[^;]+;base64,/, ''), mimeType },
    };
}

// Konfigurasi Vercel untuk streaming
export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const { prompt, history, fileData, mimeType } = await req.json();

        if (!prompt && !fileData) {
            return new Response(JSON.stringify({ error: 'Prompt or file is required' }), { status: 400 });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash", // Ganti ke 2.5 jika sudah tersedia untuk public API
            systemInstruction: "You are Qwen, a helpful and friendly AI assistant. Your responses should be well-structured, informative, and adapt to the user's tone. Use Markdown for formatting when appropriate.",
        });

        // Siapkan histori yang bersih untuk dikirim ke API
        const historyForApi = history || [];

        const parts = [{ text: prompt }];
        if (fileData && mimeType) {
            parts.unshift(fileToGenerativePart(fileData, mimeType));
        }
        
        // Gabungkan histori dengan prompt baru
        const contents = [...historyForApi, { role: 'user', parts }];

        // INI BAGIAN YANG DIPERBAIKI:
        // Kita langsung memanggil generateContentStream dengan 'contents' yang sudah benar
        const result = await model.generateContentStream({ contents });

        // Membuat stream untuk dikirim ke klien
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of result.stream) {
                    const textChunk = chunk.text();
                    if (textChunk) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunk)}\n\n`));
                    }
                }
                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return new Response(JSON.stringify({ error: 'Failed to generate content from AI', details: error.message }), { status: 500 });
    }
            }
