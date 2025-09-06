document.addEventListener('DOMContentLoaded', () => {
    // ===================================
    // 1. INISIALISASI
    // ===================================
    lucide.createIcons();
    const converter = new showdown.Converter(); // Inisialisasi converter Markdown

    // ===================================
    // 2. REFERENSI ELEMEN DOM
    // ===================================
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    const initialView = document.getElementById('initial-view');
    const mainContent = document.querySelector(".main-content"); // Ambil main-content untuk scrolling

    // ===================================
    // 3. STATE APLIKASI
    // ===================================
    let chatHistory = []; // Variabel untuk menyimpan riwayat chat (konteks)

    // ===================================
    // 4. FUNGSI UTAMA (FORM SUBMIT)
    // ===================================
    chatForm.addEventListener('submit', handleFormSubmit);

    async function handleFormSubmit(event) {
        event.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        // Sembunyikan tampilan awal jika masih ada
        if (initialView && initialView.style.display !== 'none') {
            initialView.style.display = 'none';
        }

        displayUserMessage(userInput);
        chatInput.value = '';

        // Tampilkan animasi "mencari..."
        showSearchingIndicator();

        try {
            // Kirim prompt DAN riwayat chat ke backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userInput, history: chatHistory }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok');
            }

            const data = await response.json();
            
            removeSearchingIndicator();
            displayAiMessage(data.reply);

        } catch (error) {
            console.error('Error:', error);
            removeSearchingIndicator();
            // Menampilkan error dalam format markdown juga
            displayAiMessage(`**Maaf, terjadi kesalahan:**\n\n\`\`\`\n${error.message}\n\`\`\`\n\nCoba lagi nanti.`);
        }
    }

    // ===================================
    // 5. FUNGSI TAMPILAN (DISPLAY)
    // ===================================
    function displayUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', 'user-message');
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        // Tambahkan pesan user ke riwayat
        chatHistory.push({ role: 'user', parts: [{ text: message }] });
        scrollToBottom();
    }

    function displayAiMessage(message) {
        // Tambahkan respon AI ke riwayat SEBELUM di-render
        chatHistory.push({ role: 'model', parts: [{ text: message }] });

        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', 'ai-message');
        
        // Konversi Markdown dari AI menjadi HTML yang cantik
        const htmlContent = converter.makeHtml(message);
        
        messageElement.innerHTML = `
            <div class="ai-header">
                <img src="/qwen-logo.png" alt="Qwen Logo">
                <span>Qwen</span>
            </div>
            <div class="message-content">
                ${htmlContent}
            </div>
        `;
        chatContainer.appendChild(messageElement);
        scrollToBottom();
    }
    
    function showSearchingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'searching-indicator';
        indicator.classList.add('chat-message', 'ai-message');
        
        const dotCount = (chatContainer.querySelectorAll('.ai-message, .searching-indicator').length % 2 === 0) ? 3 : 4;
        let dotsHtml = '';
        for (let i = 1; i <= dotCount; i++) {
            dotsHtml += `<div class="dot dot-${i}"></div>`;
        }
        
        indicator.innerHTML = `
            <div class="thinking-indicator">
                <div class="bouncing-dots">${dotsHtml}</div>
                <div class="thinking-text">mencari...</div>
            </div>
        `;
        
        chatContainer.appendChild(indicator);
        scrollToBottom();
    }
    
    function removeSearchingIndicator() {
        const indicator = document.getElementById('searching-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function scrollToBottom() {
        mainContent.scrollTop = mainContent.scrollHeight;
    }
    
    // ===================================
    // 6. ANIMASI PLACEHOLDER INPUT
    // ===================================
    const placeholders = [
        "Tanyakan apa saja padaku...",
        "Contoh: Apa berita terbaru hari ini?",
        "Buatkan saya skripsi tentang AI",
        "Tulis sebuah cerita pendek...",
    ];
    let currentPlaceholderIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    function typeAnimation() {
        if (!chatInput) return;
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
        
        setTimeout(typeAnimation, typeSpeed);
    }
    
    // Mulai animasi placeholder
    typeAnimation();
});