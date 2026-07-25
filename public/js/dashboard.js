document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const bgContainer = document.getElementById('bg-container');
    const bgOverlay = document.getElementById('bg-overlay');
    const usernameDisplay = document.getElementById('username-display');
    const userAvatar = document.getElementById('user-avatar');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Clock & Date Elements
    const clockDisplay = document.getElementById('clock-display');
    const clockAmpm = document.getElementById('clock-ampm');
    const dateText = document.getElementById('date-text');
    const greetingText = document.getElementById('greeting-text');
    const fmt12Btn = document.getElementById('fmt-12');
    const fmt24Btn = document.getElementById('fmt-24');

    // Customizer Modal Elements
    const openCustomizerBtn = document.getElementById('open-customizer-btn');
    const customizerModal = document.getElementById('customizer-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const uploadDropzone = document.getElementById('upload-dropzone');
    const bgFileInput = document.getElementById('bg-file-input');
    const presetCards = document.querySelectorAll('.preset-card');
    const opacitySlider = document.getElementById('opacity-slider');
    const blurSlider = document.getElementById('blur-slider');
    const opacityVal = document.getElementById('opacity-val');
    const blurVal = document.getElementById('blur-val');
    const resetBgBtn = document.getElementById('reset-bg-btn');
    const doneBgBtn = document.getElementById('done-bg-btn');

    let is24HourMode = false;
    let currentUser = null;

    // 1. Authenticate & Fetch Profile
    try {
        const res = await fetch('/api/me');
        if (!res.ok) {
            window.location.href = '/index.html';
            return;
        }
        currentUser = await res.json();
        
        // Update user badge
        usernameDisplay.textContent = currentUser.username;
        userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();

        // Apply saved custom background & overlay preferences
        if (currentUser.customBackground) {
            applyBackground(currentUser.customBackground);
        }
        if (currentUser.overlayOpacity !== undefined) {
            opacitySlider.value = Math.round(currentUser.overlayOpacity * 100);
            updateOverlayOpacity(currentUser.overlayOpacity);
        }
        if (currentUser.overlayBlur !== undefined) {
            blurSlider.value = currentUser.overlayBlur;
            updateOverlayBlur(currentUser.overlayBlur);
        }

    } catch (e) {
        window.location.href = '/index.html';
        return;
    }

    // 2. Real-Time Centered Clock & Date Logic
    function updateClockAndDate() {
        const now = new Date();

        // Hours, Minutes, Seconds
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        // Greeting
        let greeting = 'Good evening';
        if (hours < 12) greeting = 'Good morning';
        else if (hours < 18) greeting = 'Good afternoon';

        if (currentUser && currentUser.username) {
            greetingText.textContent = `${greeting}, ${currentUser.username}!`;
        } else {
            greetingText.textContent = `${greeting}!`;
        }

        // Time Formatting
        let ampm = '';
        if (!is24HourMode) {
            ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            clockAmpm.style.display = 'inline';
            clockAmpm.textContent = ampm;
        } else {
            clockAmpm.style.display = 'none';
        }
        
        const hoursStr = String(hours).padStart(2, '0');
        clockDisplay.childNodes[0].nodeValue = `${hoursStr}:${minutes}:${seconds} `;

        // Centered Date Formatting
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateText.textContent = now.toLocaleDateString(undefined, options);
    }

    // Start clock tick
    updateClockAndDate();
    setInterval(updateClockAndDate, 1000);

    // 12H / 24H Toggle
    fmt12Btn.addEventListener('click', () => {
        is24HourMode = false;
        fmt12Btn.classList.add('active');
        fmt24Btn.classList.remove('active');
        updateClockAndDate();
    });

    fmt24Btn.addEventListener('click', () => {
        is24HourMode = true;
        fmt24Btn.classList.add('active');
        fmt12Btn.classList.remove('active');
        updateClockAndDate();
    });

    // 3. Top-Right Logout Button Logic
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch (e) {
            console.error('Logout error:', e);
        }
        window.location.href = '/index.html';
    });

    // 4. Customizer Modal Open & Close Controls
    openCustomizerBtn.addEventListener('click', () => {
        customizerModal.classList.add('active');
    });

    closeModalBtn.addEventListener('click', () => {
        customizerModal.classList.remove('active');
    });

    doneBgBtn.addEventListener('click', () => {
        customizerModal.classList.remove('active');
    });

    customizerModal.addEventListener('click', (e) => {
        if (e.target === customizerModal) {
            customizerModal.classList.remove('active');
        }
    });

    // 5. Custom PNG Upload via Dropzone / Input
    uploadDropzone.addEventListener('click', () => bgFileInput.click());

    uploadDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadDropzone.classList.add('dragover');
    });

    uploadDropzone.addEventListener('dragleave', () => {
        uploadDropzone.classList.remove('dragover');
    });

    uploadDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    bgFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    });

    async function handleFileUpload(file) {
        if (!file.type.match('image.*')) {
            alert('Please select a valid image file (PNG, JPG, WEBP).');
            return;
        }

        const formData = new FormData();
        formData.append('background', file);

        // Visual feedback during upload
        const dropzoneText = uploadDropzone.querySelector('p');
        const originalText = dropzoneText.textContent;
        dropzoneText.textContent = 'Uploading PNG background...';

        try {
            const res = await fetch('/api/upload-background', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            // Apply newly uploaded background immediately
            applyBackground(data.backgroundUrl);
            dropzoneText.textContent = 'Uploaded successfully!';
            setTimeout(() => { dropzoneText.textContent = originalText; }, 2000);

            // Deactivate preset card highlight
            presetCards.forEach(card => card.classList.remove('active'));

        } catch (err) {
            alert('Background upload failed: ' + err.message);
            dropzoneText.textContent = originalText;
        }
    }

    // Preset Selection
    presetCards.forEach(card => {
        card.addEventListener('click', () => {
            presetCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const bgValue = card.dataset.bg;
            applyBackground(bgValue);
            saveSettings({ customBackground: bgValue });
        });
    });

    // Readability Overlay Sliders
    opacitySlider.addEventListener('input', (e) => {
        const val = e.target.value / 100;
        opacityVal.textContent = `${e.target.value}%`;
        updateOverlayOpacity(val);
        saveSettings({ overlayOpacity: val });
    });

    blurSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        blurVal.textContent = `${val}px`;
        updateOverlayBlur(val);
        saveSettings({ overlayBlur: val });
    });

    // Reset Background
    resetBgBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/reset-background', { method: 'POST' });
            applyBackground('radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 70%)');
            presetCards.forEach((c, idx) => {
                if (idx === 0) c.classList.add('active');
                else c.classList.remove('active');
            });
            opacitySlider.value = 40;
            blurSlider.value = 0;
            updateOverlayOpacity(0.4);
            updateOverlayBlur(0);
        } catch (e) {
            console.error('Reset error:', e);
        }
    });

    // Helper functions
    function applyBackground(bg) {
        if (bg.startsWith('/') || bg.startsWith('http')) {
            bgContainer.style.backgroundImage = `url('${bg}')`;
        } else {
            bgContainer.style.backgroundImage = bg;
        }
    }

    function updateOverlayOpacity(val) {
        bgOverlay.style.backgroundColor = `rgba(15, 23, 42, ${val})`;
    }

    function updateOverlayBlur(val) {
        bgOverlay.style.backdropFilter = `blur(${val}px)`;
        bgOverlay.style.webkitBackdropFilter = `blur(${val}px)`;
    }

    let saveTimeout;
    function saveSettings(obj) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            try {
                await fetch('/api/background-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(obj)
                });
            } catch (e) {
                console.error('Failed to save settings:', e);
            }
        }, 400);
    }
});
