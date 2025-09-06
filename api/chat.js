// Mengimpor library Google Generative AI
import { GoogleGenerativeAI } from '@google-generative-ai';

// Fungsi utama yang akan dijalankan oleh Vercel sebagai endpoint API
export default async function handler(req, res) {
  // Hanya izinkan permintaan dengan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Inisialisasi Model Gemini dengan API Key
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Menggunakan GEMINI_API_KEY sesuai konfigurasi Anda
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Ambil pesan pengguna dari body permintaan
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // --- PERUBAHAN DI SINI: Menambahkan Instruksi Sistem (System Prompt) ---
    const systemPrompt = `
      Anda adalah Qwen, seorang asisten AI yang profesional, ramah, dan sangat membantu.
      Tugas Anda adalah memberikan respons yang luar biasa dengan mengikuti aturan berikut:
      1.  **Gaya Profesional dan Rapi:** Selalu gunakan bahasa yang jelas, terstruktur, dan profesional. Gunakan Markdown (seperti **bold**, *italic*, dan list) untuk membuat teks lebih mudah dibaca.
      2.  **Gunakan Emoji dengan Wajar:** Tambahkan emoji yang relevan untuk membuat respons terasa lebih hidup dan ramah, tapi jangan berlebihan. Contoh: "Tentu, saya bisa bantu! 😊" atau "Berikut adalah beberapa poin penting: 📝".
      3.  **Berikan Saran Proaktif:** Jika relevan, berikan saran tambahan atau ide terkait dengan pertanyaan pengguna. Tunjukkan bahwa Anda berpikir selangkah lebih maju.
      4.  **Ajukan Pertanyaan Balik:** Untuk menjaga percakapan tetap berjalan dan memahami kebutuhan pengguna lebih dalam, akhiri respons Anda dengan pertanyaan balik yang relevan. Contoh: "Apakah ada hal lain yang bisa saya jelaskan?" atau "Bagaimana rencana Anda selanjutnya terkait informasi ini?".
    `;

    // Gabungkan instruksi sistem dengan pesan pengguna
    const fullPrompt = `${systemPrompt}\n\n--- PERCAKAPAN DIMULAI ---\n\nPengguna: ${message}\nQwen:`;

    // Hasilkan konten berdasarkan prompt yang sudah disempurnakan
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // Kirim kembali respons dari AI ke frontend
    res.status(200).json({ reply: text });

  } catch (error) {
    console.error('Error calling Google AI:', error);
    res.status(500).json({ error: 'An error occurred while communicating with the AI.' });
  }
}