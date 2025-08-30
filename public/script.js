document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatHistory = document.getElementById('chat-history');
    const newChatButton = document.getElementById('new-chat-button');
    let currentAiMessageElement = null; // Untuk menyimpan referensi ke elemen pesan AI yang sedang ditampilkan

    let messages = []; 

    // NEW: Fungsi terpisah untuk memastikan chat history selalu scroll ke bawah
    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Function to save messages to Local Storage
    function saveMessagesToLocalStorage() {
        localStorage.setItem('qwen35_chat_history', JSON.stringify(messages));
    }

    // Function to load messages from Local Storage
    function loadMessagesFromLocalStorage() {
        const savedMessages = localStorage.getItem('qwen35_chat_history');
        if (savedMessages) {
            messages = JSON.parse(savedMessages);
            chatHistory.innerHTML = ''; // Kosongkan dulu untuk menghindari duplikasi
            for (const msg of messages) {
                renderMessageToChatHistory(msg.sender, msg.content); 
            }
            scrollToBottom(); // NEW: Panggil scrollToBottom setelah merender semua pesan
            return true; 
        }
        return false; 
    }

    // Fungsi terpisah untuk merender pesan ke UI tanpa menyentuh array 'messages' atau localStorage
    function renderMessageToChatHistory(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', sender);

        const aiIcon = document.createElement('div');
        aiIcon.classList.add('ai-icon');
        aiIcon.textContent = 'Q';
        messageDiv.appendChild(aiIcon);

        const textContent = document.createElement('div');
        textContent.classList.add('message-text');
        messageDiv.appendChild(textContent);

        chatHistory.appendChild(messageDiv);
        scrollToBottom(); // NEW: Panggil scrollToBottom setiap kali pesan baru ditambahkan

        if (sender === 'ai') {
            textContent.innerHTML = marked.parse(content); 
        } else { // Pesan User
            textContent.innerHTML = content; 
        }
    }

    // Function to add a message to the chat history (now also saves to 'messages' array)
    async function addMessageToChat(sender, message = '') {
        // Render pesan ke UI
        renderMessageToChatHistory(sender, message);
        
        // Simpan pesan ke array 'messages'
        messages.push({ sender, content: message });
        saveMessagesToLocalStorage(); // Simpan ke localStorage

        // Set currentAiMessageElement hanya jika itu pesan AI baru
        if (sender === 'ai') {
            const lastMessageDiv = chatHistory.lastChild;
            if (lastMessageDiv) {
                 currentAiMessageElement = lastMessageDiv.querySelector('.message-text');
            }
        }
    }

    // Function to clear chat history and start a new chat
    function startNewChat() {
        chatHistory.innerHTML = ''; // Kosongkan semua pesan di riwayat chat
        userInput.value = ''; // Kosongkan input field
        userInput.style.height = 'auto'; // Reset tinggi textarea
        currentAiMessageElement = null; // Reset referensi pesan AI
        messages = []; // Kosongkan array pesan
        localStorage.removeItem('qwen35_chat_history'); // Hapus dari localStorage

        // Tampilkan greeting awal lagi dan simpan ke history baru
        addMessageToChat('ai', 'Hello there! I am Qwen 3.5, your personal AI assistant. How can I help you today?'); 
    }

    // Event listener for send button click
    sendButton.addEventListener('click', async () => {
        const message = userInput.value.trim();
        if (message) {
            await addMessageToChat('user', message); // Tambahkan pesan user & simpan
            userInput.value = ''; // Kosongkan input
            userInput.style.height = 'auto'; // Reset tinggi textarea

            await addMessageToChat('ai', 'Thinking...'); // Tampilkan indikator 'Thinking...' & simpan

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
                
                const data = await response.json(); // Ambil seluruh respons sekaligus
                
                // Ganti 'Thinking...' dengan respons AI yang sebenarnya
                if (currentAiMessageElement) {
                    currentAiMessageElement.innerHTML = marked.parse(data.response); // Render markdown untuk respons AI
                    // Update array messages dan localStorage setelah AI merespons
                    const lastAiMessageIndex = messages.findIndex(msg => msg.sender === 'ai' && msg.content === 'Thinking...');
                    if (lastAiMessageIndex !== -1) {
                        messages[lastAiMessageIndex].content = data.response;
                        saveMessagesToLocalStorage();
                    }
                }
                
            } catch (error) {
                console.error('Error fetching AI response:', error);
                const errorMessage = `Oops! Something went wrong. Please try again.<br><small><em>Details: ${error.message}</em></small>`;
                if (currentAiMessageElement) {
                    currentAiMessageElement.innerHTML = errorMessage;
                    // Update array messages dengan pesan error
                    const lastAiMessageIndex = messages.findIndex(msg => msg.sender === 'ai' && msg.content === 'Thinking...');
                    if (lastAiMessageIndex !== -1) {
                        messages[lastAiMessageIndex].content = errorMessage;
                        saveMessagesToLocalStorage();
                    }
                } else {
                    await addMessageToChat('ai', errorMessage); // Jika tidak ada currentAiMessageElement, buat pesan error baru
                }
            } finally {
                currentAiMessageElement = null; // Reset referensi setelah selesai atau gagal
            }
            scrollToBottom(); // NEW: Panggil scrollToBottom setelah respons AI selesai atau error terjadi
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

    // Load messages from Local Storage on initial load
    const hasSavedMessages = loadMessagesFromLocalStorage();
    if (!hasSavedMessages) {
        startNewChat(); 
    } else {
        currentAiMessageElement = null; 
    }

    // Event listener untuk tombol New Chat
    newChatButton.addEventListener('click', startNewChat);

    // Make suggested prompts and action buttons clickable
    document.querySelectorAll('.action-button').forEach(button => {
        button.addEventListener('click', () => {
            const text = button.textContent.trim(); 
            userInput.value = text;
            userInput.focus();
            userInput.style.height = 'auto'; 
            userInput.style.height = userInput.scrollHeight + 'px'; 
            scrollToBottom(); // NEW: Auto-scroll saat prompt diisi dari tombol
        });
    });

    document.querySelectorAll('.suggested-prompt').forEach(promptDiv => {
        promptDiv.addEventListener('click', () => {
            const text = promptDiv.querySelector('p').textContent.trim(); 
            userInput.value = text;
            userInput.focus();
            userInput.style.height = 'auto'; 
            userInput.style.height = userInput.scrollHeight + 'px'; 
            scrollToBottom(); // NEW: Auto-scroll saat prompt diisi dari tombol
        });
    });
});