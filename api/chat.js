// Mengimpor library Google Generative AI
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inisialisasi model dengan API Key dari Vercel Environment Variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Fungsi utama yang akan dijalankan oleh Vercel
export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Ambil prompt dari body permintaan yang dikirim dari frontend
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Pilih model Gemini yang akan digunakan
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Hasilkan konten berdasarkan prompt
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Kirim balasan sebagai JSON
    res.status(200).json({ text: text });

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: 'Failed to generate content from AI' });
  }
}