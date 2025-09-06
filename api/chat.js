// Mengimpor library Google Generative AI
import { GoogleGenerativeAI } from '@google/generative-ai';

// Fungsi utama yang akan dijalankan oleh Vercel sebagai endpoint API
export default async function handler(req, res) {
  // Hanya izinkan permintaan dengan metode POST untuk keamanan
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- PERUBAHAN DI SINI ---
    // Sekarang kode mencari 'GEMINI_API_KEY' sesuai dengan nama variabel Anda di Vercel.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 
    // -------------------------

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Ambil pesan pengguna dari body permintaan yang dikirim dari frontend
    const { message } = req.body;

    // Validasi: pastikan pesan tidak kosong
    if (!message) {
      return res.status(400).json({ error: 'Message is required in the request body.' });
    }

    // Hasilkan konten (respons AI) berdasarkan pesan pengguna
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    // Kirim kembali respons dari AI ke frontend sebagai JSON
    res.status(200).json({ reply: text });

  } catch (error) {
    // Tangani jika terjadi error (misalnya API key salah, masalah jaringan, dll.)
    console.error('Error calling Google AI:', error);
    res.status(500).json({ error: 'An error occurred while communicating with the AI.' });
  }
      }
