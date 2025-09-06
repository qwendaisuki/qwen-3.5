const { GoogleGenerativeAI } = require("@google/generative-ai");

// Handler utama untuk serverless function
export default async function handler(req, res) {
  // 1. Ambil API Key dari environment variable Vercel menggunakan nama yang benar
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured.");
    return res.status(500).json({ error: 'API key is not configured' });
  }

  // Hanya izinkan method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // Ambil prompt dari body request
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Pilih model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Generate konten
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Kirim balasan ke frontend
    res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
}