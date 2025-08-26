const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

/**
 * Security Middleware Configuration
 */

/**
 * Rate limiting configuration
 */
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      status: 'error',
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: false,
    // Skip failed requests
    skipFailedRequests: false
  });
};

/**
 * General API rate limit
 */
const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

/**
 * Strict rate limit for auth endpoints
 */
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 requests per windowMs
  'Too many authentication attempts from this IP, please try again later.'
);

/**
 * Rate limit for phone registration
 */
const phoneRegisterLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  5, // limit each IP to 5 phone registrations per hour
  'Too many phone registration attempts from this IP, please try again later.'
);

/**
 * Rate limit for profile creation
 */
const profileCreationLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // limit each IP to 3 profile creations per hour
  'Too many profile creation attempts from this IP, please try again later.'
);

/**
 * Rate limit for search endpoints
 */
const searchLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  50, // limit each IP to 50 search requests per windowMs
  'Too many search requests from this IP, please try again later.'
);

/**
 * Helmet security configuration
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CORS configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins for mobile app testing
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return callback(null, true);
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Define allowed origins for production
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8081',
      'http://192.168.42.165:3000',
      'http://192.168.42.165:8081',
      'https://your-frontend-domain.com',
      'exp://192.168.1.100:8081', // Expo development
      'exp://192.168.42.165:8081', // Your actual IP
    ];
    
    // Add environment-specific origins
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`📥 ${req.method} ${req.originalUrl} - ${req.ip} - ${new Date().toISOString()}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
    console.log(`📤 ${statusColor} ${res.statusCode} ${req.method} ${req.originalUrl} - ${duration}ms`);
  });
  
  next();
};

/**
 * Request size limiter
 */
const requestSizeLimit = '10mb'; // Limit request body size

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove powered by header
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

/**
 * Request validation middleware
 */
const validateRequest = (req, res, next) => {
  // Check for required headers
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.headers['content-type']) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type header is required'
      });
    }
  }
  
  // Validate User-Agent (optional, can help identify legitimate requests)
  if (!req.headers['user-agent']) {
    console.warn(`⚠️  Request without User-Agent from ${req.ip}`);
  }
  
  next();
};

/**
 * IP whitelist middleware (for admin endpoints)
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP address'
      });
    }
    
    next();
  };
};

module.exports = {
  generalLimiter,
  authLimiter,
  phoneRegisterLimiter,
  profileCreationLimiter,
  searchLimiter,
  helmetConfig,
  corsOptions,
  requestLogger,
  requestSizeLimit,
  securityHeaders,
  validateRequest,
  ipWhitelist
};