const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function fileToGenerativePart(fileData, mimeType) {
  return {
    inlineData: {
      data: fileData.replace(/^data:[^;]+;base64,/, ''),
      mimeType,
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, history, fileData, mimeType } = req.body;

    if (!prompt && !fileData) { // Membutuhkan prompt atau file
      return res.status(400).json({ error: 'Prompt or file is required' });
    }

    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: "You are Qwen, a helpful and friendly AI assistant. Your responses should be well-structured, informative, and adapt to the user's tone. Use Markdown for formatting when appropriate.",
    });

    const chat = model.startChat({
        history: history || [],
    });

    const parts = [{ text: prompt }];
    
    if (fileData && mimeType) {
      parts.unshift(fileToGenerativePart(fileData, mimeType));
    }
    
    const result = await chat.sendMessage(parts);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ text: text });

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: 'Failed to generate content from AI' });
  }
}