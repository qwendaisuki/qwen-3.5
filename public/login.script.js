// Fungsi ini akan dipanggil secara OTOMATIS oleh library Google setelah login berhasil.
// Kita tidak perlu memanggilnya secara manual.
async function handleCredentialResponse(response) {
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Login verification failed.');
        }

        const userData = await res.json();
        localStorage.setItem('qwen-user', JSON.stringify(userData));
        window.location.href = '/index.html';

    } catch (error) {
        console.error('Error during login process:', error);
        alert('Gagal untuk login. Silakan coba lagi.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cek dulu apakah pengguna sudah login.
    if (localStorage.getItem('qwen-user')) {
        window.location.href = '/index.html';
        return; // Hentikan script jika sudah login.
    }

    // 2. Ambil Client ID dari server.
    fetch('/api/get-client-id')
        .then(res => {
            if (!res.ok) throw new Error('Could not fetch client ID from server');
            return res.json();
        })
        .then(data => {
            if (!data.clientId) throw new Error('Client ID is empty');

            // 3. Masukkan Client ID ke tag HTML tersembunyi.
            const gIdOnloadDiv = document.getElementById('g_id_onload');
            gIdOnloadDiv.setAttribute('data-client_id', data.clientId);
            
            // 4. Setelah Client ID siap, render tombol Google secara manual.
            // Ini memastikan tombol hanya muncul jika Client ID ada.
            window.google.accounts.id.renderButton(
                document.getElementById("google-btn-container"),
                { theme: "outline", size: "large", type: "standard", shape: "pill", text: "continue_with", logo_alignment: "left" }
            );
        })
        .catch(error => {
            // 5. Jika ada masalah, tampilkan error yang kita buat sendiri.
            console.error("Failed to initialize Google Login:", error);
            const googleBtnContainer = document.getElementById('google-btn-container');
            if (googleBtnContainer) {
                googleBtnContainer.innerHTML = "<p style='color: #ff5555; font-size: 0.8rem;'>Could not load Google Login.</p>";
            }
        });
});