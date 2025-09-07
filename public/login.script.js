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

function initializeGoogleLogin() {
    try {
        // =======================================================
        // PENTING: Membaca Client ID langsung dari meta tag HTML
        // =======================================================
        const clientId = document.querySelector('meta[name="google-client-id"]').getAttribute('content');

        if (!clientId || clientId.includes("YOUR_GOOGLE_CLIENT_ID")) {
            throw new Error('Google Client ID belum diatur di login.html');
        }

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse
        });

        window.google.accounts.id.renderButton(
            document.getElementById("google-btn-container"),
            { theme: "outline", size: "large", type: "standard", shape: "pill", text: "continue_with", logo_alignment: "left" }
        );

    } catch (error) {
        console.error("Gagal menginisialisasi Google Login:", error);
        const googleBtnContainer = document.getElementById('google-btn-container');
        if (googleBtnContainer) {
            googleBtnContainer.innerHTML = "<p style='color: #ff5555; font-size: 0.8rem;'>Tidak dapat memuat Google Login.</p>";
        }
    }
}

window.onload = function () {
    if (localStorage.getItem('qwen-user')) {
        window.location.href = '/index.html';
        return;
    }
    initializeGoogleLogin();
};