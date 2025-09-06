// Menunggu hingga seluruh konten halaman (HTML) dimuat sebelum menjalankan skrip
document.addEventListener('DOMContentLoaded', () => {

    // --- Referensi Elemen DOM ---
    const chatInput = document.getElementById('chat-input');
    const voiceBtn = document.getElementById('voice-btn');
    const sendBtn = document.getElementById('send-btn');
    const attachBtn = document.getElementById('attach-btn');
    const attachmentPopup = document.getElementById('attachment-popup');
    const fileInputGallery = document.getElementById('file-input-gallery');
    const attachmentPreview = document.getElementById('attachment-preview');
    const fileNameSpan = document.getElementById('file-name');
    const removeAttachmentBtn = document.getElementById('remove-attachment-btn');

    // Mengganti ikon send default dengan SVG (karena di HTML kosong)
    sendBtn.innerHTML = `
        <svg class="send-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        <svg class="stop-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>`;

    // --- PERBAIKAN BUG #1: Tombol Voice/Send Otomatis Berubah ---
    // Logika untuk menukar tombol voice dengan tombol send saat mengetik
    chatInput.addEventListener('input', () => {
        if (chatInput.value.trim() !== '') {
            voiceBtn.style.display = 'none'; // Sembunyikan tombol voice
            sendBtn.style.display = 'flex';  // Tampilkan tombol send
        } else {
            voiceBtn.style.display = 'none';   // Sembunyikan tombol send
            voiceBtn.style.display = 'flex';    // Tampilkan kembali tombol voice
        }
    });

    // --- PERBAIKAN BUG #2: Tombol Plus (+) Attachment ---
    // Logika untuk menampilkan popup pilihan file saat tombol '+' diklik
    attachBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Mencegah event 'click' menyebar ke document
        attachmentPopup.classList.toggle('show');
    });

    // Sembunyikan popup jika pengguna mengklik di luar area popup
    document.addEventListener('click', () => {
        if (attachmentPopup.classList.contains('show')) {
            attachmentPopup.classList.remove('show');
        }
    });

    // --- PERBAIKAN BUG #3: Fungsi Attach File ---
    // Memicu input file saat tombol di dalam popup diklik
    document.getElementById('attach-gallery-btn').addEventListener('click', () => fileInputGallery.click());
    document.getElementById('attach-camera-btn').addEventListener('click', () => document.getElementById('file-input-camera').click());
    document.getElementById('attach-files-btn').addEventListener('click', () => document.getElementById('file-input-files').click());


    // Menampilkan preview file yang dipilih
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            attachmentPreview.style.display = 'flex';
            attachmentPopup.classList.remove('show'); // Tutup popup setelah file dipilih
        }
    };
    
    document.getElementById('file-input-gallery').addEventListener('change', handleFileChange);
    document.getElementById('file-input-camera').addEventListener('change', handleFileChange);
    document.getElementById('file-input-files').addEventListener('change', handleFileChange);


    // Menghapus file yang sudah di-attach
    removeAttachmentBtn.addEventListener('click', () => {
        document.getElementById('file-input-gallery').value = '';
        document.getElementById('file-input-camera').value = '';
        document.getElementById('file-input-files').value = '';
        attachmentPreview.style.display = 'none';
        fileNameSpan.textContent = '';
    });


    // --- PERBAIKAN BUG #4: Menu Titik Tiga di Sidebar ---
    // Menggunakan event delegation untuk menangani klik pada item history
    const historyContainer = document.getElementById('history-container');

    historyContainer.addEventListener('click', (event) => {
        const menuDots = event.target.closest('.menu-dots');
        if (!menuDots) return; // Abaikan jika bukan menu-dots yang diklik

        const menuOptions = menuDots.nextElementSibling;
        if (menuOptions && menuOptions.classList.contains('menu-options')) {
            // Tutup semua menu lain sebelum membuka yang ini
            document.querySelectorAll('.menu-options').forEach(menu => {
                if (menu !== menuOptions) {
                    menu.style.display = 'none';
                }
            });
            // Toggle (tampilkan/sembunyikan) menu yang relevan
            menuOptions.style.display = menuOptions.style.display === 'block' ? 'none' : 'block';
        }
    });

    // Fungsi untuk menambahkan item history (untuk demonstrasi)
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
                <button class="export-btn">Export Chat</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        historyList.appendChild(item);
        
        // Tambahkan fungsi untuk tombol di dalam menu
        item.querySelector('.delete-btn').addEventListener('click', () => {
            alert(`Chat "${title}" dihapus!`);
            item.remove();
        });
        item.querySelector('.export-btn').addEventListener('click', () => {
            alert(`Mengekspor chat "${title}"...`);
        });
    }
    
    // Contoh menambahkan item ke history untuk tes
    addHistoryItem("Percakapan Pertama");
    addHistoryItem("Ide Proyek Qwen");

});