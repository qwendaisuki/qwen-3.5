document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Inisialisasi Lucide Icons
    lucide.createIcons();

    // 2. Animasi Teks Morph untuk Placeholder Input
    const chatInput = document.getElementById('chat-input');
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
    
    const randomChars = "abcdefghijklmnopqrstuvwxyz1234567890";
    let morphInterval;
    let originalText;

    function startMorphing(text) {
        let i = 0;
        originalText = text;
        clearInterval(morphInterval);
        morphInterval = setInterval(() => {
            let morphedText = '';
            for (let j = 0; j < originalText.length; j++) {
                if (j < i) {
                    morphedText += originalText[j];
                } else {
                    morphedText += randomChars[Math.floor(Math.random() * randomChars.length)];
                }
            }
            chatInput.placeholder = morphedText;
            
            if (i >= originalText.length) {
                clearInterval(morphInterval);
                chatInput.placeholder = originalText;
            }
            i += 1/3; // Kecepatan morphing
        }, 30);
    }
    
    function type() {
        const fullText = placeholders[currentPlaceholderIndex];
        
        if (isDeleting) {
            charIndex--;
        } else {
            charIndex++;
        }
        
        let displayText = fullText.substring(0, charIndex);
        chatInput.placeholder = displayText + "|";

        let typeSpeed = isDeleting ? 50 : 150;

        if (!isDeleting && charIndex === fullText.length) {
            // Jeda setelah selesai mengetik
            typeSpeed = 3000;
            isDeleting = true;
            // Panggil animasi morphing saat teks penuh
            startMorphing(fullText);

        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholders.length;
        }

        setTimeout(type, typeSpeed);
    }

    // Mulai animasi
    type();
});