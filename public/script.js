document.addEventListener('DOMContentLoaded', () => {
    // === Elemen DOM ===
    const menuIcon = document.getElementById('menu-icon');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const closeBtn = document.getElementById('close-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatArea = document.getElementById('chat-area');
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    const historyContainer = document.getElementById('history-container');

    // === State Aplikasi ===
    let chatSessions = [];
    let currentChatId = null;
    let attachedFile = null;

    // === Inisialisasi Aplikasi ===
    loadSessionsFromStorage();
    renderSidebar();
    renderChat(currentChatId);

    // === Event Listeners ===
    menuIcon.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
    newChatBtn.addEventListener('click', startNewChat);
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileAttachment);
    chatForm.addEventListener('submit', handleFormSubmit);
    chatContainer.addEventListener('click', handleActionButtons);


    // === Fungsi Logika Utama ===

    function handleFormSubmit(e) {
        e.preventDefault();
        const prompt = chatInput.value.trim();
        if (!prompt && !attachedFile) return;

        if (welcomeScreen.style.display !== 'none') {
            welcomeScreen.style.display = 'none';
        }

        if (currentChatId === null) {
            createNewChatSession(prompt);
        }

        const userMessage = { role: "user", parts: [{ text: prompt }] };
        addMessageToSession(currentChatId, userMessage);
        
        displayUserMessage(prompt);
        chatInput.value = '';
        chatInput.placeholder = 'Tulis Pertanyaan...';
        
        displayTypingIndicator();
        fetchAiResponse();
    }
    
    async function fetchAiResponse(isRegenerating = false) {
        const currentSession = getSessionById(currentChatId);
        if (!currentSession) return;
    
        let historyForApi = currentSession.messages;
        let lastUserPrompt = '';
    
        if (isRegenerating) {
            // Hapus balasan AI terakhir
            historyForApi = historyForApi.slice(0, -1); 
            // Ambil prompt pengguna terakhir
            lastUserPrompt = historyForApi[historyForApi.length - 1]?.parts[0].text || '';
        } else {
            lastUserPrompt = historyForApi[historyForApi.length - 1]?.parts[0].text || '';
        }
    
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: lastUserPrompt,
                    history: historyForApi.slice(0, -1),
                    fileData: attachedFile ? attachedFile.data : null,
                    mimeType: attachedFile ? attachedFile.mimeType : null,
                })
            });
    
            if (!response.ok) throw new Error((await response.json()).error);
    
            const data = await response.json();
            const aiMessage = { role: "model", parts: [{ text: data.text }] };
    
            if (isRegenerating) {
                updateLastMessageInSession(currentChatId, aiMessage);
                // Hapus elemen pesan AI terakhir dari DOM dan render yang baru
                chatContainer.removeChild(chatContainer.lastChild); 
            } else {
                addMessageToSession(currentChatId, aiMessage);
            }
    
            removeTypingIndicator();
            displayAiMessage(data.text);
            saveSessionsToStorage();
    
        } catch (error) {
            console.error("Error fetching AI response:", error);
            removeTypingIndicator();
            displayAiMessage(`Maaf, terjadi kesalahan: ${error.message}`);
        } finally {
            attachedFile = null;
            fileInput.value = '';
        }
    }

    function handleActionButtons(e) {
        const copyBtn = e.target.closest('.copy-btn');
        const likeBtn = e.target.closest('.like-btn');
        const shareBtn = e.target.closest('.share-btn');
        const regenBtn = e.target.closest('.regen-btn');

        if (copyBtn) {
            const textToCopy = copyBtn.closest('.ai-message').dataset.rawText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.textContent = 'Disalin!';
                setTimeout(() => copyBtn.textContent = 'Salin', 2000);
            });
        }
        if (likeBtn) {
            likeBtn.classList.toggle('liked');
        }
        if (shareBtn) {
            const textToShare = shareBtn.closest('.ai-message').dataset.rawText;
            if(navigator.share) {
                navigator.share({ title: 'Respon dari Qwen', text: textToShare });
            } else {
                alert('Fitur bagikan tidak didukung di browser ini.');
            }
        }
        if (regenBtn) {
            removeTypingIndicator(); // Hapus indikator lama jika ada
            displayTypingIndicator();
            fetchAiResponse(true); // Panggil dengan flag regenerate
        }
    }

    // === Fungsi Render & UI ===

    function renderSidebar() {
        historyContainer.innerHTML = '';
        if (chatSessions.length > 0) {
            const title = document.createElement('h3');
            title.textContent = 'History';
            historyContainer.appendChild(title);
            
            const list = document.createElement('ul');
            list.className = 'history-list';

            chatSessions.forEach(session => {
                const item = document.createElement('li');
                item.className = 'history-item';
                item.dataset.id = session.id;
                if(session.id === currentChatId) {
                    item.classList.add('active');
                }

                item.innerHTML = `
                    <span>${session.title}</span>
                    <div class="menu-dots" data-id="${session.id}">...</div>
                    <div class="menu-options" data-id="${session.id}">
                        <button class="export-btn">Export</button>
                        <button class="delete-btn">Hapus</button>
                    </div>
                `;
                list.appendChild(item);
            });
            historyContainer.appendChild(list);

            // Add event listeners for history items
            list.querySelectorAll('.history-item span').forEach(span => {
                span.addEventListener('click', (e) => {
                    const id = e.target.parentElement.dataset.id;
                    currentChatId = id;
                    renderChat(id);
                    renderSidebar(); // Re-render to show active state
                    closeSidebar();
                });
            });

            // Add event listeners for menu dots
            list.querySelectorAll('.menu-dots').forEach(dots => {
                dots.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const menu = dots.nextElementSibling;
                    // Close other menus
                    document.querySelectorAll('.menu-options').forEach(m => {
                        if (m !== menu) m.style.display = 'none';
                    });
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                });
            });

            // Add event listeners for menu buttons
            list.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.parentElement.dataset.id;
                    deleteSession(id);
                });
            });
            list.querySelectorAll('.export-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.parentElement.dataset.id;
                    exportSession(id);
                });
            });
        }
    }

    function renderChat(id) {
        chatContainer.innerHTML = '';
        const session = getSessionById(id);
        if (session && session.messages.length > 0) {
            welcomeScreen.style.display = 'none';
            session.messages.forEach(msg => {
                if (msg.role === 'user') {
                    displayUserMessage(msg.parts[0].text);
                } else if (msg.role === 'model') {
                    displayAiMessage(msg.parts[0].text);
                }
            });
        } else {
            welcomeScreen.style.display = 'flex';
        }
        scrollToBottom();
    }

    // === Fungsi Helper & Manajemen Data ===

    function startNewChat() {
        currentChatId = null;
        renderChat(null);
        renderSidebar();
        closeSidebar();
    }

    function createNewChatSession(prompt) {
        currentChatId = `chat_${Date.now()}`;
        const newSession = {
            id: currentChatId,
            title: prompt.substring(0, 25) + (prompt.length > 25 ? '...' : ''),
            messages: [],
        };
        chatSessions.unshift(newSession); // Tambah ke awal array
        renderSidebar();
    }
    
    function addMessageToSession(id, message) {
        const session = getSessionById(id);
        if(session) session.messages.push(message);
    }

    function updateLastMessageInSession(id, newMessage) {
        const session = getSessionById(id);
        if(session && session.messages.length > 0) {
            session.messages[session.messages.length - 1] = newMessage;
        }
    }
    
    function deleteSession(id) {
        chatSessions = chatSessions.filter(s => s.id !== id);
        saveSessionsToStorage();
        if (currentChatId === id) {
            startNewChat();
        }
        renderSidebar();
    }

    function exportSession(id) {
        const session = getSessionById(id);
        if (!session) return;
        let content = `Riwayat Chat: ${session.title}\n\n`;
        session.messages.forEach(msg => {
            content += `${msg.role === 'user' ? 'Anda' : 'Qwen'}:\n${msg.parts[0].text}\n\n---\n\n`;
        });
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.title.replace(/\s+/g, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    function loadSessionsFromStorage() {
        const storedSessions = localStorage.getItem('chatSessions');
        chatSessions = storedSessions ? JSON.parse(storedSessions) : [];
    }

    function saveSessionsToStorage() {
        localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
    }
    
    function getSessionById(id) {
        return chatSessions.find(s => s.id === id);
    }
    
    // ... (Fungsi displayUserMessage, displayAiMessage, dll. yang sudah ada) ...
    // ... Pastikan fungsi displayAiMessage menggunakan data-raw-text ...
    function displayAiMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'ai-message';
        messageElement.dataset.rawText = text; // Simpan teks mentah untuk copy/share

        const formattedText = marked.parse(text);

        messageElement.innerHTML = `
            <div class="ai-header">
                <img src="logo.png" alt="Logo Kecil" class="logo-small">
                <span>Qwen 3.5</span>
            </div>
            <div class="ai-response-content">${formattedText}</div>
            <div class="action-buttons">
                <button class="share-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                    <span>Bagikan</span>
                </button>
                <button title="Regenerate" class="regen-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                </button>
                <button title="Suka" class="like-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"></path><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path></svg>
                </button>
                <button title="Salin" class="copy-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
            </div>
        `;
        chatContainer.appendChild(messageElement);
        scrollToBottom();
    }

    // === Fungsi utilitas lainnya (tidak berubah) ===
    function handleFileAttachment(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert("Ukuran file terlalu besar. Maksimal 5MB."); return; }
        const reader = new FileReader();
        reader.onload = (event) => {
            attachedFile = { data: event.target.result, mimeType: file.type };
            chatInput.placeholder = `File "${file.name}" dilampirkan.`;
        };
        reader.readAsDataURL(file);
    }
    
    function displayTypingIndicator() {
        const el = document.createElement('div');
        el.className = 'ai-message typing-indicator';
        el.id = 'typing-indicator';
        el.innerHTML = `<span></span><span></span><span></span>`;
        chatContainer.appendChild(el);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    function scrollToBottom() {
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    }
    
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
});```