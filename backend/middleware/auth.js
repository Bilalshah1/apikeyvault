const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing auth token' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: 'Server misconfigured: missing JWT_SECRET' });
    }

    const decoded = jwt.verify(token, secret);
    // Keep compatibility with req.user.uid used in routes
    req.user = { uid: decoded.sub || decoded.uid || decoded.id };
    return next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};


