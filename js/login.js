const form = document.getElementById('loginForm');
const submitButton = form.querySelector('button[type="submit"]');

const showMessage = (text, isError = true) => {
    let messageEl = document.getElementById('loginMessage');

    if (!messageEl) {
        messageEl = document.createElement('p');
        messageEl.id = 'loginMessage';
        form.appendChild(messageEl);
    }

    messageEl.textContent = text;
    messageEl.style.color = isError ? '#c0392b' : '#1b7f3a';
};

form.addEventListener('submit', async (e) => {

    e.preventDefault();

    submitButton.disabled = true;
    showMessage('Logging in...', false);

    const formData = new FormData(form);

    try {
        const response = await fetch('/php/login.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            const redirectTo = result.redirect || '/index.html';
            window.location.href = redirectTo;
            return;
        }

        showMessage(result.message || 'Login failed. Please try again.');
    } catch (error) {
        showMessage('Network error. Please try again.');
    } finally {
        submitButton.disabled = false;
    }
});