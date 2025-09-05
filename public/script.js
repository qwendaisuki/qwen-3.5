document.addEventListener('DOMContentLoaded', () => {
    // === Sidebar Logic (No changes) ===
    const menuIcon = document.getElementById('menu-icon');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const closeBtn = document.getElementById('close-btn');

    const openSidebar = () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    };
    const closeSidebar = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    };

    menuIcon.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    // === Chat Logic (All New) ===
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatArea = document.getElementById('chat-area');

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = chatInput.value.trim();
        if (!prompt) return;

        // Hide welcome screen on first message
        if (!welcomeScreen.style.display || welcomeScreen.style.display !== 'none') {
            welcomeScreen.style.display = 'none';
        }

        // Display user's message
        displayUserMessage(prompt);
        chatInput.value = '';

        // Display typing indicator
        displayTypingIndicator();

        try {
            // Send prompt to backend API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Remove typing indicator and display AI message
            removeTypingIndicator();
            // Untuk demo, kita hardcode contoh gambar karena Gemini Flash menghasilkan teks.
            // Di aplikasi nyata, Anda perlu logika untuk mendeteksi jika balasan AI berisi URL gambar.
            const imageUrl = prompt.toLowerCase().includes("gambar") || prompt.toLowerCase().includes("image")
                ? "https://i.imgur.com/r6pTpsD.jpeg" // Contoh gambar Jakarta Metropolitan
                : null;
            displayAiMessage(data.text, imageUrl);

        } catch (error) {
            console.error("Failed to fetch AI response:", error);
            removeTypingIndicator();
            displayAiMessage("Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi.", null);
        }
    });

    function displayUserMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'user-message';
        messageElement.textContent = text;
        chatContainer.appendChild(messageElement);
        scrollToBottom();
    }

    function displayAiMessage(text, imageUrl) {
        const messageElement = document.createElement('div');
        messageElement.className = 'ai-message';

        // Konten HTML lengkap untuk balasan AI
        messageElement.innerHTML = `
            <div class="ai-header">
                <img src="logo.png" alt="Logo Kecil" class="logo-small">
                <span>Qwen 3.5</span>
            </div>
            <div class="ai-response-content">
                <p>${text}</p>
                ${imageUrl ? `<p>Gambar Berhasil Dibuat</p><img src="${imageUrl}" alt="Generated Image">` : ''}
            </div>
            <div class="action-buttons">
                <button class="share-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                    <span>Bagikan</span>
                </button>
                <button title="Regenerate">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                </button>
                <button title="Suka">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"></path><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path></svg>
                </button>
                <button title="Salin">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
            </div>
        `;
        chatContainer.appendChild(messageElement);
        scrollToBottom();
    }

    function displayTypingIndicator() {
        const indicatorElement = document.createElement('div');
        indicatorElement.className = 'ai-message typing-indicator';
        indicatorElement.id = 'typing-indicator';
        indicatorElement.innerHTML = `<span></span><span></span><span></span>`;
        chatContainer.appendChild(indicatorElement);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function scrollToBottom() {
        chatArea.scrollTop = chatArea.scrollHeight;
    }
});