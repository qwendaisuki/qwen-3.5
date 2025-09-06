// Menunggu hingga seluruh konten halaman (HTML) dimuat sebelum menjalankan skrip
document.addEventListener('DOMContentLoaded', () => {

    // --- Referensi Elemen-elemen DOM ---
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const voiceBtn = document.getElementById('voice-btn');
    const sendBtn = document.getElementById('send-btn');
    const attachBtn = document.getElementById('attach-btn');
    const attachmentPopup = document.getElementById('attachment-popup');
    const attachmentPreview = document.getElementById('attachment-preview');
    const fileNameSpan = document.getElementById('file-name');
    const removeAttachmentBtn = document.getElementById('remove-attachment-btn');
    const historyContainer = document.getElementById('history-container');
    
    const fileInputs = {
        gallery: document.getElementById('file-input-gallery'),
        camera: document.getElementById('file-input-camera'),
        files: document.getElementById('file-input-files')
    };

    // --- Inisialisasi Tampilan Awal ---
    sendBtn.innerHTML = `
        <svg class="send-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        <svg class="stop-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>`;
    sendBtn.style.display = 'none';

    // --- FUNGSI UTAMA: MENGIRIM CHAT ---
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const userMessage = chatInput.value.trim();
        if (userMessage === '') return;

        welcomeScreen.style.display = 'none';
        displayUserMessage(userMessage);

        const aiMessageContentElement = displayAiThinking();
        scrollToBottom();
        
        chatInput.value = '';
        chatInput.dispatchEvent(new Event('input'));

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            const formattedHtml = marked.parse(data.reply);
            aiMessageContentElement.innerHTML = formattedHtml;
            aiMessageContentElement.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

        } catch (error) {
            console.error('Fetch error:', error);
            aiMessageContentElement.innerHTML = `<p style="color: #ff8a80;">Maaf, terjadi kesalahan: ${error.message}</p>`;
        } finally {
            scrollToBottom();
        }
    });
    
    // --- Fungsi Bantuan untuk UI Chat ---
    function displayUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'user-message';
        messageDiv.textContent = message;
        chatContainer.appendChild(messageDiv);
    }

    function displayAiThinking() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message';
        messageDiv.innerHTML = `
            <div class="ai-header">
                <img src="logo.png" alt="Logo" class="logo-small">
                <span>Qwen</span>
            </div>
            <div class="ai-response-content">
                <div class="status-indicator" style="display: flex; align-items: center; gap: 8px;">
                    <div class="dots"><span></span><span></span><span></span></div>
                </div>
            </div>`;
        chatContainer.appendChild(messageDiv);
        return messageDiv.querySelector('.ai-response-content');
    }

    function scrollToBottom() {
        const chatArea = document.getElementById('chat-area');
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    // --- Logika UI Lainnya (Tombol, Attachment, Sidebar) ---
    chatInput.addEventListener('input', () => {
        const hasText = chatInput.value.trim() !== '';
        voiceBtn.style.display = hasText ? 'none' : 'flex';
        sendBtn.style.display = hasText ? 'flex' : 'none';
    });

    attachBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        attachmentPopup.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
        if (!attachmentPopup.contains(event.target) && !attachBtn.contains(event.target)) {
            attachmentPopup.classList.remove('show');
        }
    });

    document.getElementById('attach-gallery-btn').addEventListener('click', () => fileInputs.gallery.click());
    document.getElementById('attach-camera-btn').addEventListener('click', () => fileInputs.camera.click());
    document.getElementById('attach-files-btn').addEventListener('click', () => fileInputs.files.click());

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            attachmentPreview.style.display = 'flex';
            attachmentPopup.classList.remove('show');
        }
    };
    Object.values(fileInputs).forEach(input => input.addEventListener('change', handleFileChange));

    removeAttachmentBtn.addEventListener('click', () => {
        Object.values(fileInputs).forEach(input => { input.value = ''; });
        attachmentPreview.style.display = 'none';
        fileNameSpan.textContent = '';
    });

    historyContainer.addEventListener('click', (event) => {
        const menuDots = event.target.closest('.menu-dots');
        if (!menuDots) return;
        const menuOptions = menuDots.nextElementSibling;
        document.querySelectorAll('.menu-options').forEach(menu => {
            if (menu !== menuOptions) menu.style.display = 'none';
        });
        if (menuOptions) menuOptions.style.display = menuOptions.style.display === 'block' ? 'none' : 'block';
    });

    function addHistoryItem(title) {
        const historyList = historyContainer.querySelector('.history-list') || document.createElement('ul');
        if (!historyContainer.querySelector('.history-list')) {
            historyList.className = 'history-list';
            historyContainer.innerHTML = '<h3>Today</h3>';
            historyContainer.appendChild(historyList);
        }
        const item = document.createElement('li');
        item.className = 'history-item';
        item.innerHTML = `
            <span>${title}</span>
            <svg class="menu-dots" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            <div class="menu-options">
                <button class="export-btn">Export</button>
                <button class="delete-btn">Delete</button>
            </div>`;
        historyList.appendChild(item);
        item.querySelector('.delete-btn').addEventListener('click', () => { item.remove(); });
        item.querySelector('.export-btn').addEventListener('click', () => { alert(`Exporting: ${title}`); });
    }
    
    addHistoryItem("Percakapan Baru");
});