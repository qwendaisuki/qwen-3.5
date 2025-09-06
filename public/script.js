document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const fileInput = document.getElementById('file-input');
    const chatHistoryEl = document.getElementById('chat-history');
    const initialView = document.getElementById('initial-view');
    const mainContent = document.querySelector('.main-content');

    // Variabel untuk menyimpan riwayat percakapan
    let conversationHistory = [];
    let currentFile = null;

    fileInput.addEventListener('change', (event) => {
        currentFile = event.target.files[0];
        if (currentFile) {
            userInput.placeholder = `Tanya tentang: ${currentFile.name}`;
        }
    });

    chatForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const userMessage = userInput.value.trim();
        if (userMessage === '' && !currentFile) return;

        // Tampilkan pesan pengguna di UI
        const isFirstMessage = !initialView.classList.contains('hidden');
        if (isFirstMessage) {
            initialView.classList.add('hidden');
            mainContent.classList.add('chat-started');
        }
        appendMessage(userMessage, 'user', true);
        
        // Buat FormData untuk dikirim
        const formData = new FormData();
        formData.append('prompt', userMessage);
        formData.append('history', JSON.stringify(conversationHistory));
        if (currentFile) {
            formData.append('file', currentFile);
        }
        
        // Reset input
        userInput.value = '';
        fileInput.value = ''; // Reset file input
        userInput.placeholder = "Tanya atau upload file...";
        currentFile = null;

        // Tampilkan animasi thinking & siapkan container AI message
        const thinkingElement = showThinkingAnimation();
        const aiMessageContainer = appendMessage("", 'model', false);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData,
            });

            thinkingElement.remove(); // Hapus animasi setelah respon pertama diterima
            if (!response.ok || !response.body) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponseText = "";
            
            // Streaming respon dari API
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                aiResponseText += decoder.decode(value, { stream: true });
                // Render teks sebagai Markdown
                aiMessageContainer.innerHTML = marked.parse(aiResponseText);
                scrollToBottom();
            }

            // Simpan riwayat setelah AI selesai merespon
            conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
            conversationHistory.push({ role: 'model', parts: [{ text: aiResponseText }] });

        } catch (error) {
            if (thinkingElement) thinkingElement.remove();
            aiMessageContainer.innerText = 'Maaf, terjadi kesalahan koneksi dengan server AI.';
            console.error('Error:', error);
        }
    });

    function appendMessage(text, role, saveToHistory) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
        messageDiv.innerText = text;
        chatHistoryEl.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv;
    }

    function showThinkingAnimation() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'bouncing-loader';
        thinkingDiv.innerHTML = '<div></div><div></div><div></div>';
        chatHistoryEl.appendChild(thinkingDiv);
        scrollToBottom();
        return thinkingDiv;
    }

    function scrollToBottom() {
        mainContent.scrollTop = mainContent.scrollHeight;
    }
});