document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    const converter = new showdown.Converter();

    const chatForm = document.getElementById('chat-form'), chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container'), initialView = document.getElementById('initial-view');
    const mainContent = document.querySelector(".main-content");
    const uploadBtn = document.getElementById('upload-btn'), uploadModal = document.getElementById('upload-modal');
    const openCameraBtn = document.getElementById('open-camera'), openGalleryBtn = document.getElementById('open-gallery'), openFilesBtn = document.getElementById('open-files');
    const cameraInput = document.getElementById('camera-input'), galleryInput = document.getElementById('gallery-input'), fileInput = document.getElementById('file-input');
    const filePreviewContainer = document.getElementById('file-preview-container');

    let chatHistory = [];
    let attachedFile = null;

    uploadBtn.addEventListener('click', () => {
        uploadModal.classList.toggle('show');
        uploadBtn.classList.toggle('active');
    });

    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            uploadModal.classList.remove('show');
            uploadBtn.classList.remove('active');
        }
    });

    openCameraBtn.addEventListener('click', () => cameraInput.click());
    openGalleryBtn.addEventListener('click', () => galleryInput.click());
    openFilesBtn.addEventListener('click', () => fileInput.click());

    cameraInput.addEventListener('change', handleFileSelect);
    galleryInput.addEventListener('change', handleFileSelect);
    fileInput.addEventListener('change', handleFileSelect);

    chatForm.addEventListener('submit', handleFormSubmit);

    async function handleFormSubmit(event) {
        event.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput && !attachedFile) return;

        if (initialView?.style.display !== 'none') initialView.style.display = 'none';

        displayUserMessage(userInput || `Menganalisis file: ${attachedFile.name}`);
        showLoadingIndicator(false);

        try {
            const payload = { prompt: userInput, history: chatHistory };
            if (attachedFile) {
                payload.file = {
                    mimeType: attachedFile.mimeType,
                    data: attachedFile.data
                };
            }
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Unknown error');
            
            const data = await response.json();
            removeLoadingIndicator();
            displayAiMessage(data.reply);

        } catch (error) {
            removeLoadingIndicator();
            displayAiMessage(`**Maaf, terjadi kesalahan:**\n\n\`\`\`\n${error.message}\n\`\`\`\n\nCoba lagi nanti.`);
        } finally {
            chatInput.value = '';
            clearAttachedFile();
        }
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            attachedFile = {
                name: file.name,
                mimeType: file.type,
                data: reader.result.split(',')[1]
            };
            showFilePreview();
        };
        reader.readAsDataURL(file);

        uploadModal.classList.remove('show');
        uploadBtn.classList.remove('active');
        event.target.value = null;
    }
    
    function showFilePreview() {
        if (!attachedFile) return;
        filePreviewContainer.innerHTML = `
            <div class="file-preview">
                <span>${attachedFile.name}</span>
                <button id="remove-file-btn" type="button"><i data-lucide="x"></i></button>
            </div>
        `;
        lucide.createIcons();
        document.getElementById('remove-file-btn').addEventListener('click', clearAttachedFile);
    }

    function clearAttachedFile() {
        attachedFile = null;
        filePreviewContainer.innerHTML = '';
    }

    function displayUserMessage(message) {
        chatHistory.push({ role: 'user', parts: [{ text: message }] });
        const el = document.createElement('div');
        el.className = 'chat-message user-message';
        el.textContent = message;
        chatContainer.appendChild(el);
        scrollToBottom();
    }

    function displayAiMessage(message) {
        chatHistory.push({ role: 'model', parts: [{ text: message }] });
        const el = document.createElement('div');
        el.className = 'chat-message ai-message fade-in';
        const html = converter.makeHtml(message);
        el.innerHTML = `<div class="ai-header"><img src="/qwen-logo.png" alt="Qwen Logo"><span>Qwen</span></div><div class="message-content">${html}</div>`;
        chatContainer.appendChild(el);
        scrollToBottom();
    }

    function showLoadingIndicator(isSearching) {
        const text = isSearching ? "mencari..." : "thinking...";
        const el = document.createElement('div');
        el.id = 'loading-indicator';
        el.className = 'chat-message ai-message';
        el.innerHTML = `<div class="thinking-indicator"><div class="bouncing-dots"><div class="dot dot-1"></div><div class="dot dot-2"></div><div class="dot dot-3"></div></div><div class="thinking-text">${text}</div></div>`;
        chatContainer.appendChild(el);
        scrollToBottom();
    }

    function removeLoadingIndicator() {
        const el = document.getElementById('loading-indicator');
        if (el) el.remove();
    }

    function scrollToBottom() {
        setTimeout(() => { mainContent.scrollTop = mainContent.scrollHeight; }, 0);
    }

    const placeholders = ["Tulis pesan atau lampirkan file..."];
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