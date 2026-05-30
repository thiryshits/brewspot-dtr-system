const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function getBearerToken(req) {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
        return null;
    }

    return header.slice(7).trim();
}

function safeEquals(a, b) {
    const first = Buffer.from(String(a || ''));
    const second = Buffer.from(String(b || ''));

    if (first.length !== second.length) {
        return false;
    }

    return crypto.timingSafeEqual(first, second);
}

function requireAuth(req, res, next) {
    const token = getBearerToken(req);

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

function requireAdmin(req, res, next) {
    return requireAuth(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        return next();
    });
}

function requireDeviceOrAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (process.env.ATTENDANCE_API_KEY && apiKey && safeEquals(apiKey, process.env.ATTENDANCE_API_KEY)) {
        req.device = { authenticated: true };
        return next();
    }

    return requireAuth(req, res, next);
}

module.exports = {
    requireAuth,
    requireAdmin,
    requireDeviceOrAuth
};
