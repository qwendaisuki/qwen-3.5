document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatHistory = document.getElementById('chat-history');
    let currentAiMessageElement = null; // Untuk menyimpan referensi ke elemen pesan AI yang sedang di-stream

    // Function to append text to the current AI message element
    function appendTextToAiMessage(text) {
        if (currentAiMessageElement) {
            currentAiMessageElement.innerHTML += text;
            chatHistory.scrollTop = chatHistory.scrollHeight; // Scroll selama mengetik
        }
    }

    // Function to add a message to the chat history
    async function addMessageToChat(sender, message = '') {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', sender);

        // Buat ikon AI untuk pesan AI
        const aiIcon = document.createElement('div');
        aiIcon.classList.add('ai-icon');
        aiIcon.textContent = 'Q';
        messageDiv.appendChild(aiIcon);

        // Buat elemen teks untuk pesan
        const textContent = document.createElement('div');
        textContent.classList.add('message-text');
        messageDiv.appendChild(textContent);

        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight; // Pastikan scroll ke bawah

        if (sender === 'ai') {
            currentAiMessageElement = textContent; // Set referensi ke elemen teks AI ini

            if (message === 'typing-indicator') {
                // Jika pesan adalah 'typing-indicator', masukkan HTML animasi langsung ke elemen teks
                textContent.innerHTML = `
                    <div class="typing-indicator">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                `;
            } else {
                // Untuk pesan awal atau error, langsung set teks
                textContent.textContent = message;
            }

        } else { // Pesan User
            textContent.textContent = message;
        }
    }

    // Event listener for send button click
    sendButton.addEventListener('click', async () => {
        const message = userInput.value.trim();
        if (message) {
            await addMessageToChat('user', message); // Tambahkan pesan user
            userInput.value = ''; // Kosongkan input
            userInput.style.height = 'auto'; // Reset tinggi textarea

            await addMessageToChat('ai', 'typing-indicator'); // Tampilkan indikator mengetik animasi

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt: message }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error || response.statusText}`);
                }
                
                // Mendapatkan reader dari body respons (untuk membaca stream)
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let firstChunkReceived = false; // Flag untuk tahu kapan chunk teks pertama tiba

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true }); // Dekode chunk dan tambahkan ke buffer

                    // Proses setiap event SSE
                    let lines = buffer.split('\n');
                    buffer = lines.pop(); // Simpan baris terakhir yang mungkin belum lengkap

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonString = line.substring(6); // Hapus 'data: '
                                const data = JSON.parse(jsonString);
                                if (data.text) {
                                    if (!firstChunkReceived && currentAiMessageElement) {
                                        // Saat chunk teks pertama tiba, hapus indikator mengetik
                                        currentAiMessageElement.innerHTML = '';
                                        firstChunkReceived = true;
                                    }
                                    appendTextToAiMessage(data.text);
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e, line);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching AI response:', error);
                if (currentAiMessageElement) {
                    // Jika error terjadi, pastikan indikator mengetik dihapus dan tampilkan pesan error
                    currentAiMessageElement.innerHTML = `
                        Oops! Something went wrong. Please try again.<br>
                        <small><em>Details: ${error.message}</em></small>
                    `;
                } else {
                    // Jika error terjadi bahkan sebelum elemen pesan AI dibuat, buat pesan error baru
                    await addMessageToChat('ai', `Oops! Something went wrong. Please try again.<br><small><em>Details: ${error.message}</em></small>`);
                }
            } finally {
                currentAiMessageElement = null; // Reset referensi setelah stream selesai atau gagal
                // Di sini tidak perlu removeTypingIndicator() lagi karena sudah dihapus oleh firstChunkReceived
            }
        }
    });

    // Event listener for Enter key in textarea
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendButton.click();
        }
    });

    // Adjust textarea height dynamically
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    // Initial greeting
    addMessageToChat('ai', 'Hello there! I am Qwen 3.5, your personal AI assistant. How can I help you today?');

    // Make suggested prompts clickable (optional, you can expand this logic)
    document.querySelectorAll('.suggested-prompt').forEach(promptDiv => {
        promptDiv.addEventListener('click', () => {
            const text = promptDiv.querySelector('p').textContent.trim();
            userInput.value = text;
            userInput.focus();
        });
    });
});