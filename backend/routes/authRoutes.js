const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { database, serverValue } = require('../config/firebase');
const { requireAuth } = require('../middleware/authMiddleware');

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function createToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
}

function userIdFromEmail(email) {
    return crypto.createHash('sha256').update(email).digest('hex');
}

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };
}

router.post('/register', async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const userId = userIdFromEmail(email);
        const userRef = database.ref(`users/${userId}`);
        const existingSnapshot = await userRef.once('value');

        if (existingSnapshot.exists()) {
            return res.status(409).json({ message: 'Email is already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = {
            id: userId,
            name,
            email,
            password: hashedPassword,
            role: 'staff',
            createdAt: serverValue.TIMESTAMP,
            updatedAt: serverValue.TIMESTAMP
        };

        await userRef.set(user);

        const token = createToken({ id: user.id, role: user.role });

        return res.status(201).json({
            message: 'User registered successfully',
            token,
            user: publicUser(user)
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Registration failed' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);

        if (adminEmail && process.env.ADMIN_PASSWORD && email === adminEmail) {
            const isAdmin = password === process.env.ADMIN_PASSWORD;

            if (!isAdmin) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            return res.json({
                token: createToken({ id: 'admin', role: 'admin' }),
                user: {
                    id: 'admin',
                    name: process.env.ADMIN_NAME || 'Administrator',
                    email: adminEmail,
                    role: 'admin'
                }
            });
        }

        const userId = userIdFromEmail(email);
        const userSnapshot = await database.ref(`users/${userId}`).once('value');
        const user = userSnapshot.val();

        if (!user || !user.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        return res.json({
            token: createToken({ id: user.id, role: user.role }),
            user: publicUser(user)
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Login failed' });
    }
});

router.get('/me', requireAuth, async (req, res) => {
    if (req.user.role === 'admin') {
        return res.json({
            user: {
                id: 'admin',
                name: process.env.ADMIN_NAME || 'Administrator',
                email: normalizeEmail(process.env.ADMIN_EMAIL),
                role: 'admin'
            }
        });
    }

    const snapshot = await database.ref(`users/${req.user.id}`).once('value');
    const user = snapshot.val();

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
        user: publicUser(user)
    });
});

module.exports = router;
