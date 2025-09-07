async function handleCredentialResponse(response) {
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
    if (localStorage.getItem('qwen-user')) {
        window.location.href = '/index.html';
    }

    fetch('/api/get-client-id')
        .then(res => {
            if (!res.ok) throw new Error('Could not fetch client ID');
            return res.json();
        })
        .then(data => {
            const googleDiv = document.getElementById('g_id_onload');
            if (googleDiv && data.clientId) {
                googleDiv.setAttribute('data-client_id', data.clientId);
            }
        })
        .catch(error => {
            console.error("Failed to set Google Client ID:", error);
            const googleBtnContainer = document.getElementById('google-btn-container');
            if(googleBtnContainer) {
                googleBtnContainer.innerHTML = "<p style='color: #ff5555; font-size: 0.8rem;'>Could not load Google Login.</p>";
            }
        });
});