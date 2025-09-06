document.addEventListener('DOMContentLoaded', () => {
    // 1. Inisialisasi Lucide Icons
    lucide.createIcons();

    // 2. Referensi elemen DOM
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    const initialView = document.getElementById('initial-view');

    // 3. Animasi Teks Morph untuk Placeholder Input (Opsional)
    const placeholders = [
        "Tanyakan apa saja padaku...",
        "Contoh: buatkan puisi tentang senja",
        "Apa itu kecerdasan buatan?",
        "Tulis sebuah cerita pendek...",
        "Bagaimana cara kerja Qwen?"
    ];
    let currentPlaceholderIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    function type() {
        if (!chatInput) return; // Hentikan jika input tidak ada
        const fullText = placeholders[currentPlaceholderIndex];
        
        let typeSpeed = isDeleting ? 50 : 120;
        
        if (isDeleting) {
            charIndex--;
        } else {
            charIndex++;
        }
        
        chatInput.placeholder = fullText.substring(0, charIndex);

        if (!isDeleting && charIndex === fullText.length) {
            typeSpeed = 3000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholders.length;
        }
        
        setTimeout(type, typeSpeed);
    }
    type(); // Jalankan animasi placeholder

    // 4. Event listener utama untuk form submit
    chatForm.addEventListener('submit', handleFormSubmit);

    async function handleFormSubmit(event) {
        event.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        // Sembunyikan tampilan awal
        if (initialView && initialView.style.display !== 'none') {
            initialView.style.display = 'none';
        }

        displayUserMessage(userInput);
        chatInput.value = '';
        chatInput.placeholder = ""; // Kosongkan placeholder selama chat aktif

        showThinkingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userInput }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok');
            }

            const data = await response.json();
            
            removeThinkingIndicator();
            displayAiMessage(data.reply);

        } catch (error) {
            console.error('Error:', error);
            removeThinkingIndicator();
            displayAiMessage(`Maaf, terjadi kesalahan: ${error.message}. Coba lagi nanti.`);
        }
    }

    function displayUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', 'user-message');
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        scrollToBottom();
    }

    function displayAiMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', 'ai-message');
        
        messageElement.innerHTML = `
            <div class="ai-header">
                <img src="/qwen-logo.png" alt="Qwen Logo">
                <span>Qwen</span>
            </div>
            <div class="message-content">
                ${message.replace(/\n/g, '<br>')}
            </div>
        `;
        chatContainer.appendChild(messageElement);
        scrollToBottom();
    }
    
    function showThinkingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'thinking-indicator';
        indicator.classList.add('chat-message', 'ai-message');
        
        // Pola dot bouncing: 3 -> 4 -> 3 -> 4 ...
        const dotCount = (chatContainer.querySelectorAll('.ai-message, .thinking-indicator').length % 2 === 0) ? 3 : 4;
        let dotsHtml = '';
        for (let i = 1; i <= dotCount; i++) {
            dotsHtml += `<div class="dot dot-${i}"></div>`;
        }
        
        indicator.innerHTML = `
            <div class="thinking-indicator">
                <div class="bouncing-dots">${dotsHtml}</div>
                <div class="thinking-text">thinking</div>
            </div>
        `;
        
        chatContainer.appendChild(indicator);
        scrollToBottom();
    }
    
    function removeThinkingIndicator() {
        const indicator = document.getElementById('thinking-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});