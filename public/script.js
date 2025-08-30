document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatHistory = document.getElementById('chat-history');
    let currentAiMessageElement = null; // Untuk menyimpan referensi ke elemen pesan AI yang sedang di-stream
    let typingIndicatorElement = null; // Referensi ke elemen indikator mengetik

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

        if (sender === 'ai') {
            const aiIcon = document.createElement('div');
            aiIcon.classList.add('ai-icon');
            aiIcon.textContent = 'Q';
            messageDiv.appendChild(aiIcon);

            const textContent = document.createElement('div');
            textContent.classList.add('message-text');
            messageDiv.appendChild(textContent);

            chatHistory.appendChild(messageDiv);
            currentAiMessageElement = textContent; // Set referensi untuk streaming

            if (message === 'typing-indicator') { // Khusus untuk indikator mengetik
                currentAiMessageElement.innerHTML = ''; // Pastikan kosong
                typingIndicatorElement = document.createElement('div');
                typingIndicatorElement.classList.add('typing-indicator');
                typingIndicatorElement.innerHTML = `
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                `;
                currentAiMessageElement.appendChild(typingIndicatorElement);
            } else {
                currentAiMessageElement.textContent = message; // Initial text (e.g., error messages)
            }

        } else {
            messageDiv.innerHTML = `<div class="message-text">${message}</div>`;
            chatHistory.appendChild(messageDiv);
        }
        chatHistory.scrollTop = chatHistory.scrollHeight; // Pastikan scroll ke bawah
    }

    // Function to remove the typing indicator
    function removeTypingIndicator() {
        if (typingIndicatorElement && typingIndicatorElement.parentNode) {
            typingIndicatorElement.parentNode.removeChild(typingIndicatorElement);
            typingIndicatorElement = null;
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
                // Menggunakan Fetch API untuk membaca stream dari serverless function
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt: message }),
                });

                // Setelah mendapatkan respons dari fetch, hapus indikator mengetik
                removeTypingIndicator();
                if (currentAiMessageElement) {
                    currentAiMessageElement.textContent = ''; // Pastikan juga teks awal "typing-indicator" hilang
                }


                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error || response.statusText}`);
                }
                
                // Mendapatkan reader dari body respons (untuk membaca stream)
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

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
                // Menampilkan error yang lebih ramah pengguna
                if (currentAiMessageElement) {
                    // Hapus indikator mengetik jika error terjadi setelah tampil
                    removeTypingIndicator(); 
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
                removeTypingIndicator(); // Pastikan indikator hilang di semua kondisi
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