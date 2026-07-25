const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Simple JSON file DB path
const dbFile = path.join(__dirname, 'users.json');

// Initialize database with default admin user if not existing
function loadUsers() {
    if (!fs.existsSync(dbFile)) {
        const defaultPasswordHash = bcrypt.hashSync('password123', 10);
        const initialUsers = {
            admin: {
                username: 'admin',
                passwordHash: defaultPasswordHash,
                customBackground: null,
                overlayOpacity: 0.4,
                overlayBlur: 0
            }
        };
        fs.writeFileSync(dbFile, JSON.stringify(initialUsers, null, 2));
        return initialUsers;
    }
    try {
        const data = fs.readFileSync(dbFile, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

function saveUsers(users) {
    fs.writeFileSync(dbFile, JSON.stringify(users, null, 2));
}

let usersDB = loadUsers();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(session({
    secret: 'custom_dashboard_secret_key_987654321',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Configure Multer for PNG background uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'bg-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|webp|svg|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (PNG, JPG, WEBP, GIF, SVG) are allowed!'));
        }
    }
});

// Auth Guard Middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Unauthorized. Please login.' });
        }
        res.redirect('/index.html');
    }
}

// Redirect root to dashboard if logged in, else login page
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        res.redirect('/dashboard.html');
    } else {
        res.redirect('/index.html');
    }
});

// Guard dashboard.html endpoint specifically
app.get('/dashboard.html', (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/index.html');
    }
});

// Guard login page if already logged in
app.get('/index.html', (req, res, next) => {
    if (req.session && req.session.user) {
        res.redirect('/dashboard.html');
    } else {
        next();
    }
});

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// --- API ROUTES ---

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    usersDB = loadUsers();
    const user = usersDB[cleanUsername];

    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const match = bcrypt.compareSync(password, user.passwordHash);
    if (!match) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Set Session
    req.session.user = {
        username: user.username,
        customBackground: user.customBackground,
        overlayOpacity: user.overlayOpacity !== undefined ? user.overlayOpacity : 0.4,
        overlayBlur: user.overlayBlur !== undefined ? user.overlayBlur : 0
    };

    res.json({
        message: 'Login successful',
        user: {
            username: user.username,
            customBackground: user.customBackground,
            overlayOpacity: user.overlayOpacity,
            overlayBlur: user.overlayBlur
        }
    });
});

// Register Endpoint
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    usersDB = loadUsers();

    if (usersDB[cleanUsername]) {
        return res.status(400).json({ error: 'Username is already taken.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    usersDB[cleanUsername] = {
        username: cleanUsername,
        passwordHash: passwordHash,
        customBackground: null,
        overlayOpacity: 0.4,
        overlayBlur: 0
    };

    saveUsers(usersDB);

    // Auto login after register
    req.session.user = {
        username: cleanUsername,
        customBackground: null,
        overlayOpacity: 0.4,
        overlayBlur: 0
    };

    res.json({ message: 'Registration successful', username: cleanUsername });
});

// Logout Endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out.' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
});

// Get Current User Profile
app.get('/api/me', requireAuth, (req, res) => {
    usersDB = loadUsers();
    const user = usersDB[req.session.user.username] || req.session.user;
    res.json({
        username: user.username,
        customBackground: user.customBackground,
        overlayOpacity: user.overlayOpacity !== undefined ? user.overlayOpacity : 0.4,
        overlayBlur: user.overlayBlur !== undefined ? user.overlayBlur : 0
    });
});

// Upload PNG/JPG Background Endpoint
app.post('/api/upload-background', requireAuth, (req, res) => {
    upload.single('background')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded.' });
        }

        const bgUrl = `/uploads/${req.file.filename}`;
        const username = req.session.user.username;

        usersDB = loadUsers();
        if (usersDB[username]) {
            usersDB[username].customBackground = bgUrl;
            saveUsers(usersDB);
        }

        req.session.user.customBackground = bgUrl;

        res.json({
            message: 'Background uploaded successfully!',
            backgroundUrl: bgUrl
        });
    });
});

// Update Background Settings (Opacity & Blur)
app.post('/api/background-settings', requireAuth, (req, res) => {
    const { overlayOpacity, overlayBlur, customBackground } = req.body;
    const username = req.session.user.username;

    usersDB = loadUsers();
    if (usersDB[username]) {
        if (overlayOpacity !== undefined) usersDB[username].overlayOpacity = parseFloat(overlayOpacity);
        if (overlayBlur !== undefined) usersDB[username].overlayBlur = parseFloat(overlayBlur);
        if (customBackground !== undefined) usersDB[username].customBackground = customBackground;
        saveUsers(usersDB);
    }

    req.session.user.overlayOpacity = overlayOpacity;
    req.session.user.overlayBlur = overlayBlur;
    if (customBackground !== undefined) req.session.user.customBackground = customBackground;

    res.json({ message: 'Settings saved successfully' });
});

// Reset Background Endpoint
app.post('/api/reset-background', requireAuth, (req, res) => {
    const username = req.session.user.username;
    usersDB = loadUsers();
    if (usersDB[username]) {
        usersDB[username].customBackground = null;
        saveUsers(usersDB);
    }
    req.session.user.customBackground = null;
    res.json({ message: 'Background reset to default' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Default Credentials -> Username: admin | Password: password123`);
    console.log(`====================================================`);
});
