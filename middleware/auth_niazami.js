const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      req.userId = null;
      req.isAuthenticated = false;
    } else {
      req.userId = null;
      req.isAuthenticated = false;
    }
    
    if (!req.userId) {
      req.sessionId = req.headers['x-session-id'] || generateSessionId();
    }
    
    next();
  } catch (error) {
    req.userId = null;
    req.isAuthenticated = false;
    next();
  }
};

const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }
  next();
};

module.exports = {
    optionalAuth,
    requireAuth
}