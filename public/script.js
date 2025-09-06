document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    const converter = new showdown.Converter();

    // Referensi elemen DOM
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    const initialView = document.getElementById('initial-view');
    const mainContent = document.querySelector(".main-content");

    // State aplikasi
    let chatHistory = [];
    let isTyping = false; // Flag untuk mencegah submit saat AI sedang mengetik

    // Event listener utama
    chatForm.addEventListener('submit', handleFormSubmit);

    async function handleFormSubmit(event) {
        event.preventDefault();
        
        // =======================================================
        // INI ADALAH BARIS YANG DIPERBAIKI
        const userInput = chatInput.value.trim();
        // =======================================================

        if (!userInput || isTyping) return; // Jangan kirim jika kosong atau AI sedang mengetik

        if (initialView && initialView.style.display !== 'none') {
            initialView.style.display = 'none';
        }

        displayUserMessage(userInput);
        chatInput.value = ''; // Kosongkan input setelah dikirim

        const searchKeywords = ['berita', 'siapa', 'apa itu', 'kapan', 'dimana', 'terkini', 'harga', 'cuaca'];
        const isLikelySearch = searchKeywords.some(keyword => userInput.toLowerCase().includes(keyword));
        showLoadingIndicator(isLikelySearch);

        try {
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
            
            removeLoadingIndicator();
            await displayAiMessage(data.reply);

        } catch (error) {
            console.error('Error:', error);
            removeLoadingIndicator();
            await displayAiMessage(`**Maaf, terjadi kesalahan:**\n\n\`\`\`\n${error.message}\n\`\`\`\n\nCoba lagi nanti.`);
        }
    }

    function displayUserMessage(message) {
        chatHistory.push({ role: 'user', parts: [{ text: message }] });
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', 'user-message');
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        scrollToBottom();
    }

    function displayAiMessage(message) {
        return new Promise(resolve => {
            isTyping = true;
            chatHistory.push({ role: 'model', parts: [{ text: message }] });
            
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message', 'ai-message');
            messageElement.innerHTML = `
                <div class="ai-header">
                    <img src="/qwen-logo.png" alt="Qwen Logo">
                    <span>Qwen</span>
                </div>
                <div class="message-content"></div>
            `;
            const contentDiv = messageElement.querySelector('.message-content');
            chatContainer.appendChild(messageElement);
            scrollToBottom();
            
            let i = 0;
            const typingSpeed = 20;
            let currentText = "";

            function type() {
                if (i < message.length) {
                    currentText += message[i];
                    contentDiv.innerHTML = converter.makeHtml(currentText) + '<span class="typing-cursor"></span>';
                    i++;
                    scrollToBottom();
                    setTimeout(type, typingSpeed);
                } else {
                    contentDiv.innerHTML = converter.makeHtml(message);
                    isTyping = false;
                    resolve();
                }
            }
            type();
        });
    }

    function showLoadingIndicator(isSearching) {
        const indicatorText = isSearching ? "mencari..." : "thinking...";
        const indicator = document.createElement('div');
        indicator.id = 'loading-indicator';
        indicator.classList.add('chat-message', 'ai-message');
        const dotCount = 3;
        let dotsHtml = '';
        for (let i = 1; i <= dotCount; i++) {
            dotsHtml += `<div class="dot dot-${i}"></div>`;
        }
        indicator.innerHTML = `<div class="thinking-indicator"><div class="bouncing-dots">${dotsHtml}</div><div class="thinking-text">${indicatorText}</div></div>`;
        chatContainer.appendChild(indicator);
        scrollToBottom();
    }
    
    function removeLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        mainContent.scrollTop = mainContent.scrollHeight;
    }

    // Animasi placeholder (tidak berubah)
    const placeholders = ["Tanyakan apa saja...", "Contoh: Apa berita terbaru hari ini?", "Buatkan saya skripsi tentang AI"];
    let currentPlaceholderIndex = 0, charIndex = 0, isDeleting = false;
    function typeAnimation() {
        if (!chatInput) return;
        const fullText = placeholders[currentPlaceholderIndex];
        let typeSpeed = isDeleting ? 50 : 120;
        charIndex += isDeleting ? -1 : 1;
        chatInput.placeholder = fullText.substring(0, charIndex);
        if (!isDeleting && charIndex === fullText.length) {
            typeSpeed = 3000; isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false; currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholders.length;
        }
        setTimeout(typeAnimation, typeSpeed);
    }
    typeAnimation();
});