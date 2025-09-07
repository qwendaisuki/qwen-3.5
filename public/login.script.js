// Fungsi ini akan dipanggil secara OTOMATIS oleh library Google setelah login berhasil.
async function handleCredentialResponse(response) {
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential }),
        });
        if (!res.ok) throw new Error('Login verification failed.');
        const userData = await res.json();
        localStorage.setItem('qwen-user', JSON.stringify(userData));
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Error during login process:', error);
        alert('Gagal untuk login. Silakan coba lagi.');
    }
}

// Fungsi ini AKAN DIPANGGIL OLEH HTML setelah script Google siap.
// Ini adalah cara paling aman untuk memastikan 'google' sudah ada.
function onGoogleLibraryLoad() {
    fetch('/api/get-client-id')
        .then(res => {
            if (!res.ok) throw new Error('Could not fetch client ID from server');
            return res.json();
        })
        .then(data => {
            if (!data.clientId) throw new Error('Client ID is empty');

            // 1. Inisialisasi Google Accounts dengan Client ID yang sudah didapat.
            google.accounts.id.initialize({
                client_id: data.clientId,
                callback: handleCredentialResponse
            });

            // 2. Render tombol Google di wadah yang sudah disiapkan.
            google.accounts.id.renderButton(
                document.getElementById("google-btn-container"),
                { theme: "outline", size: "large", type: "standard", shape: "pill", text: "continue_with", logo_alignment: "left" }
            );
        })
        .catch(error => {
            // 3. Jika ada masalah di tahap manapun, tampilkan error.
            console.error("Failed to initialize Google Login:", error);
            const googleBtnContainer = document.getElementById('google-btn-container');
            if (googleBtnContainer) {
                googleBtnContainer.innerHTML = "<p style='color: #ff5555; font-size: 0.8rem;'>Could not load Google Login.</p>";
            }
        });
}

// Cek status login saat halaman pertama kali dibuka.
if (localStorage.getItem('qwen-user')) {
    window.location.href = '/index.html';
}