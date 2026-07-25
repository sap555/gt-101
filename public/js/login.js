document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-btn');
    const toastMsg = document.getElementById('toast-msg');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const quickFillBtn = document.getElementById('quick-fill-btn');

    let mode = 'login'; // 'login' or 'register'

    // Tab Switching
    tabLogin.addEventListener('click', () => {
        mode = 'login';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        submitBtn.querySelector('span').textContent = 'Log In';
        hideToast();
    });

    tabRegister.addEventListener('click', () => {
        mode = 'register';
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        submitBtn.querySelector('span').textContent = 'Create Account';
        hideToast();
    });

    // Quick Fill Demo Credentials
    if (quickFillBtn) {
        quickFillBtn.addEventListener('click', () => {
            usernameInput.value = 'admin';
            passwordInput.value = 'password123';
            showToast('Auto-filled with demo credentials!', 'success');
        });
    }

    // Form Submission
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideToast();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showToast('Please enter both username and password.', 'error');
            return;
        }

        const endpoint = mode === 'login' ? '/api/login' : '/api/register';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            showToast(mode === 'login' ? 'Login successful! Redirecting...' : 'Account created! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 800);

        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    });

    function showToast(message, type = 'error') {
        toastMsg.textContent = message;
        toastMsg.className = `toast-msg ${type}`;
        toastMsg.style.display = 'block';
    }

    function hideToast() {
        toastMsg.style.display = 'none';
    }
});
