document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatHistory = document.getElementById('chat-history');
    let currentAiMessageElement = null; // Untuk menyimpan referensi ke elemen pesan AI yang sedang ditampilkan

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
            // NEW: Render markdown untuk pesan AI
            textContent.innerHTML = marked.parse(message); // Menggunakan marked.parse()
        } else { // Pesan User
            textContent.innerHTML = message; // Pesan user tidak perlu di-parse markdown
        }
    }

    // Event listener for send button click
    sendButton.addEventListener('click', async () => {
        const message = userInput.value.trim();
        if (message) {
            await addMessageToChat('user', message); // Tambahkan pesan user
            userInput.value = ''; // Kosongkan input
            userInput.style.height = 'auto'; // Reset tinggi textarea

            await addMessageToChat('ai', 'Thinking...'); // Tampilkan indikator 'Thinking...'

            try {
                // Menggunakan Fetch API untuk mengirim prompt ke serverless function (non-streaming)
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
                
                const data = await response.json(); // Ambil seluruh respons sekaligus
                
                // Ganti 'Thinking...' dengan respons AI yang sebenarnya
                if (currentAiMessageElement) {
                    // NEW: Render markdown untuk respons AI yang datang
                    currentAiMessageElement.innerHTML = marked.parse(data.response); // Menggunakan marked.parse()
                }
                
            } catch (error) {
                console.error('Error fetching AI response:', error);
                if (currentAiMessageElement) {
                    currentAiMessageElement.innerHTML = `
                        Oops! Something went wrong. Please try again.<br>
                        <small><em>Details: ${error.message}</em></small>
                    `;
                } else {
                    await addMessageToChat('ai', `Oops! Something went wrong. Please try again.<br><small><em>Details: ${error.message}</em></small>`);
                }
            } finally {
                currentAiMessageElement = null; // Reset referensi setelah selesai atau gagal
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
    document.querySelectorAll('.action-button').forEach(button => {
        button.addEventListener('click', () => {
            const text = button.textContent.trim(); 
            userInput.value = text;
            userInput.focus();
            userInput.style.height = 'auto'; 
            userInput.style.height = userInput.scrollHeight + 'px'; 
        });
    });

    document.querySelectorAll('.suggested-prompt').forEach(promptDiv => {
        promptDiv.addEventListener('click', () => {
            const text = promptDiv.querySelector('p').textContent.trim(); 
            userInput.value = text;
            userInput.focus();
            userInput.style.height = 'auto'; 
            userInput.style.height = userInput.scrollHeight + 'px'; 
        });
    });
});
