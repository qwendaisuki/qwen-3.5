document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatHistory = document.getElementById('chat-history');
    const newChatButton = document.getElementById('new-chat-button');
    let currentAiMessageElement = null; // Untuk menyimpan referensi ke elemen pesan AI yang sedang ditampilkan

    let messages = []; 

    // NEW: Kustomisasi Marked.js renderer untuk menambahkan tombol copy pada blok kode
    const renderer = new marked.Renderer();
    renderer.code = (code, language) => {
        // Jika tidak ada bahasa, gunakan 'plaintext'
        const langClass = language ? `language-${language}` : '';
        return `
            <pre><code class="${langClass}">${code}</code><button class="copy-button"><i class="fas fa-copy"></i> Copy</button></pre>
        `;
    };
    // Mengaplikasikan renderer kustom
    marked.setOptions({
        renderer: renderer,
        highlight: function(code, lang) {
            // Bisa menambahkan syntax highlighting library di sini, contoh: highlight.js
            // Untuk saat ini, hanya mengembalikan kode apa adanya
            return code;
        },
        langPrefix: 'language-',
        gfm: true, // GitHub Flavored Markdown
        breaks: true, // Line breaks from Markdown will be rendered as <br>
    });


    // Fungsi terpisah untuk memastikan chat history selalu scroll ke bawah
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
            chatHistory.innerHTML = ''; 
            for (const msg of messages) {
                renderMessageToChatHistory(msg.sender, msg.content); 
            }
            scrollToBottom(); 
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
        scrollToBottom(); 

        if (sender === 'ai') {
            // NEW: Render markdown dengan custom renderer
            textContent.innerHTML = marked.parse(content); 
            // NEW: Tambahkan event listener untuk tombol copy setelah rendering
            addCopyButtonListeners(textContent);
        } else { // Pesan User
            textContent.innerHTML = content; 
        }
    }

    // NEW: Fungsi untuk menambahkan event listener ke tombol copy
    function addCopyButtonListeners(element) {
        const copyButtons = element.querySelectorAll('.copy-button');
        copyButtons.forEach(button => {
            button.addEventListener('click', () => {
                const preElement = button.closest('pre');
                const codeElement = preElement.querySelector('code');
                const codeToCopy = codeElement.textContent;
                
                navigator.clipboard.writeText(codeToCopy).then(() => {
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    button.classList.add('copied');
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.classList.remove('copied');
                    }, 2000); // Reset setelah 2 detik
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            });
        });
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
        chatHistory.innerHTML = ''; 
        userInput.value = ''; 
        userInput.style.height = 'auto'; 
        currentAiMessageElement = null; 
        messages = []; 
        localStorage.removeItem('qwen35_chat_history'); 

        addMessageToChat('ai', 'Hello there! I am Qwen 3.5, your personal AI assistant. How can I help you today?'); 
    }

    // Event listener for send button click
    sendButton.addEventListener('click', async () => {
        const message = userInput.value.trim();
        if (message) {
            await addMessageToChat('user', message); 
            userInput.value = ''; 
            userInput.style.height = 'auto'; 

            await addMessageToChat('ai', 'Thinking...'); 

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
                
                const data = await response.json(); 
                
                // Ganti 'Thinking...' dengan respons AI yang sebenarnya
                if (currentAiMessageElement) {
                    currentAiMessageElement.innerHTML = marked.parse(data.response); // Render markdown untuk respons AI
                    // Setelah merender, tambahkan listener copy
                    addCopyButtonListeners(currentAiMessageElement);

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
                    const lastAiMessageIndex = messages.findIndex(msg => msg.sender === 'ai' && msg.content === 'Thinking...');
                    if (lastAiMessageIndex !== -1) {
                        messages[lastAiMessageIndex].content = errorMessage;
                        saveMessagesToLocalStorage();
                    }
                } else {
                    await addMessageToChat('ai', errorMessage); 
                }
            } finally {
                currentAiMessageElement = null; 
            }
            scrollToBottom(); 
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
            scrollToBottom(); 
        });
    });

    document.querySelectorAll('.suggested-prompt').forEach(promptDiv => {
        promptDiv.addEventListener('click', () => {
            const text = promptDiv.querySelector('p').textContent.trim(); 
            userInput.value = text;
            userInput.focus();
            userInput.style.height = 'auto'; 
            userInput.style.height = userInput.scrollHeight + 'px'; 
            scrollToBottom(); 
        });
    });
});