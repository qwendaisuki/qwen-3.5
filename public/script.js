document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.input-form');
    const inputField = form.querySelector('input[type="text"]');

    form.addEventListener('submit', function(event) {
        event.preventDefault(); // Mencegah halaman reload saat form disubmit

        const userQuery = inputField.value;
        if (userQuery.trim() !== '') {
            console.log('Pertanyaan Pengguna:', userQuery);
            // Nanti di sini kita bisa tambahkan fungsi untuk memproses pertanyaan
            inputField.value = ''; // Kosongkan input setelah dikirim
        }
    });
});