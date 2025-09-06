import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const serperApiKey = process.env.SERPER_API_KEY;

export const config = { runtime: 'edge' };

const tools = [{ functionDeclarations: [{ name: "google_search", description: "Gunakan untuk mencari informasi terkini atau spesifik dari internet. Wajib digunakan untuk berita, peristiwa terkini, atau data real-time.", parameters: { type: "OBJECT", properties: { query: { type: "STRING", description: "Kata kunci pencarian deskriptif dalam Bahasa Indonesia." } }, required: ["query"] } }] }];

async function googleSearch(query) {
    const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, gl: 'id', hl: 'id' }), // Search for Indonesian results
    });
    if (!response.ok) return `Error searching: ${response.statusText}`;
    const data = await response.json();
    return JSON.stringify(data.organic.map(r => ({ title: r.title, link: r.link, snippet: r.snippet })).slice(0, 5));
}

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }
    try {
        const { prompt, history } = await req.json();
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            tools: tools,
            systemInstruction: "You are Qwen, an advanced AI assistant. Your responses are well-structured and friendly. When you use the google_search tool, you MUST cite your sources. After your main answer, add a section called 'Sumber:' and list the sources you used in Markdown format like this: `1. [Judul Artikel](URL)`.",
        });

        const chat = model.startChat({ history: history || [] });
        const result = await chat.sendMessageStream(prompt);

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of result.stream) {
                    const functionCalls = chunk.functionCalls();
                    if (functionCalls && functionCalls.length > 0) {
                        const call = functionCalls[0];
                        if (call.name === "google_search") {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_start', tool: 'google_search', query: call.args.query })}\n\n`));
                            const searchResult = await googleSearch(call.args.query);
                            const finalResult = await chat.sendMessageStream([{ functionResponse: { name: "google_search", response: { content: searchResult } } }]);
                            for await (const finalChunk of finalResult.stream) {
                                if (finalChunk.text()) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text_chunk', content: finalChunk.text() })}\n\n`));
                                }
                            }
                        }
                    } else if (chunk.text()) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text_chunk', content: chunk.text() })}\n\n`));
                    }
                }
                controller.close();
            },
        });
        return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return new Response(JSON.stringify({ error: 'Failed to generate content from AI', details: error.message }), { status: 500 });
    }
}