document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const initialView = document.getElementById('initial-view');
    const mainContent = document.querySelector('.main-content');

    // Daftar kata kunci yang sama dengan di backend untuk menentukan UI
    const SEARCH_TRIGGERS = [
        'siapa', 'kapan', 'dimana', 'apa itu', 'harga', 'berita', 'terkini', 
        'jelaskan tentang', 'berapa', 'statistik', 'definisi'
    ];

    chatForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const userMessage = userInput.value.trim();
        if (userMessage === '') return;

        if (!initialView.classList.contains('hidden')) {
            initialView.classList.add('hidden');
        }

        appendMessage(userMessage, 'user-message');
        userInput.value = '';

        // Tentukan animasi mana yang akan ditampilkan
        const isSearch = SEARCH_TRIGGERS.some(k => userMessage.toLowerCase().includes(k));
        const thinkingElement = isSearch ? showSearchingAnimation() : showThinkingAnimation();

        try {
            // URL tetap sama, backend yang akan menentukan logikanya
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
            appendMessage('Maaf, terjadi kesalahan. Coba lagi nanti.', 'ai-message error');
        }
    });

    function appendMessage(text, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        // Menggunakan innerHTML agar bisa merender format seperti newline (\n) jika ada
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
    
    // --- FUNGSI BARU UNTUK ANIMASI SEARCHING ---
    function showSearchingAnimation() {
        const searchingDiv = document.createElement('div');
        searchingDiv.className = 'searching-animation';
        // Gabungkan animasi titik dan teks "Searching..."
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