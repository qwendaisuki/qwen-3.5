document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const initialView = document.getElementById('initial-view');
    const mainContent = document.querySelector('.main-content');

    const SEARCH_TRIGGERS = [
        'siapa', 'kapan', 'dimana', 'apa itu', 'harga', 'berita', 'terkini', 
        'jelaskan tentang', 'berapa', 'statistik', 'definisi'
    ];

    chatForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const userMessage = userInput.value.trim();
        if (userMessage === '') return;

        // PERBAIKAN: Cek apakah chat sudah dimulai
        const isFirstMessage = !initialView.classList.contains('hidden');
        if (isFirstMessage) {
            initialView.classList.add('hidden');
            // Tambahkan kelas ini untuk mengubah alignment di CSS
            mainContent.classList.add('chat-started'); 
        }

        appendMessage(userMessage, 'user-message');
        userInput.value = '';

        const isSearch = SEARCH_TRIGGERS.some(k => userMessage.toLowerCase().includes(k));
        const thinkingElement = isSearch ? showSearchingAnimation() : showThinkingAnimation();

        try {
            const response = await fetch('/api/chat', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
            });

            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            const data = await response.json();
            thinkingElement.remove();
            appendMessage(data.reply, 'ai-message');
        } catch (error) {
            console.error('Error:', error);
            thinkingElement.remove();
            appendMessage('Maaf, terjadi kesalahan. Coba lagi nanti.', 'ai-message');
        }
    });

    function appendMessage(text, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        messageDiv.innerText = text;
        chatHistory.appendChild(messageDiv);
        scrollToBottom();
    }

    function showThinkingAnimation() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-animation';
        thinkingDiv.innerHTML = `<div class="dot-container"><div class="dot dot1"></div><div class="dot dot2"></div><div class="dot dot3"></div><div class="dot dot4"></div></div>`;
        chatHistory.appendChild(thinkingDiv);
        scrollToBottom();
        return thinkingDiv;
    }
    
    function showSearchingAnimation() {
        const searchingDiv = document.createElement('div');
        searchingDiv.className = 'searching-animation';
        searchingDiv.innerHTML = `
            <div class="thinking-animation">
                <div class="dot-container">
                    <div class="dot dot1"></div>
                    <div class="dot dot2"></div>
                </div>
            </div>
            <p class="searching-text">Searching...</p>
        `;
        chatHistory.appendChild(searchingDiv);
        scrollToBottom();
        return searchingDiv;
    }

    function scrollToBottom() {
        mainContent.scrollTop = mainContent.scrollHeight;
    }
});