// Menunggu hingga seluruh konten halaman (HTML) dimuat sebelum menjalankan skrip
document.addEventListener('DOMContentLoaded', () => {

    // --- Referensi Elemen-elemen DOM ---
    const chatInput = document.getElementById('chat-input');
    const voiceBtn = document.getElementById('voice-btn');
    const sendBtn = document.getElementById('send-btn');
    const attachBtn = document.getElementById('attach-btn');
    const attachmentPopup = document.getElementById('attachment-popup');
    const attachmentPreview = document.getElementById('attachment-preview');
    const fileNameSpan = document.getElementById('file-name');
    const removeAttachmentBtn = document.getElementById('remove-attachment-btn');
    const historyContainer = document.getElementById('history-container');
    
    // Semua input file
    const fileInputs = {
        gallery: document.getElementById('file-input-gallery'),
        camera: document.getElementById('file-input-camera'),
        files: document.getElementById('file-input-files')
    };

    // --- Inisialisasi Tampilan Awal ---
    
    // Mengganti ikon send default dengan SVG (karena di HTML kosong) dan menyembunyikannya
    sendBtn.innerHTML = `
        <svg class="send-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        <svg class="stop-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>`;
    sendBtn.style.display = 'none'; // Sembunyikan tombol send pada awalnya

    // --- PERBAIKAN BUG #1: Tombol Voice/Send Otomatis Berubah ---
    chatInput.addEventListener('input', () => {
        const hasText = chatInput.value.trim() !== '';
        voiceBtn.style.display = hasText ? 'none' : 'flex';
        sendBtn.style.display = hasText ? 'flex' : 'none';
    });

    // --- PERBAIKAN BUG #2: Tombol Plus (+) Attachment ---
    attachBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Mencegah klik menyebar ke window/document
        attachmentPopup.classList.toggle('show');
    });

    // Sembunyikan popup jika pengguna mengklik di luar area popup
    document.addEventListener('click', (event) => {
        if (!attachmentPopup.contains(event.target) && !attachBtn.contains(event.target)) {
            attachmentPopup.classList.remove('show');
        }
    });

    // --- PERBAIKAN BUG #3: Fungsi Attach File ---
    // Memicu input file yang sesuai saat tombol di dalam popup diklik
    document.getElementById('attach-gallery-btn').addEventListener('click', () => fileInputs.gallery.click());
    document.getElementById('attach-camera-btn').addEventListener('click', () => fileInputs.camera.click());
    document.getElementById('attach-files-btn').addEventListener('click', () => fileInputs.files.click());

    // Fungsi tunggal untuk menangani perubahan pada SEMUA input file
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            attachmentPreview.style.display = 'flex';
            attachmentPopup.classList.remove('show'); // Tutup popup setelah file dipilih
        }
    };
    
    // Terapkan fungsi handleFileChange ke setiap input file
    Object.values(fileInputs).forEach(input => {
        input.addEventListener('change', handleFileChange);
    });

    // Fungsi untuk menghapus file yang sudah di-attach
    removeAttachmentBtn.addEventListener('click', () => {
        // Reset semua input file
        Object.values(fileInputs).forEach(input => {
            input.value = ''; 
        });
        attachmentPreview.style.display = 'none';
        fileNameSpan.textContent = '';
    });

    // --- PERBAIKAN BUG #4: Menu Titik Tiga di Sidebar ---
    // Menggunakan event delegation untuk menangani klik pada item history yang dinamis
    historyContainer.addEventListener('click', (event) => {
        const menuDots = event.target.closest('.menu-dots');
        if (!menuDots) return; // Abaikan jika bukan menu-dots yang diklik

        const menuOptions = menuDots.nextElementSibling;
        
        // Tutup semua menu lain sebelum membuka yang baru
        document.querySelectorAll('.menu-options').forEach(menu => {
            if (menu !== menuOptions) {
                menu.style.display = 'none';
            }
        });
        
        // Toggle (tampilkan/sembunyikan) menu yang relevan
        if (menuOptions && menuOptions.classList.contains('menu-options')) {
            menuOptions.style.display = menuOptions.style.display === 'block' ? 'none' : 'block';
        }
    });

    // --- FUNGSI DEMO: Menambahkan Item ke History ---
    // Ini hanya untuk tujuan demonstrasi agar menu titik tiga bisa diuji.
    function addHistoryItem(title) {
        const historyList = historyContainer.querySelector('.history-list') || document.createElement('ul');
        if (!historyContainer.querySelector('.history-list')) {
            historyList.className = 'history-list';
            historyContainer.innerHTML = '<h3>Today</h3>'; // Judul grup
            historyContainer.appendChild(historyList);
        }

        const item = document.createElement('li');
        item.className = 'history-item';
        // HTML untuk setiap item, termasuk menu opsinya
        item.innerHTML = `
            <span>${title}</span>
            <svg class="menu-dots" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            <div class="menu-options">
                <button class="export-btn">Export Chat</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        historyList.appendChild(item);
        
        // Tambahkan event listener spesifik untuk tombol di dalam menu ini
        item.querySelector('.delete-btn').addEventListener('click', () => {
            alert(`Chat "${title}" telah dihapus!`); // Aksi placeholder
            item.remove(); // Hapus item dari tampilan
        });
        item.querySelector('.export-btn').addEventListener('click', () => {
            alert(`Mengekspor chat "${title}"...`); // Aksi placeholder
        });
    }
    
    // Contoh menambahkan beberapa item ke history untuk tes
    addHistoryItem("Perbaikan Bug & UX Qwen");
    addHistoryItem("Rencana Fitur Selanjutnya");
    addHistoryItem("Analisis Kompetitor");

});