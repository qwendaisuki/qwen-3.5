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
    const historyContainer = document.getElementById('history-container');
    const voiceBtn = document.getElementById('voice-btn');
    const sendBtn = document.getElementById('send-btn');
    const statusIndicator = document.getElementById('status-indicator');
    const attachmentPopup = document.getElementById('attachment-popup');
    const attachCameraBtn = document.getElementById('attach-camera-btn');
    const attachGalleryBtn = document.getElementById('attach-gallery-btn');
    const attachFilesBtn = document.getElementById('attach-files-btn');
    const fileInputCamera = document.getElementById('file-input-camera');
    const fileInputGallery = document.getElementById('file-input-gallery');
    const fileInputFiles = document.getElementById('file-input-files');
    const attachmentPreview = document.getElementById('attachment-preview');
    const removeAttachmentBtn = document.getElementById('remove-attachment-btn');

    // === State Aplikasi ===
    let chatSessions = [];
    let currentChatId = null;
    let attachedFile = null;
    let abortController = new AbortController();
    let isRecognizing = false;

    // === Inisialisasi Aplikasi ===
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
        recognition.onstart = () => { isRecognizing = true; voiceBtn.classList.add('listening'); };
        recognition.onresult = (event) => { chatInput.value = event.results[0][0].transcript; updateSendButtonState(); };
        recognition.onerror = (event) => { console.error('Speech recognition error:', event.error); };
        recognition.onend = () => { isRecognizing = false; voiceBtn.classList.remove('listening'); };
    }
    
    loadSessionsFromStorage();
    if (!currentChatId && chatSessions.length > 0) { currentChatId = chatSessions[0].id; }
    renderSidebar();
    renderChat(currentChatId);
    updateSendButtonState();

    // === Event Listeners ===
    menuIcon.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
    newChatBtn.addEventListener('click', startNewChat);
    chatForm.addEventListener('submit', handleFormSubmit);
    voiceBtn.addEventListener('click', toggleVoiceRecognition);
    sendBtn.addEventListener('click', handleSendOrStop);
    chatInput.addEventListener('input', updateSendButtonState);
    
    attachBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        attachmentPopup.classList.toggle('show');
    });

    document.body.addEventListener('click', (e) => {
        handleDynamicClicks(e);
        if (!e.target.closest('.add-btn')) {
            attachmentPopup.classList.remove('show');
        }
    });

    attachCameraBtn.addEventListener('click', () => fileInputCamera.click());
    attachGalleryBtn.addEventListener('click', () => fileInputGallery.click());
    attachFilesBtn.addEventListener('click', () => fileInputFiles.click());
    fileInputCamera.addEventListener('change', handleFileAttachment);
    fileInputGallery.addEventListener('change', handleFileAttachment);
    fileInputFiles.addEventListener('change', handleFileAttachment);
    removeAttachmentBtn.addEventListener('click', removeAttachment);

    async function handleFormSubmit(e) {
        e.preventDefault();
        const prompt = chatInput.value.trim();
        if (!prompt && !attachedFile) return;
        if (sendBtn.classList.contains('loading')) return;

        if (welcomeScreen.style.display !== 'none') { welcomeScreen.style.display = 'none'; }
        if (currentChatId === null) { createNewChatSession(prompt || attachedFile.name); }

        const userMessage = { role: "user", parts: [{ text: prompt, file: attachedFile }] };
        addMessageToSession(currentChatId, userMessage);
        
        displayUserMessage(prompt, attachedFile);
        chatInput.value = '';
        removeAttachment();
        
        await fetchAiResponse();
    }
    
    async function fetchAiResponse(isRegenerating = false) {
        const currentSession = getSessionById(currentChatId);
        if (!currentSession) return;

        let lastUserMessage, historyForApi;
        
        if (isRegenerating) {
            currentSession.messages.pop(); 
            lastUserMessage = currentSession.messages.findLast(m => m.role === 'user');
            historyForApi = currentSession.messages.slice(0, currentSession.messages.lastIndexOf(lastUserMessage));
            const aiMessages = chatContainer.querySelectorAll('.ai-message');
            if (aiMessages.length > 0) aiMessages[aiMessages.length - 1].remove();
        } else {
            lastUserMessage = currentSession.messages[currentSession.messages.length - 1];
            historyForApi = currentSession.messages.slice(0, -1);
        }

        if (!lastUserMessage) return;

        abortController = new AbortController();
        setLoadingState(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                signal: abortController.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: lastUserMessage.parts[0].text,
                    history: historyForApi,
                    fileData: lastUserMessage.parts[0].file ? lastUserMessage.parts[0].file.data : null,
                    mimeType: lastUserMessage.parts[0].file ? lastUserMessage.parts[0].file.mimeType : null,
                })
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Unknown error');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = "";
            let aiMessageElement = null;
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                
                for(let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i];
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.substring(6));
                        
                        if (data.type === 'tool_start') {
                            updateStatusIndicator('search', data.query);
                        } 
                        else if (data.type === 'text_chunk') {
                            if (!aiMessageElement) {
                                updateStatusIndicator('typing');
                                aiMessageElement = displayAiMessage("", true);
                            }
                            fullResponse += data.content;
                            aiMessageElement.querySelector('.ai-response-content').innerHTML = marked.parse(fullResponse);
                            scrollToBottom();
                        }
                    }
                }
                buffer = lines[lines.length - 1];
            }
            
            if (aiMessageElement) {
                const { cleanText, htmlWithSources } = extractAndRenderSources(fullResponse);
                aiMessageElement.dataset.rawText = cleanText;
                aiMessageElement.querySelector('.ai-response-content').innerHTML = htmlWithSources;
                aiMessageElement.querySelectorAll('pre code').forEach((block) => { hljs.highlightElement(block); });
            }
            
            const aiMessage = { role: "model", parts: [{ text: fullResponse }] };
            addMessageToSession(currentChatId, aiMessage);
            saveSessionsToStorage();

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error fetching AI response:", error);
                displayAiMessage(`Maaf, terjadi kesalahan: ${error.message}`);
            }
        } finally {
            setLoadingState(false);
        }
    }
    
    function handleDynamicClicks(e) {
        const historyItem = e.target.closest('.history-item');
        if (historyItem && !e.target.closest('.menu-dots')) {
            currentChatId = historyItem.dataset.id;
            renderChat(currentChatId);
            renderSidebar();
            closeSidebar();
        }
        
        const menuDots = e.target.closest('.menu-dots');
        if (menuDots) {
            e.stopPropagation();
            const menu = menuDots.nextElementSibling;
            const isVisible = menu.style.display === 'block';
            document.querySelectorAll('.menu-options').forEach(m => m.style.display = 'none');
            menu.style.display = isVisible ? 'none' : 'block';
        }
        
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) { deleteSession(deleteBtn.closest('.menu-options').dataset.id); }
        const exportBtn = e.target.closest('.export-btn');
        if (exportBtn) { exportSession(exportBtn.closest('.menu-options').dataset.id); }
        
        const copyBtn = e.target.closest('.copy-btn');
        if (copyBtn) {
            const textToCopy = copyBtn.closest('.ai-message').dataset.rawText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const icon = copyBtn.innerHTML;
                copyBtn.innerHTML = '<span>Disalin!</span>';
                setTimeout(() => copyBtn.innerHTML = icon, 2000);
            });
        }
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) { likeBtn.classList.toggle('liked'); }
        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
            const textToShare = shareBtn.closest('.ai-message').dataset.rawText;
            if(navigator.share) { navigator.share({ title: 'Respon dari Qwen', text: textToShare }); } 
            else { alert('Fitur bagikan tidak didukung.'); }
        }
        const regenBtn = e.target.closest('.regen-btn');
        if (regenBtn) { fetchAiResponse(true); }
        const speakBtn = e.target.closest('.speak-btn');
        if (speakBtn) {
            const textToSpeak = speakBtn.closest('.ai-message').dataset.rawText;
            speakText(textToSpeak);
        }
    }

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
                if (session.id === currentChatId) { item.classList.add('active'); }
                item.innerHTML = `
                    <span>${session.title}</span>
                    <div class="menu-dots" data-id="${session.id}">...</div>
                    <div class="menu-options" data-id="${session.id}">
                        <button class="export-btn">Export</button>
                        <button class="delete-btn">Hapus</button>
                    </div>`;
                list.appendChild(item);
            });
            historyContainer.appendChild(list);
        }
    }
    
    function renderChat(id) {
        chatContainer.innerHTML = '';
        const session = getSessionById(id);
        if (session && session.messages.length > 0) {
            welcomeScreen.style.display = 'none';
            session.messages.forEach(msg => {
                if (msg.role === 'user') { displayUserMessage(msg.parts[0].text, msg.parts[0].file); } 
                else if (msg.role === 'model') { displayAiMessage(msg.parts[0].text); }
            });
            chatContainer.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
        } else {
            welcomeScreen.style.display = 'flex';
        }
        scrollToBottom();
    }
    
    function displayUserMessage(text, file = null) {
        const el = document.createElement('div');
        el.className = 'user-message';
        
        let fileHtml = '';
        if (file) {
            fileHtml = `
                <div class="attachment-preview-in-chat">
                    <div class="file-info">
                        <span id="file-icon">${getFileIcon(file.mimeType)}</span>
                        <span class="file-name">${file.name}</span>
                    </div>
                </div>`;
        }
        el.innerHTML = fileHtml + `<span>${text}</span>`;
        chatContainer.appendChild(el);
        scrollToBottom();
    }
    
    function displayAiMessage(text, isStreaming = false) {
        const el = document.createElement('div');
        el.className = 'ai-message';
        const { cleanText, htmlWithSources } = extractAndRenderSources(text);
        if (!isStreaming) {
            el.dataset.rawText = cleanText;
        }
        el.innerHTML = `
            <div class="ai-header"><img src="logo.png" alt="Logo" class="logo-small"><span>Qwen 3.5</span></div>
            <div class="ai-response-content">${htmlWithSources}</div>
            <div class="action-buttons">
                <button class="share-btn" title="Bagikan"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg><span>Bagikan</span></button>
                <button title="Regenerate" class="regen-btn"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg></button>
                <button title="Suka" class="like-btn"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path data-like-fill="true" d="M7 10v12"></path><path data-like-fill="true" d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path></svg></button>
                <button title="Salin" class="copy-btn"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                <button title="Dengarkan" class="speak-btn"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg></button>
            </div>`;
        chatContainer.appendChild(el);
        scrollToBottom();
        return el;
    }
    
    function updateSendButtonState() {
        const hasText = chatInput.value.trim().length > 0;
        const hasContent = hasText || attachedFile;
        voiceBtn.style.display = hasContent ? 'none' : 'flex';
        sendBtn.style.display = hasContent ? 'flex' : 'none';
        
        if (!sendBtn.querySelector('svg')) {
             setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        sendBtn.innerHTML = '';
        statusIndicator.style.display = isLoading ? 'flex' : 'none';
        if (isLoading) {
            sendBtn.classList.add('loading');
            const stopIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            stopIcon.setAttribute('class', 'stop-icon');
            stopIcon.setAttribute('width', '16'); stopIcon.setAttribute('height', '16');
            stopIcon.setAttribute('viewBox', '0 0 24 24');
            stopIcon.innerHTML = `<rect x="3" y="3" width="18" height="18" fill="white"></rect>`;
            sendBtn.appendChild(stopIcon);
        } else {
            sendBtn.classList.remove('loading');
            const sendIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            sendIcon.setAttribute('class', 'send-icon');
            sendIcon.setAttribute('width', '20'); sendIcon.setAttribute('height', '20');
            sendIcon.setAttribute('viewBox', '0 0 24 24');
            sendIcon.innerHTML = `<line x1="12" y1="19" x2="12" y2="5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></line><polyline points="5 12 12 5 19 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>`;
            sendBtn.appendChild(sendIcon);
            updateSendButtonState();
        }
    }

    function updateStatusIndicator(type, query = '') {
        let content = '';
        if (type === 'search') {
            content = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 18v4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M22 12h-4"/><path d="m19.07 4.93-2.83 2.83"/></svg><span>Mencari: "${query}"</span>`;
        } else if (type === 'typing') {
            content = `<span>Qwen sedang mengetik</span><div class="dots"><span></span><span></span><span></span></div>`;
        }
        statusIndicator.innerHTML = content;
    }

    function extractAndRenderSources(text) {
        const sourceMatch = text.match(/Sumber:([\s\S]*)/i);
        if (!sourceMatch) { return { cleanText: text, htmlWithSources: marked.parse(text) }; }
        const cleanText = text.replace(sourceMatch[0], '').trim();
        const sourcesHtml = sourceMatch[1].trim().split('\n').filter(line => line.trim()).map(line => {
            const linkMatch = line.match(/\d+\.\s*\[(.*?)\]\((.*?)\)/);
            return linkMatch ? `<li><a href="${linkMatch[2]}" target="_blank" rel="noopener noreferrer">${linkMatch[1]}</a></li>` : '';
        }).join('');
        const fullHtml = `${marked.parse(cleanText)}<div class="sources-container"><h4>Sumber:</h4><ul class="sources-list">${sourcesHtml}</ul></div>`;
        return { cleanText, htmlWithSources: fullHtml };
    }

    function handleFileAttachment(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert("Ukuran file terlalu besar. Maksimal 5MB."); return; }
        const reader = new FileReader();
        reader.onload = (event) => {
            attachedFile = {
                data: event.target.result,
                mimeType: file.type,
                name: file.name
            };
            showAttachmentPreview(file.name, file.type);
            updateSendButtonState();
        };
        reader.readAsDataURL(file);
    }

    function showAttachmentPreview(name, type) {
        document.getElementById('file-icon').innerHTML = getFileIcon(type);
        document.getElementById('file-name').textContent = name;
        attachmentPreview.style.display = 'flex';
    }

    function removeAttachment() {
        attachedFile = null;
        attachmentPreview.style.display = 'none';
        fileInputCamera.value = '';
        fileInputGallery.value = '';
        fileInputFiles.value = '';
        updateSendButtonState();
    }

    function getFileIcon(type) {
        if (type.startsWith('image/')) return '🖼️';
        if (type.startsWith('video/')) return '🎬';
        if (type.startsWith('audio/')) return '🎵';
        if (type === 'application/pdf') return '📄';
        return '📎'; // Generic file
    }

    function startNewChat() { currentChatId = null; renderChat(null); renderSidebar(); closeSidebar(); }
    function createNewChatSession(prompt) {
        currentChatId = `chat_${Date.now()}`;
        const newSession = { id: currentChatId, title: prompt.substring(0, 25) + (prompt.length > 25 ? '...' : ''), messages: [] };
        chatSessions.unshift(newSession);
        renderSidebar();
    }
    function addMessageToSession(id, message) { getSessionById(id)?.messages.push(message); }
    function deleteSession(id) {
        chatSessions = chatSessions.filter(s => s.id !== id);
        saveSessionsToStorage();
        if (currentChatId === id) { startNewChat(); }
        renderSidebar();
    }
    function exportSession(id) {
        const session = getSessionById(id);
        if (!session) return;
        let content = `Riwayat Chat: ${session.title}\n\n`;
        session.messages.forEach(msg => { content += `${msg.role === 'user' ? 'Anda' : 'Qwen'}:\n${msg.parts[0].text}\n\n---\n\n`; });
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${session.title.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    function loadSessionsFromStorage() { chatSessions = JSON.parse(localStorage.getItem('chatSessions')) || []; }
    function saveSessionsToStorage() { localStorage.setItem('chatSessions', JSON.stringify(chatSessions)); }
    function getSessionById(id) { return chatSessions.find(s => s.id === id); }
    function scrollToBottom() { chatArea.scrollTop = chatArea.scrollHeight; }
    function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('active'); }
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }
    function toggleVoiceRecognition() {
        if (!SpeechRecognition) { alert('Maaf, browser Anda tidak mendukung fitur suara.'); return; }
        if (isRecognizing) { recognition.stop(); } 
        else { recognition.start(); }
    }
    function speakText(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'id-ID';
            window.speechSynthesis.speak(utterance);
        } else { alert('Maaf, browser Anda tidak mendukung fitur Text-to-Speech.'); }
    }
});